import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";


function parseBookId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}


function isQuestionType(v: any): v is "MCQ" | "SHORT" {
  return v === "MCQ" || v === "SHORT";
}


/**
 * POST /api/books/:bookId/questions
 * - Only book author or admin may create
 * - Accepts single or bulk in items[]
 * - insert.position currently supports "end" (append to the book)
 */
export async function POST(req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  try {
    const id = parseBookId(bookId);
    if (!id) return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 401 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const book = await db.book.findUnique({ where: { id }, select: { id: true, authorId: true } });
    if (!book) return NextResponse.json({ ok: false, error: "BOOK_NOT_FOUND" }, { status: 404 });

    const adminIds = (process.env.ADMIN_IDS || "").split(",").map(s => Number(s.trim())).filter(Boolean);
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    const isAdmin = adminIds.includes(user.id) || adminEmails.includes((user.email || "").toLowerCase());

    if (user.id !== book.authorId && !isAdmin) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 402 });

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
    }

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
    }

    const items = body.items;
    const insert = body.insert || { position: "end" };

    if (insert.position !== "end" && insert.position !== "start") {
      // only end/start supported for now
      return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
    }

    // validate each item strictly
    for (const it of items) {
      if (typeof it !== "object" || it === null) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
      if (!isQuestionType(it.type)) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
      if (typeof it.question !== "string" || it.question.trim().length === 0) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });

      if (it.type === "MCQ") {
        if (!Array.isArray(it.choices) || it.choices.length === 0) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
        // choices should be objects with id and text
        for (const c of it.choices) {
          if (typeof c !== "object" || c === null || typeof c.id !== "string" || typeof c.text !== "string") return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
        }
      }

      if (typeof it.answer !== "object" || it.answer === null) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
    }

    // Determine starting orderIndex
    const maxOrder = await db.question.aggregate({ _max: { orderIndex: true }, where: { bookId: id } });
    let nextIndex = (typeof maxOrder._max.orderIndex === "number") ? maxOrder._max.orderIndex + 1 : 1;
    if (insert.position === "start") {
      // shift existing orderIndex by +items.length then insert starting at 1
      // We will update all existing questions by incrementing orderIndex
      await db.$transaction([
        db.question.updateMany({ where: { bookId: id }, data: { orderIndex: { increment: items.length } } }),
      ]);
      nextIndex = 1;
    }

    // create items within a transaction & collect results
    const created: Array<{ id: number; orderIndex: number }> = [];

    const txOps: any[] = [];

    // We'll create sequentially in a transaction to guarantee order indices
    const createdRows = [] as any[];

    const transaction = await db.$transaction(async (prisma: any) => {
      for (const it of items) {
        const createdRow = await prisma.question.create({
          data: {
            bookId: id,
            orderIndex: nextIndex,
            type: it.type,
            question: it.question.trim(),
            choices: it.choices ?? null,
            answer: it.answer,
            authorId: user.id,
          },
        });
        createdRows.push(createdRow);
        nextIndex++;
      }

      // update book.questionCount
      await prisma.book.update({ where: { id }, data: { questionCount: { increment: items.length } } });

      return createdRows;
    });

    for (const r of transaction) created.push({ id: r.id, orderIndex: r.orderIndex });

    return NextResponse.json({ ok: true, data: { bookId: id, created, summary: { requested: items.length } } }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    // single failure semantics: if anything failed, return error
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}


/**
 * GET /api/books/:bookId/questions
 * Returns the list of all questions for the book ordered by orderIndex ASC
 */
export async function GET(req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  try {
    const id = parseBookId(bookId);
    if (!id) return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 401 });

    const user = await getCurrentUser();

    const book = await db.book.findUnique({ where: { id }, select: { id: true, visibility: true, authorId: true } });
    if (!book) return NextResponse.json({ ok: false, error: "BOOK_NOT_FOUND" }, { status: 404 });

    // if book private, only author or admin can list
    const skipAuth = process.env.SKIP_AUTH_IN_DEV === "true" && process.env.NODE_ENV === "development";
    if (book.visibility === "PRIVATE" && !skipAuth) {
      const adminIds = (process.env.ADMIN_IDS || "").split(",").map(s => Number(s.trim())).filter(Boolean);
      const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      const isAdmin = user && (adminIds.includes(user.id) || adminEmails.includes((user.email || "").toLowerCase()));

      if (!user || (user.id !== book.authorId && !isAdmin)) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 402 });
    }

    const rows = await db.question.findMany({ where: { bookId: id }, orderBy: { orderIndex: "asc" }, select: { id: true, orderIndex: true, type: true, question: true, choices: true, answer: true, createdAt: true, updatedAt: true, authorId: true } });

    return NextResponse.json({ ok: true, data: { bookId: id, items: rows, count: rows.length } }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

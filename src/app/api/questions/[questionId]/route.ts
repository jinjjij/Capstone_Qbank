import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";


function parseQuestionId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}


function isQuestionType(v: any): v is "MCQ" | "SHORT" {
  return v === "MCQ" || v === "SHORT";
}


// GET /api/questions/:questionId
export async function GET(req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  try {
    const id = parseQuestionId(questionId);
    if (!id) return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 401 });

    const user = await getCurrentUser();

    // include book.authorId so we can check private access
    const question = await db.question.findUnique({
      where: { id },
      include: { book: { select: { id: true, visibility: true, authorId: true } } },
    });

    if (!question) return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 401 });

    // if book is PRIVATE, only book author or admin can see
    if (question.book.visibility === "PRIVATE") {
      if (!user || (user.id !== question.book.authorId && !user.isAdmin)) {
        return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 402 });
      }
    }

    // respond with the question data
    const result = {
      id: question.id,
      bookId: question.bookId,
      orderIndex: question.orderIndex,
      type: question.type,
      question: question.question,
      choices: question.choices,
      answer: question.answer,
      authorId: question.authorId,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };

    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}


// PATCH /api/questions/:questionId
export async function PATCH(req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  try {
    const id = parseQuestionId(questionId);
    if (!id) return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 401 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    // load question + book author to check permissions
    const found = await db.question.findUnique({ where: { id }, select: { id: true, authorId: true, book: { select: { id: true, authorId: true } } } });
    if (!found) return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 401 });

    const ownerId = found.authorId ?? found.book.authorId;
    if (user.id !== ownerId && user.id !== found.book.authorId && !user.isAdmin) {
      // only question author, book author, or admin can edit
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 402 });
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch (_e) {
      return NextResponse.json({ ok: false, error: "INVALID_FIELD" }, { status: 400 });
    }

    if (typeof payload !== "object" || payload === null) return NextResponse.json({ ok: false, error: "INVALID_FIELD" }, { status: 400 });

    // Allowed fields (cannot change bookId, authorId, createdAt, updatedAt)
    const ALLOWED = new Set(["orderIndex", "type", "question", "choices", "answer"]);
    for (const k of Object.keys(payload)) if (!ALLOWED.has(k)) return NextResponse.json({ ok: false, error: "INVALID_FIELD" }, { status: 400 });

    const data: any = {};

    if (payload.orderIndex !== undefined) {
      const v = Number(payload.orderIndex);
      if (!Number.isInteger(v) || v <= 0) return NextResponse.json({ ok: false, error: "INVALID_FIELD" }, { status: 400 });
      data.orderIndex = v;
    }

    if (payload.type !== undefined) {
      if (!isQuestionType(payload.type)) return NextResponse.json({ ok: false, error: "INVALID_FIELD" }, { status: 400 });
      data.type = payload.type;
    }

    if (payload.question !== undefined) {
      if (typeof payload.question !== "string" || payload.question.trim().length === 0) return NextResponse.json({ ok: false, error: "INVALID_FIELD" }, { status: 400 });
      data.question = payload.question.trim();
    }

    if (payload.choices !== undefined) {
      // allow null or JSON-able array/object
      if (payload.choices !== null && typeof payload.choices !== "object") return NextResponse.json({ ok: false, error: "INVALID_FIELD" }, { status: 400 });
      data.choices = payload.choices;
    }

    if (payload.answer !== undefined) {
      if (typeof payload.answer !== "object" && typeof payload.answer !== "string" && payload.answer !== null) return NextResponse.json({ ok: false, error: "INVALID_FIELD" }, { status: 400 });
      data.answer = payload.answer as any;
    }

    if (Object.keys(data).length === 0) {
      // nothing to update — return current
      const current = await db.question.findUnique({ where: { id } });
      return NextResponse.json({ ok: true, data: current }, { status: 200 });
    }

    // attempt update — note: unique constraint on (bookId, orderIndex) can cause DB error
    const updated = await db.question.update({ where: { id }, data });

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}


// DELETE /api/questions/:questionId
export async function DELETE(req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  try {
    const id = parseQuestionId(questionId);
    if (!id) return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 401 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    // fetch question + book
    const found = await db.question.findUnique({ where: { id }, select: { id: true, authorId: true, book: { select: { id: true, authorId: true } } } });
    if (!found) return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 401 });

    // deletion allowed when user is question author, book author, or admin
    const allowed = user.id === found.authorId || user.id === found.book.authorId || user.isAdmin;
    if (!allowed) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 402 });

    // delete
    await db.question.delete({ where: { id } });

    return NextResponse.json({ ok: true, data: { deletedId: id } }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";


function parseBookId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}


export async function POST(req: Request, { params }: { params: { bookId: string } }) {
  try {
    const id = parseBookId(params.bookId);
    if (!id) return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 401 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const book = await db.book.findUnique({ where: { id }, select: { id: true } });
    if (!book) return NextResponse.json({ ok: false, error: "BOOK_NOT_FOUND" }, { status: 404 });

    // check existing
    const existing = await db.userLibrary.findUnique({ where: { userId_bookId: { userId: user.id, bookId: id } } }).catch(() => null);
    if (existing) {
      return NextResponse.json({ ok: true, data: { bookId: id, created: false } }, { status: 200 });
    }

    // create link and update user's libraryCount
    await db.$transaction([db.userLibrary.create({ data: { userId: user.id, bookId: id } }), db.user.update({ where: { id: user.id }, data: { libraryCount: { increment: 1 } } })]);

    return NextResponse.json({ ok: true, data: { bookId: id, created: true } }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}


export async function DELETE(req: Request, { params }: { params: { bookId: string } }) {
  try {
    const id = parseBookId(params.bookId);
    if (!id) return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 401 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const existing = await db.userLibrary.findUnique({ where: { userId_bookId: { userId: user.id, bookId: id } } }).catch(() => null);
    if (!existing) return NextResponse.json({ ok: false, error: "BOOK_NOT_FOUND" }, { status: 404 });

    await db.$transaction([db.userLibrary.delete({ where: { userId_bookId: { userId: user.id, bookId: id } } }), db.user.update({ where: { id: user.id }, data: { libraryCount: { decrement: 1 } } })]);

    return NextResponse.json({ ok: true, data: { bookId: id, removed: true } }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

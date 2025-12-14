import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const id = parseInt(bookId);

    if (!id || isNaN(id)) {
      return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 문제집이 존재하는지 확인
    const book = await db.book.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!book) {
      return NextResponse.json({ ok: false, error: "BOOK_NOT_FOUND" }, { status: 404 });
    }

    // upsert로 접근 시간 업데이트 (이미 있으면 lastAccessedAt 갱신, 없으면 생성)
    await db.userBookActivity.upsert({
      where: {
        userId_bookId: {
          userId: user.id,
          bookId: id,
        },
      },
      update: {
        lastAccessedAt: new Date(),
      },
      create: {
        userId: user.id,
        bookId: id,
        lastAccessedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

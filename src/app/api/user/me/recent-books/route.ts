import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam), 1), 50) : 20;

    // 최근 접근한 문제집 가져오기 (lastAccessedAt 기준 내림차순)
    const activities = await db.userBookActivity.findMany({
      where: { userId: user.id },
      orderBy: { lastAccessedAt: "desc" },
      take: limit,
      include: {
        book: {
          select: {
            id: true,
            bookCode: true,
            title: true,
            description: true,
            visibility: true,
            authorId: true,
            questionCount: true,
            ratingAvg: true,
            ratingCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const items = activities.map((activity) => ({
      ...activity.book,
      lastAccessedAt: activity.lastAccessedAt,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        items,
        count: items.length,
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

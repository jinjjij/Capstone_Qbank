export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentUser, clearSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";


// 모든 세션 로그아웃: 현재 유저의 모든 세션 삭제 + 세션 쿠키 제거
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  // DB에서 해당 유저의 모든 세션 삭제
  await db.session.deleteMany({ where: { userId: user.id } });

  // 쿠키 정리
  await clearSessionCookie();

  return new NextResponse(null, { status: 204 });
}

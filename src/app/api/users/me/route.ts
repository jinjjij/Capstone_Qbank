export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentUser, deleteSessionByCookieToken, clearSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";


// 현재 유저 반환
export async function GET() {
    const user = await getCurrentUser();

    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    
  return NextResponse.json({ id: user.id, email: user.email, isAdmin: user.isAdmin }, { status: 200 });
}


// 회원 탈퇴
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  // 세션 정리
  await deleteSessionByCookieToken().catch(() => {});
  await clearSessionCookie();

  // 유저 삭제 (세션은 onDelete: Cascade로 자동 삭제)
  await db.user.delete({ where: { id: user.id } });

  return new NextResponse(null, { status: 204 });
}

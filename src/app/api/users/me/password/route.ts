export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ChangePasswordSchema } from "@/lib/validation";


// 비밀번호 변경
export async function PATCH(req: Request) {
  const me = await getCurrentUser();
  if (!me){
    console.log("api/users/me/password error! : 인증 필요");
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  let currentPassword = "", newPassword = "";
  try {
    const body = await req.json();
    const parsed = ChangePasswordSchema.parse(body);
    currentPassword = parsed.currentPassword;
    newPassword = parsed.newPassword;
  } catch {
    console.log("api/users/me/password error! : 잘못된 입력");
    return NextResponse.json({ error: "잘못된 입력" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: me.id } });
  if (!user) {
    console.log("api/users/me/password error! : 유저 없음");
    return NextResponse.json({ error: "유저 없음" }, { status: 404 });
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok){
    console.log("api/users/me/password error! : 현재 비밀번호 불일치.");
    return NextResponse.json({ error: "현재 비밀번호 불일치" }, { status: 400 });
  } 

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.user.update({ where: { id: me.id }, data: { passwordHash: newHash } });

  console.log("api/users/me/password : 패스워드 변경됨.");
  console.log("유저 : " + user.email);
  console.log(currentPassword.toString() + " -> " + newPassword.toString());
  return NextResponse.json({ ok: true }, { status: 200 });
}


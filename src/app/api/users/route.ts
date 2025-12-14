export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { SignUpSchema } from "@/lib/validation";


// 회원가입
export async function POST(req: Request) {
  let email = "", password = "", isAdmin = false;
  try {
    const body = await req.json();
    const parsed = SignUpSchema.parse(body);
    email = parsed.email;
    password = parsed.password;
    isAdmin = body.isAdmin === true; // 선택적 필드
  } catch {
    return NextResponse.json({ error: "잘못된 입력" }, { status: 400 });
  }

  // 중복 이메일 체크
  const dup = await db.user.findUnique({ where: { email } });
  if (dup) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { email, passwordHash, isAdmin },
    select: { id: true, email: true, isAdmin: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
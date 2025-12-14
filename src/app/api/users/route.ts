export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { SignUpSchema } from "@/lib/validation";


// 회원가입
export async function POST(req: Request) {
  let email = "", password = "";
  let adminPassword: string | null = null;
  try {
    const body = await req.json();
    const parsed = SignUpSchema.parse(body);
    email = parsed.email;
    password = parsed.password;

    if (typeof (body as any).adminPassword === "string") {
      adminPassword = (body as any).adminPassword;
    }
  } catch {
    return NextResponse.json({ error: "잘못된 입력" }, { status: 400 });
  }

  // Admin signup via env vars
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isAdminEmail = adminEmails.includes(email.toLowerCase());

  let isAdmin = false;
  if (isAdminEmail) {
    const adminPw = process.env.ADMIN_PW || "";
    if (!adminPw) {
      // misconfigured deployment: reserved admin emails but no admin password
      return NextResponse.json({ error: "ADMIN_SIGNUP_DISABLED" }, { status: 500 });
    }
    if (!adminPassword || adminPassword !== adminPw) {
      return NextResponse.json({ error: "ADMIN_PASSWORD_REQUIRED" }, { status: 403 });
    }
    isAdmin = true;
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
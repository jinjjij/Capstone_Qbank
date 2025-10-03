import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";


export const COOKIE_NAME = "session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7일
export const COOKIE_SECURE = false;


function hashToken(token: string){
    return createHash("sha256").update(token).digest("base64url");
}


export async function verifyLogin(email: string, password: string) {
    const user = await db.user.findUnique({where : {email}});
    if(!user)   return null;    // 해당 이메일의 유저가 없음.
    
    const ok = await bcrypt.compare(password, user.passwordHash);
    if(!ok)     return null;    // 비밀번호가 다름.

    return user;
}


export function makeSessionToken(){
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    return { token, tokenHash, expiresAt }
}


// 세션 테이블에 세션을 추가합니다.
export async function createSession(userId : number){
    const { token, tokenHash, expiresAt } = makeSessionToken();
    await db.session.create({
        data : { userId, sessionToken: tokenHash, expiresAt}
    });

    return { token, expiresAt };
}


export async function setSessionCookie(token: string, expiresAt: Date){
    const jar = await cookies();

    await jar.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure : COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
        expires : expiresAt
    });
}


export async function getCurrentUser(){
    const jar = await cookies();

    // 현재 유저가 없으면(쿠키에) 널반환
    const token = await jar.get(COOKIE_NAME)?.value;
    if(!token) {
        console.log("no cookie")
        return null;
    }

    const tokenHash = hashToken(token);
    console.log("post - db");
    const session = await db.session.findUnique({
        where: {sessionToken: tokenHash},
        include: {user: true}
    });
    if(!session)    return null;
    console.log("after - db");

    // 세션 만료 처리
    if(session.expiresAt < new Date()){
        await db.session.delete({where: {id : session.id}}).catch(() => {});
        return null;
    }

    return session.user;
}


// logout 관련 함수들

export async function clearSessionCookie(){
    const jar = await cookies();
    await jar.set(COOKIE_NAME, "", {path: "/", expires: new Date(0)});
}



export async function deleteSessionByCookieToken(){
    const jar = await cookies();
    const token = await jar.get(COOKIE_NAME)?.value;
    if(!token) return;

    const tokenHash = hashToken(token);
    await db.session.delete({where: {sessionToken: tokenHash}}).catch(() => {});
}


export async function logout(){
    await deleteSessionByCookieToken();
    clearSessionCookie();
}
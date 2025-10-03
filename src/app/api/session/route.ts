export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { verifyLogin, createSession, setSessionCookie, logout } from "@/lib/auth";

// 로그인
export async function POST(req: Request){

    // req로부터 입력 추출
    let email = "", password = "";
    try{
        const body = await req.json();
        email = (body?.email || "").trim().toLowerCase();
        password = body?.password || "";
    } 
    catch{
        return NextResponse.json({error: "잘못된 요청"}, {status: 400});
    }

    if(!email || !password){
        return NextResponse.json({error: "이메일/비밀번호 필요"}, {status : 400});
    }


    // 유저 검증
    const user = await verifyLogin(email, password);
    if(!user){
        return NextResponse.json({error: "이메일 또는 비밀번호가 올바르지 않습니다."}, {status : 401});
    }


    // 성공시 세션 생성 + 쿠키
    const {token, expiresAt} = await createSession(user.id);
    await setSessionCookie(token, expiresAt);
    
    return NextResponse.json({ok : true}, {status : 200});
}



// 로그아웃
export async function DELETE() {
    await logout();
    
    return new NextResponse(null, {status : 204});
}
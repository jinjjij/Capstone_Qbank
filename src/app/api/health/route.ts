export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";


// api 상태 체크
export async function GET() {
    try{
        await db.$queryRaw`SELECT 1`;
        console.log("api/health : 서버 정상작동중.")
        return NextResponse.json({ok: true});
    } 
    catch (e){
        return NextResponse.json({ok: false, error: String(e)}, {status : 500});
    }
}
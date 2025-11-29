import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";


function parseBookId(raw: string): number | null {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}


// 문제집 조회
export async function GET(
    req : Request,
    { params } : {params : {bookId : string}}
){
    try{
        const id = parseBookId(params.bookId);
        if(!id){
            return NextResponse.json(
                { ok : false, error : "INVAID_ID" },
                { status : 401 }
            );
        }

        const {searchParams} = new URL(req.url);
        const includeOptions = (searchParams.get("includeOptions") == null) ? false : true;
        const includeQuestions = (searchParams.get("includeQuestions") == null) ? false : true;


        const user = await getCurrentUser();


        const book = await db.book.findUnique({
            where: { id },
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
        });

        // 에러 : ID 존재하지 않음.
        if(!book){
            return NextResponse.json(
                { ok: false, error: "INVALID_ID" },
                { status: 401 }
            );
        }

        // 유저 접근권한 체크
        if(book.visibility == "PRIVATE"){
            if(!user || user.id != book.authorId){
                return NextResponse.json(
                    { ok: false, error: "FORBIDDEN" },
                    { status: 402 }
                );
            }
        }
    }
    catch(e){

    }

}


// 문제집 수정
export async function PATCH(){

}


// 문제집 삭제
export async function DELETE(){

}
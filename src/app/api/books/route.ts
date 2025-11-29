import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { isString, isOptionalString, isVisibility, Visibility } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";
import { nanoid } from "nanoid";


interface CreateBook{
    title : string;
    description? : string;
    visibility? : "PUBLIC" | "PRIVATE" ;
}


function _ValidateBookScheme(payload: any): asserts payload is CreateBook {

    if (typeof payload !== "object" || payload === null) {
        throw { status: 400, message: "body must be object" };
    }

    if (!isString(payload.title) || payload.title.trim().length === 0) {
        throw { status: 400, message: "title is required" };
    }

    if (!isOptionalString(payload.description)) {
        throw { status: 400, message: "description must be string | null" };
    }

    if (
        payload.visibility !== undefined &&
        !isVisibility(payload.visibility)
    ) {
        throw { status: 400, message: "visibility must be PUBLIC or PRIVATE" };
    }
}


/*
    api/books POST
    문제집 생성.
*/
export async function POST(req : Request){
    
    let body;
    
    try {
        body = await req.json();
        _ValidateBookScheme(body);
    } catch(err: any) {
        console.log("body parsing error!!");
        return NextResponse.json(
            { error: err?.message ?? "Invalid request body"},
            { status: err?.status ?? 400 }
        );
    }


    // body arguments
    const {
        title,
        description,
        visibility,
    } = body;

    // user id
    const user = await getCurrentUser();

    // validate User
    if (!user) {
        console.log("Unauthorized or Non-Existing Error");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authorId = user.id;

    // bookcode 
    let bookCode

    while(true){
        bookCode = nanoid(10);
        const exists = await db.book.findUnique({
            where: {bookCode: bookCode}
        });

        if(!exists){
            break;
        }
    }


    try{
        const newBook = await db.book.create({
            data : {
                authorId,
                title, 
                description, 
                bookCode, 
                visibility: visibility ?? "PRIVATE",
            },
            select : {authorId: true, bookCode: true}
        });

        return NextResponse.json({newBook}, {status : 201});
    }
    catch(err : any){
        console.error("Unexpected DB error", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
    


/*
    api/books GET
    문제집 검색 
*/
export async function GET(){

}
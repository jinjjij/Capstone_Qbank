import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isVisibility } from "@/lib/validation";
import { Prisma } from "@prisma/client";


function parseBookId(raw: string): number | null {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}


// 문제집 조회
export async function GET(
    req : Request,
    { params } : {params : Promise<{bookId : string}>}
){
    const { bookId } = await params;
    try{
        const id = parseBookId(bookId);
        if(!id){
            return NextResponse.json(
                { ok : false, error : "INVAID_ID" },
                { status : 401 }
            );
        }

        const { searchParams } = new URL(req.url);


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

        // 유저 접근권한 체크 (admin은 모든 문제집 조회 가능)
        const skipAuth = process.env.SKIP_AUTH_IN_DEV === "true" && process.env.NODE_ENV === "development";
        if (book.visibility == "PRIVATE" && !skipAuth) {
            if (!user || (user.id != book.authorId && !user.isAdmin)) {
                return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 402 });
            }
        }

        // parse include flags (default true as requested)
        const includeQuestions = (() => {
            const v = searchParams.get("includeQuestions");
            if (v === null) return true; // default true
            return v !== "false"; // present and not "false" => true
        })();

        const includeReviews = (() => {
            const v = searchParams.get("includeReviews");
            if (v === null) return true; // default true
            return v !== "false";
        })();

        // build DB query with optional includes
        const bookQuery = await db.book.findUnique({
            where: { id },
            select: {
                id: true,
                bookCode: true,
                title: true,
                description: true,
                visibility: true,
                authorId: true,
                author: { select: { email: true } },
                questionCount: true,
                ratingAvg: true,
                ratingCount: true,
                createdAt: true,
                updatedAt: true,
                questions: includeQuestions
                    ? {
                          orderBy: { orderIndex: "asc" },
                          select: {
                              id: true,
                              orderIndex: true,
                              type: true,
                              question: true,
                              choices: true,
                              answer: true,
                              createdAt: true,
                              updatedAt: true,
                          },
                      }
                    : false,
                reviews: includeReviews
                    ? {
                          orderBy: { createdAt: "desc" },
                          select: {
                              id: true,
                              userId: true,
                              rating: true,
                              comment: true,
                              createdAt: true,
                              updatedAt: true,
                          },
                      }
                    : false,
            },
        });

        if (!bookQuery) {
            return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 401 });
        }

        // isActive: helper derived flag (true if visible to public)
        const isActive = bookQuery.visibility === "PUBLIC";

        const responseBook = {
            id: bookQuery.id,
            bookCode: bookQuery.bookCode,
            title: bookQuery.title,
            description: bookQuery.description,
            visibility: bookQuery.visibility,
            authorId: bookQuery.authorId,
            authorEmail: bookQuery.author?.email ?? null,
            questionCount: bookQuery.questionCount,
            ratingAvg: bookQuery.ratingAvg,
            ratingCount: bookQuery.ratingCount,
            isActive,
            createdAt: bookQuery.createdAt,
            updatedAt: bookQuery.updatedAt,
            ...(includeQuestions ? { questions: bookQuery.questions ?? [] } : {}),
            ...(includeReviews ? { reviews: bookQuery.reviews ?? [] } : {}),
        };

        return NextResponse.json({ ok: true, data: responseBook }, { status: 200 });
    }
    catch(e){
        console.error(e);
        return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
    }

}


// 문제집 수정
export async function PATCH(req: Request, { params }: { params: Promise<{ bookId: string }> }){
    const { bookId } = await params;
    try{
        const id = parseBookId(bookId);
        if(!id){
            return NextResponse.json({ ok:false, error: "INVALID_ID" }, { status: 401 });
        }

        const user = await getCurrentUser();
        if(!user){
            return NextResponse.json({ ok:false, error: "UNAUTHORIZED" }, { status: 401 });
        }

        const existing = await db.book.findUnique({ where: { id }, select: { id: true, authorId: true } });
        if(!existing){
            return NextResponse.json({ ok:false, error: "INVALID_ID" }, { status: 401 });
        }

        if(existing.authorId !== user.id && !user.isAdmin){
            return NextResponse.json({ ok:false, error: "FORBIDDEN" }, { status: 402 });
        }

        // parse body
        let payload: unknown;
        try{
            payload = await req.json();
        } catch(_){
            return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
        }

        if(typeof payload !== "object" || payload === null){
            return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
        }

        const record = payload as Record<string, unknown>;

        // Allowed fields
        const ALLOWED = new Set(["title","description","visibility","isActive"]);

        for(const k of Object.keys(record)){
            if(!ALLOWED.has(k)){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
        }

        const data: Prisma.BookUpdateInput = {};

        // validate fields
        if(record.title !== undefined){
            if(typeof record.title !== "string" || record.title.trim().length === 0){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
            data.title = record.title.trim();
        }

        if(record.description !== undefined){
            if(record.description !== null && typeof record.description !== "string"){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
            data.description = record.description as string | null;
        }

        // visibility / isActive
        if(record.visibility !== undefined && record.isActive !== undefined){
            // both provided — ensure consistency
            if(!isVisibility(record.visibility) || typeof record.isActive !== "boolean"){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
            const visFromActive = record.isActive ? "PUBLIC" : "PRIVATE";
            if(visFromActive !== record.visibility){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
            data.visibility = record.visibility;
        } else if(record.visibility !== undefined){
            if(!isVisibility(record.visibility)){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
            data.visibility = record.visibility;
        } else if(record.isActive !== undefined){
            if(typeof record.isActive !== "boolean"){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
            data.visibility = record.isActive ? "PUBLIC" : "PRIVATE";
        }

        if(Object.keys(data).length === 0){
            // nothing to change, return current
            const current = await db.book.findUnique({ where: { id }, select: { id: true, bookCode: true, title: true, description: true, visibility: true, questionCount: true, ratingAvg: true, ratingCount: true, createdAt: true, updatedAt: true } });
            return NextResponse.json({ ok: true, data: { ...current, isActive: current?.visibility === "PUBLIC" } }, { status: 200 });
        }

        const updated = await db.book.update({ where: { id }, data, select: { id: true, bookCode: true, title: true, description: true, visibility: true, questionCount: true, ratingAvg: true, ratingCount: true, createdAt: true, updatedAt: true } });

        const result = { ...updated, isActive: updated.visibility === "PUBLIC" };

        return NextResponse.json({ ok: true, data: result }, { status: 200 });

    } catch(err){
        console.error(err);
        return NextResponse.json({ ok:false, error: "INTERNAL_ERROR" }, { status: 500 });
    }
}


// 문제집 삭제
export async function DELETE(req: Request, { params }: { params: Promise<{ bookId: string }> }){
    const { bookId } = await params;
    try{
        const id = parseBookId(bookId);
        if(!id){
            return NextResponse.json({ ok:false, error: "INVALID_ID" }, { status: 401 });
        }

        const user = await getCurrentUser();
        if(!user){
            return NextResponse.json({ ok:false, error: "UNAUTHORIZED" }, { status: 401 });
        }

        const book = await db.book.findUnique({ where: { id }, select: { id: true, authorId: true } });
        if(!book){
            return NextResponse.json({ ok:false, error: "INVALID_ID" }, { status: 401 });
        }

        // admin can delete any book
        if(user.id !== book.authorId && !user.isAdmin){
            return NextResponse.json({ ok:false, error: "FORBIDDEN" }, { status: 402 });
        }

        // gather counts so we can report how many rows are removed
        const [questionsCount, reviewsCount, libraryLinksCount] = await Promise.all([
            db.question.count({ where: { bookId: id } }),
            db.bookReview.count({ where: { bookId: id } }),
            db.userLibrary.count({ where: { bookId: id } }),
        ]);

        // delete in a transaction so either all or none are removed
        await db.$transaction([
            db.question.deleteMany({ where: { bookId: id } }),
            db.bookReview.deleteMany({ where: { bookId: id } }),
            db.userLibrary.deleteMany({ where: { bookId: id } }),
            db.book.delete({ where: { id } }),
        ]);

        return NextResponse.json({ ok: true, data: { deletedId: id, cascade: { questions: questionsCount, reviews: reviewsCount, libraryLinks: libraryLinksCount } } }, { status: 200 });

    } catch(err){
        console.error(err);
        return NextResponse.json({ ok:false, error: "INTERNAL_ERROR" }, { status: 500 });
    }
}
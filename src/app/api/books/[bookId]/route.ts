import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isVisibility } from "@/lib/validation";


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

        // 유저 접근권한 체크
        if (book.visibility == "PRIVATE") {
            if (!user || user.id != book.authorId) {
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

        const responseBook: any = {
            id: bookQuery.id,
            bookCode: bookQuery.bookCode,
            title: bookQuery.title,
            description: bookQuery.description,
            visibility: bookQuery.visibility,
            questionCount: bookQuery.questionCount,
            ratingAvg: bookQuery.ratingAvg,
            ratingCount: bookQuery.ratingCount,
            isActive,
            createdAt: bookQuery.createdAt,
            updatedAt: bookQuery.updatedAt,
        };

        if (includeQuestions) responseBook.questions = bookQuery.questions ?? [];
        if (includeReviews) responseBook.reviews = bookQuery.reviews ?? [];

        return NextResponse.json({ ok: true, data: responseBook }, { status: 200 });
    }
    catch(e){
        console.error(e);
        return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
    }

}


// 문제집 수정
export async function PATCH(req: Request, { params }: { params: { bookId: string } }){
    try{
        const id = parseBookId(params.bookId);
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

        if(existing.authorId !== user.id){
            return NextResponse.json({ ok:false, error: "FORBIDDEN" }, { status: 402 });
        }

        // parse body
        let payload: any;
        try{
            payload = await req.json();
        } catch(_){
            return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
        }

        if(typeof payload !== "object" || payload === null){
            return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
        }

        // Allowed fields
        const ALLOWED = new Set(["title","description","visibility","isActive"]);

        for(const k of Object.keys(payload)){
            if(!ALLOWED.has(k)){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
        }

        const data: any = {};

        // validate fields
        if(payload.title !== undefined){
            if(typeof payload.title !== "string" || payload.title.trim().length === 0){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
            data.title = payload.title.trim();
        }

        if(payload.description !== undefined){
            if(payload.description !== null && typeof payload.description !== "string"){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
            data.description = payload.description;
        }

        // visibility / isActive
        if(payload.visibility !== undefined && payload.isActive !== undefined){
            // both provided — ensure consistency
            if(!isVisibility(payload.visibility) || typeof payload.isActive !== "boolean"){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
            const visFromActive = payload.isActive ? "PUBLIC" : "PRIVATE";
            if(visFromActive !== payload.visibility){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
            data.visibility = payload.visibility;
        } else if(payload.visibility !== undefined){
            if(!isVisibility(payload.visibility)){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
            data.visibility = payload.visibility;
        } else if(payload.isActive !== undefined){
            if(typeof payload.isActive !== "boolean"){
                return NextResponse.json({ ok:false, error: "INVALID_FIELD" }, { status: 400 });
            }
            data.visibility = payload.isActive ? "PUBLIC" : "PRIVATE";
        }

        if(Object.keys(data).length === 0){
            // nothing to change, return current
            const current = await db.book.findUnique({ where: { id }, select: { id: true, bookCode: true, title: true, description: true, visibility: true, questionCount: true, ratingAvg: true, ratingCount: true, createdAt: true, updatedAt: true } });
            return NextResponse.json({ ok: true, data: { ...current, isActive: current?.visibility === "PUBLIC" } }, { status: 200 });
        }

        const updated = await db.book.update({ where: { id }, data, select: { id: true, bookCode: true, title: true, description: true, visibility: true, questionCount: true, ratingAvg: true, ratingCount: true, createdAt: true, updatedAt: true } });

        const result = { ...updated, isActive: updated.visibility === "PUBLIC" };

        return NextResponse.json({ ok: true, data: result }, { status: 200 });

    } catch(err: any){
        console.error(err);
        return NextResponse.json({ ok:false, error: "INTERNAL_ERROR" }, { status: 500 });
    }
}


// 문제집 삭제
export async function DELETE(req: Request, { params }: { params: { bookId: string } }){
    try{
        const id = parseBookId(params.bookId);
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

        // admin support via env vars (comma-separated ids or emails). If not configured, only author may delete.
        const adminIds = (process.env.ADMIN_IDS || "").split(",").map(s => Number(s.trim())).filter(Boolean);
        const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
        const isAdmin = adminIds.includes(user.id) || adminEmails.includes((user.email || "").toLowerCase());

        if(user.id !== book.authorId && !isAdmin){
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

    } catch(err: any){
        console.error(err);
        return NextResponse.json({ ok:false, error: "INTERNAL_ERROR" }, { status: 500 });
    }
}
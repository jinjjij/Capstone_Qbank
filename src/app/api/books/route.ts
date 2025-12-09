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
export async function GET(req: Request){
    try{
        const url = new URL(req.url);
        const sp = url.searchParams;

        const q = (sp.get("q") || "").trim();
        const limitRaw = sp.get("limit") ?? "20";
        const cursor = sp.get("cursor");
        const sort = sp.get("sort") ?? "title";
        const order = (sp.get("order") ?? "desc").toLowerCase();

        // validate limit
        const limit = Number(limitRaw);
        if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
            return NextResponse.json({ ok: false, error: "INVALID_QUERY" }, { status: 400 });
        }

        const allowedSort = ["updatedAt", "rating", "title", "questionCount"];
        if (!allowedSort.includes(sort)) {
            return NextResponse.json({ ok: false, error: "INVALID_QUERY" }, { status: 400 });
        }

        if (order !== "asc" && order !== "desc") {
            return NextResponse.json({ ok: false, error: "INVALID_QUERY" }, { status: 400 });
        }

        // map sort -> db field
        let sortField: string;
        switch (sort) {
            case "rating":
                sortField = "ratingAvg";
                break;
            default:
                sortField = sort;
        }

        // visibility handling: public or owned private
        const user = await getCurrentUser();
        const visibilityFilter: any = user
            ? { OR: [{ visibility: "PUBLIC" }, { authorId: user.id }] }
            : { visibility: "PUBLIC" };

        // function to build cursor where clause
        function buildCursorWhere(parsedCursor: any, orderDir: string) {
            if (!parsedCursor || parsedCursor.id === undefined) return undefined;

            const value = parsedCursor.value;
            // for dates, convert
            let cmpVal: any = value;
            if (sortField === "updatedAt") cmpVal = new Date(value);
            else if (sortField === "questionCount" || sortField === "ratingAvg") cmpVal = Number(value);

            // descending -> take items with field < cmpVal OR equal and id < cursorId
            if (orderDir === "desc") {
                return {
                    OR: [
                        { [sortField]: { lt: cmpVal } },
                        { AND: [{ [sortField]: { equals: cmpVal } }, { id: { lt: parsedCursor.id } }] },
                    ],
                };
            }

            // asc
            return {
                OR: [
                    { [sortField]: { gt: cmpVal } },
                    { AND: [{ [sortField]: { equals: cmpVal } }, { id: { gt: parsedCursor.id } }] },
                ],
            };
        }

        // determine matchType & base where
        let matchType: "code" | "text" | "none" = "none";
        let baseWhere: any = visibilityFilter;
        let where: any = baseWhere;

        if (q) {
            // try code exact match first
            const codeMatch = await db.book.findFirst({
                where: {
                    AND: [visibilityFilter, { bookCode: { equals: q } }],
                },
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

            if (codeMatch) {
                matchType = "code";

                return NextResponse.json({ ok: true, data: { matchType, items: [codeMatch], pageInfo: { limit, hasNext: false, nextCursor: null }, summary: { count: 1, total: 1 } } }, { status: 200 });
            }

            // else text search
            matchType = "text";
            where = {
                AND: [
                    visibilityFilter,
                    {
                        OR: [
                            { title: { contains: q, mode: "insensitive" } },
                            { description: { contains: q, mode: "insensitive" } },
                            { bookCode: { contains: q, mode: "insensitive" } },
                        ],
                    },
                ],
            };
        }

        // apply cursor if present (to the pagination query only)
        if (cursor) {
            try {
                const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
                const cursorWhere = buildCursorWhere(decoded, order);
                if (cursorWhere) {
                    where = { AND: [where, cursorWhere] };
                }
            } catch (e) {
                return NextResponse.json({ ok: false, error: "INVALID_QUERY" }, { status: 400 });
            }
        }

        // orderBy
        const orderBy: any[] = [{ [sortField]: order }, { id: order }];

        // fetch limit + 1
        const pageSize = limit;

        const rows = await db.book.findMany({
            where,
            orderBy,
            take: pageSize + 1,
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

        const hasNext = rows.length > pageSize;
        const items = hasNext ? rows.slice(0, pageSize) : rows;

        if (!items.length) {
            return NextResponse.json({ ok: false, error: "BOOK_NOT_FOUND" }, { status: 404 });
        }

        // build next cursor
        let nextCursor: string | null = null;
        if (hasNext) {
            const last = items[items.length - 1];
            const cursorVal: any = last[sortField as keyof typeof last];
            const cursorObj = { value: cursorVal instanceof Date ? cursorVal.toISOString() : cursorVal, id: last.id };
            nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString("base64");
        }

        const total = await db.book.count({ where: baseWhere });

        const result = {
            ok: true,
            data: {
                matchType,
                items,
                pageInfo: { limit: pageSize, hasNext, nextCursor },
                summary: { count: items.length, total },
            },
        };

        return NextResponse.json(result, { status: 200 });

    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
    }
}
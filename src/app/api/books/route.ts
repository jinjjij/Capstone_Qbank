import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isOptionalString, isString, isVisibility } from "@/lib/validation";
import { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";

interface CreateBook {
    title: string;
    description?: string | null;
    visibility?: "PUBLIC" | "PRIVATE";
}

function validateCreateBook(payload: unknown): asserts payload is CreateBook {
    if (typeof payload !== "object" || payload === null) {
        throw { status: 400, message: "body must be object" };
    }

    const record = payload as Record<string, unknown>;

    if (!isString(record.title) || record.title.trim().length === 0) {
        throw { status: 400, message: "title is required" };
    }

    if (!isOptionalString(record.description)) {
        throw { status: 400, message: "description must be string | null" };
    }

    if (record.visibility !== undefined && !isVisibility(record.visibility)) {
        throw { status: 400, message: "visibility must be PUBLIC or PRIVATE" };
    }
}

function getErrorMessage(err: unknown, fallback: string) {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === "object" && err !== null && "message" in err) {
        const m = (err as { message?: unknown }).message;
        if (typeof m === "string" && m) return m;
    }
    return fallback;
}

function getErrorStatus(err: unknown, fallback: number) {
    if (typeof err === "object" && err !== null && "status" in err) {
        const s = (err as { status?: unknown }).status;
        if (typeof s === "number" && Number.isInteger(s) && s >= 100 && s <= 599) return s;
    }
    return fallback;
}

function parseCursor(raw: string): { id: number; value: unknown } | null {
    try {
        const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as unknown;
        if (typeof decoded !== "object" || decoded === null) return null;
        const obj = decoded as Record<string, unknown>;
        const id = typeof obj.id === "number" ? obj.id : Number(obj.id);
        if (!Number.isInteger(id)) return null;
        return { id, value: obj.value };
    } catch {
        return null;
    }
}

/*
    POST /api/books
    문제집 생성.
*/
export async function POST(req: Request) {
    let body: unknown;

    try {
        body = await req.json();
        validateCreateBook(body);
    } catch (err) {
        console.log("body parsing error!!");
        return NextResponse.json(
            { error: getErrorMessage(err, "Invalid request body") },
            { status: getErrorStatus(err, 400) }
        );
    }

    const { title, description, visibility } = body as CreateBook;

    const user = await getCurrentUser();
    if (!user) {
        console.log("Unauthorized or Non-Existing Error");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorId = user.id;

    // bookcode
    let bookCode: string;

    while (true) {
        bookCode = nanoid(10);
        const exists = await db.book.findUnique({ where: { bookCode } });
        if (!exists) break;
    }

    try {
        // 문제집 생성 및 라이브러리에 자동 추가 (트랜잭션)
        const result = await db.$transaction(async (tx) => {
            const newBook = await tx.book.create({
                data: {
                    authorId,
                    title: title.trim(),
                    description: description ?? null,
                    bookCode,
                    visibility: visibility ?? "PRIVATE",
                },
                select: { id: true, authorId: true, bookCode: true, title: true },
            });

            await tx.userLibrary.create({
                data: {
                    userId: authorId,
                    bookId: newBook.id,
                },
            });

            return newBook;
        });

        return NextResponse.json({ newBook: result }, { status: 201 });
    } catch (err) {
        console.error("Unexpected DB error", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/*
    GET /api/books
    문제집 검색
*/
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const sp = url.searchParams;

        const q = (sp.get("q") || "").trim();
        const limitRaw = sp.get("limit") ?? "20";
        const cursor = sp.get("cursor");
        const sort = sp.get("sort") ?? "title";
        const order = (sp.get("order") ?? "desc").toLowerCase();

        const limit = Number(limitRaw);
        if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
            return NextResponse.json({ ok: false, error: "INVALID_QUERY" }, { status: 400 });
        }

        const allowedSort = ["updatedAt", "rating", "title", "questionCount"] as const;
        if (!allowedSort.includes(sort as (typeof allowedSort)[number])) {
            return NextResponse.json({ ok: false, error: "INVALID_QUERY" }, { status: 400 });
        }

        if (order !== "asc" && order !== "desc") {
            return NextResponse.json({ ok: false, error: "INVALID_QUERY" }, { status: 400 });
        }
        const orderDir = order as Prisma.SortOrder;

        const sortField = sort === "rating" ? "ratingAvg" : sort;

        // visibility handling: admin can see all, others see public or owned private
        const user = await getCurrentUser();
        const visibilityFilter: Prisma.BookWhereInput = user?.isAdmin
            ? {}
            : user
                ? { OR: [{ visibility: "PUBLIC" }, { authorId: user.id }] }
                : { visibility: "PUBLIC" };

        function buildCursorWhere(parsed: { id: number; value: unknown }): Prisma.BookWhereInput | undefined {
            let cmpVal: Date | number | string;
            if (sortField === "updatedAt") cmpVal = new Date(String(parsed.value));
            else if (sortField === "questionCount" || sortField === "ratingAvg") cmpVal = Number(parsed.value);
            else cmpVal = String(parsed.value);

            if (orderDir === "desc") {
                return {
                    OR: [
                        { [sortField]: { lt: cmpVal } } as Prisma.BookWhereInput,
                        { AND: [{ [sortField]: { equals: cmpVal } } as Prisma.BookWhereInput, { id: { lt: parsed.id } }] },
                    ],
                } as Prisma.BookWhereInput;
            }

            return {
                OR: [
                    { [sortField]: { gt: cmpVal } } as Prisma.BookWhereInput,
                    { AND: [{ [sortField]: { equals: cmpVal } } as Prisma.BookWhereInput, { id: { gt: parsed.id } }] },
                ],
            } as Prisma.BookWhereInput;
        }

        let matchType: "code" | "text" | "none" = "none";
        const baseWhere: Prisma.BookWhereInput = visibilityFilter;
        let where: Prisma.BookWhereInput = baseWhere;

        if (q) {
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
                return NextResponse.json(
                    {
                        ok: true,
                        data: {
                            matchType,
                            items: [codeMatch],
                            pageInfo: { limit, hasNext: false, nextCursor: null },
                            summary: { count: 1, total: 1 },
                        },
                    },
                    { status: 200 }
                );
            }

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
            } satisfies Prisma.BookWhereInput;
        }

        if (cursor) {
            const decoded = parseCursor(cursor);
            if (!decoded) return NextResponse.json({ ok: false, error: "INVALID_QUERY" }, { status: 400 });
            const cursorWhere = buildCursorWhere(decoded);
            if (cursorWhere) where = { AND: [where, cursorWhere] };
        }

        const orderBy = [{ [sortField]: orderDir }, { id: orderDir }] as Prisma.BookOrderByWithRelationInput[];

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
            return NextResponse.json(
                {
                    ok: true,
                    data: {
                        matchType,
                        items: [],
                        pageInfo: { limit: pageSize, hasNext: false, nextCursor: null },
                        summary: { count: 0, total: 0 },
                    },
                },
                { status: 200 }
            );
        }

        let nextCursor: string | null = null;
        if (hasNext) {
            const last = items[items.length - 1];
            const cursorVal = (last as unknown as Record<string, unknown>)[sortField];
            const cursorObj = { value: cursorVal instanceof Date ? cursorVal.toISOString() : cursorVal, id: last.id };
            nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString("base64");
        }

        const total = await db.book.count({ where: baseWhere });

        return NextResponse.json(
            {
                ok: true,
                data: {
                    matchType,
                    items,
                    pageInfo: { limit: pageSize, hasNext, nextCursor },
                    summary: { count: items.length, total },
                },
            },
            { status: 200 }
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
    }
}
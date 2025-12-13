import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";


function parseLimit(raw?: string | null) {
  const l = raw ? Number(raw) : 20;
  if (!Number.isInteger(l) || l <= 0) return 20;
  return Math.min(l, 100);
}


export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const url = new URL(req.url);
    const sp = url.searchParams;

    const limit = parseLimit(sp.get("limit"));
    const cursor = sp.get("cursor");
    const visibilityParam = sp.get("visibility"); // PUBLIC / PRIVATE / null
    const ownedByMeParam = sp.get("ownedByMe"); // "true" | "false" | null
    const sort = sp.get("sort") ?? "updatedAt";
    const order = (sp.get("order") ?? "desc").toLowerCase();

    // validate sort/order
    const allowedSort = ["updatedAt", "createdAt", "rating", "title"];
    if (!allowedSort.includes(sort)) return NextResponse.json({ ok: false, error: "INVALID_QUERY" }, { status: 400 });
    if (order !== "asc" && order !== "desc") return NextResponse.json({ ok: false, error: "INVALID_QUERY" }, { status: 400 });

    // map to book fields
    let sortField: string = sort === "rating" ? "ratingAvg" : sort;

    // base where: only current user's library rows
    let baseWhere: any = { userId: user.id };

    // apply visibility filter to the linked book
    if (visibilityParam === "PUBLIC" || visibilityParam === "PRIVATE") {
      baseWhere.book = { visibility: visibilityParam };
    }

    // apply ownedByMe filter
    if (ownedByMeParam === "true") baseWhere.book = { ...(baseWhere.book ?? {}), authorId: user.id };
    else if (ownedByMeParam === "false") baseWhere.book = { ...(baseWhere.book ?? {}), NOT: { authorId: user.id } };

    // cursor handling: cursor is base64(JSON) of { value, id }
    let where = baseWhere;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
        const cmpVal = sortField === "updatedAt" || sortField === "createdAt" ? new Date(decoded.value) : (sortField === "ratingAvg" ? Number(decoded.value) : decoded.value);
        const idVal = decoded.id;

        if (order === "desc") {
          where = { AND: [where, { OR: [{ book: { [sortField]: { lt: cmpVal } } }, { AND: [{ book: { [sortField]: { equals: cmpVal } } }, { bookId: { lt: idVal } }] }] }] };
        } else {
          where = { AND: [where, { OR: [{ book: { [sortField]: { gt: cmpVal } } }, { AND: [{ book: { [sortField]: { equals: cmpVal } } }, { bookId: { gt: idVal } }] }] }] };
        }
      } catch (e) {
        return NextResponse.json({ ok: false, error: "INVALID_QUERY" }, { status: 400 });
      }
    }

    const orderBy: any[] = [{ book: { [sortField]: order } }, { bookId: order }];

    const rows = await db.userLibrary.findMany({
      where,
      orderBy,
      take: limit + 1,
      include: {
        book: {
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
        },
      },
    });

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;

    if (!items.length) {
      return NextResponse.json({ ok: true, data: { items: [], pageInfo: { limit, hasNext: false, nextCursor: null }, summary: { count: 0, total: 0 } } }, { status: 200 });
    }

    let nextCursor: string | null = null;
    if (hasNext) {
      const last = items[items.length - 1];
      const val = last.book[sortField as keyof typeof last.book];
      const cursorObj = { value: val instanceof Date ? val.toISOString() : val, id: last.book.id };
      nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString("base64");
    }

    // total optional — compute count on baseWhere (without pagination cursor)
    const total = await db.userLibrary.count({ where: baseWhere });

    const responseItems = items.map((r: any) => r.book);

    return NextResponse.json({ ok: true, data: { items: responseItems, pageInfo: { limit, hasNext, nextCursor }, summary: { count: responseItems.length, total } } }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema, tableName } from "@/lib/db";
import { COOKIE_NAME, getUserType } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const passagesTable = tableName(userType, "passages");
  const booksTable = tableName(userType, "books");
  const passageTagsTable = tableName(userType, "passage_tags");
  const tagsTable = tableName(userType, "tags");

  const tag = request.nextUrl.searchParams.get("tag");
  if (!tag) {
    return NextResponse.json({ passages: [] });
  }

  const result = await db(userType).execute({
    sql: `
      SELECT p.id, p.content, p.page, p.created_at,
             b.id AS book_id, b.title AS book_title, b.cover_url AS book_cover_url
      FROM ${passagesTable} p
      JOIN ${booksTable} b ON b.id = p.book_id
      JOIN ${passageTagsTable} pt ON pt.passage_id = p.id
      JOIN ${tagsTable} t ON t.id = pt.tag_id
      WHERE t.name = ?
      ORDER BY p.created_at DESC
    `,
    args: [tag],
  });

  const passages = result.rows.map((r) => ({
    id: Number(r.id),
    content: String(r.content),
    page: r.page !== null ? Number(r.page) : null,
    created_at: String(r.created_at),
    book_id: Number(r.book_id),
    book_title: String(r.book_title),
    book_cover_url: r.book_cover_url ? String(r.book_cover_url) : null,
  }));

  return NextResponse.json({ passages });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema, nowIso, tableName } from "@/lib/db";
import { COOKIE_NAME, getUserType } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const books = tableName(userType, "books");
  const result = await db(userType).execute(
    `SELECT * FROM ${books} ORDER BY created_at DESC`
  );
  return NextResponse.json({ books: result.rows });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const books = tableName(userType, "books");
  const body = await req.json().catch(() => ({}));
  const { title, author, isbn, cover_url, recorded_at, visitor_name } = body;
  if (!title?.trim()) {
    return NextResponse.json({ error: "title은 필수입니다" }, { status: 400 });
  }
  const now = nowIso();
  const result = await db(userType).execute({
    sql: `INSERT INTO ${books} (title, author, isbn, cover_url, visitor_name, recorded_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      title.trim(),
      author ?? null,
      isbn ?? null,
      cover_url ?? null,
      visitor_name ?? null,
      recorded_at ?? now,
      now,
      now,
    ],
  });
  const bookId = Number(result.lastInsertRowid);
  const book = await db(userType).execute({
    sql: `SELECT * FROM ${books} WHERE id = ?`,
    args: [bookId],
  });
  return NextResponse.json({ book: book.rows[0] }, { status: 201 });
}

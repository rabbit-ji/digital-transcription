import { NextResponse } from "next/server";
import { db, ensureSchema, nowIso } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const result = await db().execute(
    "SELECT * FROM books ORDER BY created_at DESC"
  );
  return NextResponse.json({ books: result.rows });
}

export async function POST(req: Request) {
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const { title, author, isbn, cover_url, recorded_at } = body;
  if (!title?.trim()) {
    return NextResponse.json({ error: "title은 필수입니다" }, { status: 400 });
  }
  const now = nowIso();
  const result = await db().execute({
    sql: `INSERT INTO books (title, author, isbn, cover_url, recorded_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      title.trim(),
      author ?? null,
      isbn ?? null,
      cover_url ?? null,
      recorded_at ?? now,
      now,
      now,
    ],
  });
  const bookId = Number(result.lastInsertRowid);
  const book = await db().execute({
    sql: "SELECT * FROM books WHERE id = ?",
    args: [bookId],
  });
  return NextResponse.json({ book: book.rows[0] }, { status: 201 });
}

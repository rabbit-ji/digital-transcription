import { NextResponse } from "next/server";
import type { InValue } from "@libsql/client";
import { db, ensureSchema, nowIso } from "@/lib/db";
import { matchFlower } from "@/lib/gemini";
import { getSeason, getFlowersBySeason } from "@/lib/flowers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  await ensureSchema();
  const { id } = await params;
  const book = await db().execute({
    sql: "SELECT * FROM books WHERE id = ?",
    args: [id],
  });
  if (!book.rows[0]) {
    return NextResponse.json({ error: "책을 찾을 수 없습니다" }, { status: 404 });
  }
  const passages = await db().execute({
    sql: "SELECT id, content, page, created_at FROM passages WHERE book_id = ? ORDER BY created_at ASC",
    args: [id],
  });
  return NextResponse.json({ book: book.rows[0], passages: passages.rows });
}

export async function PATCH(req: Request, { params }: Params) {
  await ensureSchema();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  // review가 새로 저장될 때 꽃 매칭 시도
  if ("review" in body && body.review?.trim()) {
    try {
      const bookRow = await db().execute({
        sql: "SELECT recorded_at FROM books WHERE id = ?",
        args: [id],
      });
      const recordedAt = String(bookRow.rows[0]?.recorded_at ?? new Date().toISOString());
      const season = getSeason(recordedAt);
      const candidates = getFlowersBySeason(season);
      const flower = await matchFlower(body.review.trim(), candidates);
      if (flower) {
        body.flower_name = flower.name;
        body.flower_meaning = flower.meaning;
        body.flower_season = flower.season;
        body.flower_emoji = flower.emoji;
        body.flower_reason = flower.reason;
      }
    } catch {
      // 꽃 매칭 실패해도 소감 저장은 계속
    }
  }

  const allowed = ["title", "author", "review", "flower_name", "flower_meaning", "flower_season", "flower_emoji", "flower_reason"];
  const updates: string[] = [];
  const args: InValue[] = [];
  for (const key of allowed) {
    if (key in body) {
      updates.push(`${key} = ?`);
      args.push(body[key]);
    }
  }
  if (updates.length === 0) {
    return NextResponse.json({ error: "변경할 필드가 없습니다" }, { status: 400 });
  }
  updates.push("updated_at = ?");
  args.push(nowIso());
  args.push(id);
  await db().execute({
    sql: `UPDATE books SET ${updates.join(", ")} WHERE id = ?`,
    args,
  });
  const book = await db().execute({
    sql: "SELECT * FROM books WHERE id = ?",
    args: [id],
  });
  return NextResponse.json({ book: book.rows[0] });
}

export async function DELETE(_req: Request, { params }: Params) {
  await ensureSchema();
  const { id } = await params;
  await db().execute({ sql: "DELETE FROM books WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}

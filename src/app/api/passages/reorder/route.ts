import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema, tableName } from "@/lib/db";
import { COOKIE_NAME, getUserType } from "@/lib/auth";

/**
 * 한 책의 필사 표시 순서를 저장한다.
 * body: { book_id, ordered_ids: number[] } — 원하는 순서대로 나열한 필사 id 목록.
 * ordered_ids의 인덱스를 그대로 position에 기록해 이후 COALESCE(position, id) 정렬에 반영한다.
 * book_id 조건을 함께 걸어 다른 책의 필사는 건드리지 않는다.
 */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const passagesTable = tableName(userType, "passages");

  const body = await req.json().catch(() => ({}));
  const { book_id, ordered_ids } = body;
  if (!book_id || !Array.isArray(ordered_ids) || ordered_ids.length === 0) {
    return NextResponse.json({ error: "book_id와 ordered_ids는 필수입니다" }, { status: 400 });
  }

  const statements = ordered_ids.map((passageId: number, index: number) => ({
    sql: `UPDATE ${passagesTable} SET position = ? WHERE id = ? AND book_id = ?`,
    args: [index, passageId, book_id],
  }));

  await db(userType).batch(statements, "write");

  return NextResponse.json({ ok: true });
}

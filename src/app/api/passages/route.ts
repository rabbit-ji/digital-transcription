import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema, nowIso, tableName } from "@/lib/db";
import { COOKIE_NAME, getUserType } from "@/lib/auth";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const passagesTable = tableName(userType, "passages");
  const body = await req.json().catch(() => ({}));
  const { book_id, content, page } = body;
  if (!book_id || !content?.trim()) {
    return NextResponse.json({ error: "book_id와 content는 필수입니다" }, { status: 400 });
  }
  const now = nowIso();
  const trimmed = content.trim();

  // 필사는 즉시 저장한다. 태그 추출은 AI 호출 비용이 있어 여기서 하지 않고,
  // 인용 사전(dictionary) 진입 시 미처리분만 한 번씩 추출한다(tags_extracted 플래그로 캐시).
  const result = await db(userType).execute({
    sql: `INSERT INTO ${passagesTable} (book_id, content, page, created_at) VALUES (?, ?, ?, ?)`,
    args: [book_id, trimmed, page ?? null, now],
  });
  const passageId = Number(result.lastInsertRowid);

  const passage = await db(userType).execute({
    sql: `SELECT id, content, page, created_at FROM ${passagesTable} WHERE id = ?`,
    args: [passageId],
  });

  return NextResponse.json({ passage: passage.rows[0], tags: [] }, { status: 201 });
}

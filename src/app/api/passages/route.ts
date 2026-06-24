import { NextResponse } from "next/server";
import { db, ensureSchema, nowIso } from "@/lib/db";
import { embedPassage, extractTags } from "@/lib/gemini";

export async function POST(req: Request) {
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const { book_id, content, page } = body;
  if (!book_id || !content?.trim()) {
    return NextResponse.json({ error: "book_id와 content는 필수입니다" }, { status: 400 });
  }
  const now = nowIso();
  const trimmed = content.trim();

  // 임베딩 + 태그 추출 (AI 오류는 무시하고 저장은 계속)
  let vecStr: string | null = null;
  let tags: string[] = [];
  try {
    const [vec, extracted] = await Promise.all([
      embedPassage(trimmed),
      extractTags(trimmed),
    ]);
    if (vec.length === 768) vecStr = `[${vec.join(",")}]`;
    tags = extracted;
  } catch {
    // Gemini 호출 실패 시 임베딩·태그 없이 저장
  }

  const result = vecStr
    ? await db().execute({
        sql: "INSERT INTO passages (book_id, content, page, embedding, created_at) VALUES (?, ?, ?, vector(?), ?)",
        args: [book_id, trimmed, page ?? null, vecStr, now],
      })
    : await db().execute({
        sql: "INSERT INTO passages (book_id, content, page, created_at) VALUES (?, ?, ?, ?)",
        args: [book_id, trimmed, page ?? null, now],
      });

  const passageId = Number(result.lastInsertRowid);

  // 태그 upsert
  for (const tag of tags) {
    const tagName = tag.trim();
    if (!tagName) continue;
    await db().execute({
      sql: "INSERT OR IGNORE INTO tags (name) VALUES (?)",
      args: [tagName],
    });
    const tagRow = await db().execute({
      sql: "SELECT id FROM tags WHERE name = ?",
      args: [tagName],
    });
    if (tagRow.rows[0]) {
      await db().execute({
        sql: "INSERT OR IGNORE INTO passage_tags (passage_id, tag_id) VALUES (?, ?)",
        args: [passageId, tagRow.rows[0].id],
      });
    }
  }

  const passage = await db().execute({
    sql: "SELECT id, content, page, created_at FROM passages WHERE id = ?",
    args: [passageId],
  });
  return NextResponse.json({ passage: passage.rows[0], tags }, { status: 201 });
}

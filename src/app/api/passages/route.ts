import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema, nowIso } from "@/lib/db";
import { COOKIE_NAME, getUserType } from "@/lib/auth";
import { embedPassage, extractTags } from "@/lib/gemini";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  // after() 클로저 안에서도 쓸 수 있도록 미리 캡처
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const body = await req.json().catch(() => ({}));
  const { book_id, content, page } = body;
  if (!book_id || !content?.trim()) {
    return NextResponse.json({ error: "book_id와 content는 필수입니다" }, { status: 400 });
  }
  const now = nowIso();
  const trimmed = content.trim();

  // DB에 먼저 저장 (임베딩 없이)
  const result = await db(userType).execute({
    sql: "INSERT INTO passages (book_id, content, page, created_at) VALUES (?, ?, ?, ?)",
    args: [book_id, trimmed, page ?? null, now],
  });
  const passageId = Number(result.lastInsertRowid);

  const passage = await db(userType).execute({
    sql: "SELECT id, content, page, created_at FROM passages WHERE id = ?",
    args: [passageId],
  });

  // 임베딩 + 태그 추출은 응답 후 백그라운드에서 처리
  after(async () => {
    try {
      const [vec, tags] = await Promise.all([
        embedPassage(trimmed),
        extractTags(trimmed),
      ]);

      if (vec.length === 768) {
        await db(userType).execute({
          sql: "UPDATE passages SET embedding = vector(?) WHERE id = ?",
          args: [`[${vec.join(",")}]`, passageId],
        });
      }

      for (const tag of tags) {
        const tagName = tag.trim();
        if (!tagName) continue;
        await db(userType).execute({
          sql: "INSERT OR IGNORE INTO tags (name) VALUES (?)",
          args: [tagName],
        });
        const tagRow = await db(userType).execute({
          sql: "SELECT id FROM tags WHERE name = ?",
          args: [tagName],
        });
        if (tagRow.rows[0]) {
          await db(userType).execute({
            sql: "INSERT OR IGNORE INTO passage_tags (passage_id, tag_id) VALUES (?, ?)",
            args: [passageId, tagRow.rows[0].id],
          });
        }
      }
    } catch {
      // 임베딩/태그 실패해도 필사는 이미 저장됨
    }
  });

  return NextResponse.json({ passage: passage.rows[0], tags: [] }, { status: 201 });
}

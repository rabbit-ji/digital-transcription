import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema, tableName } from "@/lib/db";
import { COOKIE_NAME, getUserType } from "@/lib/auth";
import { extractTags, QuotaExceededError } from "@/lib/gemini";

/**
 * 아직 태그를 추출하지 않은 필사(tags_extracted != 1)만 골라 태그를 붙인다.
 * 인용 사전(dictionary) 진입 시 호출되며, 한 번 처리한 필사는 tags_extracted=1로
 * 저장해 다시 Gemini를 호출하지 않는다(캐시). 미처리 필사가 없으면 API를 아예 쓰지 않는다.
 * 일일 한도(429)를 만나면 처리한 만큼만 반영하고 중단한다.
 */
export async function POST() {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const passagesTable = tableName(userType, "passages");
  const tagsTable = tableName(userType, "tags");
  const passageTagsTable = tableName(userType, "passage_tags");

  const pending = await db(userType).execute(
    `SELECT id, content FROM ${passagesTable}
     WHERE (tags_extracted IS NULL OR tags_extracted = 0)
       AND content IS NOT NULL AND TRIM(content) <> ''
     ORDER BY created_at ASC`
  );

  // 미처리 필사가 없으면 Gemini 토큰을 전혀 쓰지 않는다
  if (pending.rows.length === 0) {
    return NextResponse.json({ extracted: 0, remaining: 0, quotaExceeded: false });
  }

  let extracted = 0;
  let quotaExceeded = false;

  for (const row of pending.rows) {
    const id = row.id as number;
    const content = String(row.content ?? "").trim();
    if (!content) continue;

    let tags: string[];
    try {
      tags = await extractTags(content);
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        quotaExceeded = true;
        break; // 남은 필사는 다음 진입 때 이어서 처리
      }
      // 그 외 오류는 이 필사만 건너뛰고 계속(무한 재시도 방지 위해 완료 표시)
      await markExtracted(userType, passagesTable, id);
      continue;
    }

    for (const raw of tags) {
      const tagName = raw.trim();
      if (!tagName) continue;
      await db(userType).execute({
        sql: `INSERT OR IGNORE INTO ${tagsTable} (name) VALUES (?)`,
        args: [tagName],
      });
      const tagRow = await db(userType).execute({
        sql: `SELECT id FROM ${tagsTable} WHERE name = ?`,
        args: [tagName],
      });
      if (tagRow.rows[0]) {
        await db(userType).execute({
          sql: `INSERT OR IGNORE INTO ${passageTagsTable} (passage_id, tag_id) VALUES (?, ?)`,
          args: [id, tagRow.rows[0].id],
        });
      }
    }

    await markExtracted(userType, passagesTable, id);
    extracted++;
  }

  const remaining = pending.rows.length - extracted;
  return NextResponse.json({ extracted, remaining, quotaExceeded });
}

async function markExtracted(
  userType: "admin" | "guest",
  passagesTable: string,
  id: number
): Promise<void> {
  await db(userType).execute({
    sql: `UPDATE ${passagesTable} SET tags_extracted = 1 WHERE id = ?`,
    args: [id],
  });
}

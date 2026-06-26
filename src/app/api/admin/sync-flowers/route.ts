import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { matchFlower } from "@/lib/gemini";
import { FLOWERS, getSeason, getFlowersBySeason } from "@/lib/flowers";

export async function POST() {
  await ensureSchema();

  const result = await db().execute(
    "SELECT id, review, recorded_at, flower_name FROM books"
  );

  let synced = 0;
  let rematched = 0;
  const failed: { id: number; reason: string }[] = [];

  for (const row of result.rows) {
    const id = row.id as number;
    const flowerName = row.flower_name as string | null;
    const review = row.review as string | null;
    const recordedAt = row.recorded_at as string | null;

    if (flowerName) {
      // flower_name 있는 책: flowers.ts 기준으로 emoji, meaning 업데이트
      const flowerData = FLOWERS.find((f) => f.name === flowerName);
      if (flowerData) {
        await db().execute({
          sql: "UPDATE books SET flower_emoji = ?, flower_meaning = ? WHERE id = ?",
          args: [flowerData.emoji, flowerData.meaning, id],
        });
        synced++;
      }
    } else if (review?.trim()) {
      // flower_name 없고 review 있는 책: AI 재매칭
      try {
        const effectiveDate = recordedAt?.trim() || new Date().toISOString();
        const season = getSeason(effectiveDate);
        const candidates = getFlowersBySeason(season);
        // 1차: 계절 필터 후보, 실패 시 2차: 전체 꽃 목록
        let flower = await matchFlower(review.trim(), candidates);
        if (!flower) {
          flower = await matchFlower(review.trim(), FLOWERS);
        }
        if (flower) {
          await db().execute({
            sql: `UPDATE books
                  SET flower_name = ?, flower_meaning = ?, flower_season = ?,
                      flower_emoji = ?, flower_reason = ?
                  WHERE id = ?`,
            args: [flower.name, flower.meaning, flower.season, flower.emoji, flower.reason, id],
          });
          rematched++;
        } else {
          failed.push({ id, reason: "전체 꽃 목록으로도 매칭 실패" });
        }
      } catch (e) {
        failed.push({ id, reason: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  return NextResponse.json({ ok: true, synced, rematched, failed });
}

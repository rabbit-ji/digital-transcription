import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema, tableName } from "@/lib/db";
import { matchFlower } from "@/lib/gemini";
import { getSeason, getFlowersBySeason } from "@/lib/flowers";
import { COOKIE_NAME, getUserType } from "@/lib/auth";

type UserType = "admin" | "guest";

interface SyncFailure {
  userType: UserType;
  id: number;
  reason: string;
}

/**
 * 한 테이블에서 꽃이 비어있는 책만 골라 새로 부여한다.
 * 이미 flower_name이 있는 책은 건드리지 않는다(재동기화 금지).
 */
async function syncEmptyFlowers(userType: UserType): Promise<{ rematched: number; failed: SyncFailure[] }> {
  await ensureSchema(userType);
  const table = tableName(userType, "books");

  const result = await db(userType).execute(
    `SELECT id, review, recorded_at FROM ${table}
     WHERE (flower_name IS NULL OR flower_name = '') AND review IS NOT NULL AND TRIM(review) <> ''`
  );

  let rematched = 0;
  const failed: SyncFailure[] = [];

  for (const row of result.rows) {
    const id = row.id as number;
    const review = (row.review as string | null)?.trim();
    const recordedAt = row.recorded_at as string | null;
    if (!review) continue;

    try {
      const effectiveDate = recordedAt?.trim() || new Date().toISOString();
      const season = getSeason(effectiveDate);
      const candidates = getFlowersBySeason(season);
      const flower = await matchFlower(review, candidates);
      if (flower) {
        await db(userType).execute({
          sql: `UPDATE ${table}
                SET flower_name = ?, flower_meaning = ?, flower_season = ?,
                    flower_emoji = ?, flower_reason = ?
                WHERE id = ?`,
          args: [flower.name, flower.meaning, flower.season, flower.emoji, flower.reason, id],
        });
        rematched++;
      } else {
        failed.push({ userType, id, reason: "AI가 후보 꽃 목록에 없는 이름을 반환했거나 응답이 없음" });
      }
    } catch (e) {
      failed.push({ userType, id, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  return { rematched, failed };
}

export async function POST() {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  if (userType !== "admin") {
    return NextResponse.json({ ok: false, error: "관리자만 사용할 수 있어요" }, { status: 403 });
  }

  // 관리자가 실행하면 관리자/게스트 데이터 모두 동기화
  const adminResult = await syncEmptyFlowers("admin");
  const guestResult = await syncEmptyFlowers("guest");

  return NextResponse.json({
    ok: true,
    synced: 0,
    rematched: adminResult.rematched + guestResult.rematched,
    failed: [...adminResult.failed, ...guestResult.failed],
  });
}

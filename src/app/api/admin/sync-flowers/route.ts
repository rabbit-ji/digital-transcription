import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema, tableName } from "@/lib/db";
import { matchFlower, QuotaExceededError } from "@/lib/gemini";
import { getSeason, getFlowersBySeason } from "@/lib/flowers";
import { COOKIE_NAME, getUserType } from "@/lib/auth";

type UserType = "admin" | "guest";

interface SyncFailure {
  userType: UserType;
  id: number;
  reason: string;
}

interface SyncOutcome {
  rematched: number;
  remaining: number; // 아직 꽃이 없는 채로 남은 책 수
  quotaExceeded: boolean;
  failed: SyncFailure[];
}

/** 꽃이 비어있는 책 수만 센다(Gemini 호출 없음) */
async function countEmptyFlowers(userType: UserType): Promise<number> {
  await ensureSchema(userType);
  const table = tableName(userType, "books");
  const result = await db(userType).execute(
    `SELECT COUNT(*) AS c FROM ${table}
     WHERE (flower_name IS NULL OR flower_name = '') AND review IS NOT NULL AND TRIM(review) <> ''`
  );
  return Number(result.rows[0]?.c ?? 0);
}

/**
 * 한 테이블에서 꽃이 비어있는 책만 골라 등록 오래된 순으로 새로 부여한다.
 * 이미 flower_name이 있는 책은 건드리지 않는다(재동기화 금지).
 * 일일 한도(429)를 만나면 처리한 만큼만 반영하고 중단한다.
 */
async function syncEmptyFlowers(userType: UserType): Promise<SyncOutcome> {
  await ensureSchema(userType);
  const table = tableName(userType, "books");

  const result = await db(userType).execute(
    `SELECT id, review, recorded_at FROM ${table}
     WHERE (flower_name IS NULL OR flower_name = '') AND review IS NOT NULL AND TRIM(review) <> ''
     ORDER BY created_at ASC`
  );

  const total = result.rows.length;
  let rematched = 0;
  let quotaExceeded = false;
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
      if (e instanceof QuotaExceededError) {
        quotaExceeded = true;
        break; // 남은 책은 다음 동기화 때 이어서 처리
      }
      failed.push({ userType, id, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  return { rematched, remaining: total - rematched, quotaExceeded, failed };
}

export async function POST() {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  if (userType !== "admin") {
    return NextResponse.json({ ok: false, error: "관리자만 사용할 수 있어요" }, { status: 403 });
  }

  // 관리자가 실행하면 관리자/게스트 데이터 모두 동기화한다.
  const adminResult = await syncEmptyFlowers("admin");

  // 관리자 처리 중 한도에 걸렸다면 게스트는 매칭 없이 남은 개수만 센다(토큰 절약).
  const guestResult: SyncOutcome = adminResult.quotaExceeded
    ? { rematched: 0, remaining: await countEmptyFlowers("guest"), quotaExceeded: true, failed: [] }
    : await syncEmptyFlowers("guest");

  return NextResponse.json({
    ok: true,
    rematched: adminResult.rematched + guestResult.rematched,
    remaining: adminResult.remaining + guestResult.remaining,
    quotaExceeded: adminResult.quotaExceeded || guestResult.quotaExceeded,
    failed: [...adminResult.failed, ...guestResult.failed],
  });
}

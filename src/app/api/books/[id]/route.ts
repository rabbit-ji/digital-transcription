import { NextResponse } from "next/server";
import type { InValue } from "@libsql/client";
import { cookies } from "next/headers";
import { db, ensureSchema, nowIso, tableName } from "@/lib/db";
import { COOKIE_NAME, getUserType } from "@/lib/auth";
import { matchFlower, QuotaExceededError } from "@/lib/gemini";
import { getSeason, getFlowersBySeason } from "@/lib/flowers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const booksTable = tableName(userType, "books");
  const passagesTable = tableName(userType, "passages");
  const { id } = await params;
  const book = await db(userType).execute({
    sql: `SELECT * FROM ${booksTable} WHERE id = ?`,
    args: [id],
  });
  if (!book.rows[0]) {
    return NextResponse.json({ error: "책을 찾을 수 없습니다" }, { status: 404 });
  }
  // 필사 순서: 수동으로 재정렬했으면 position, 아니면 저장(삽입) 순서인 id.
  // id는 AUTOINCREMENT라 저장 순서를 정확히 보존한다(created_at은 밀리초라 동률 가능).
  // position이 지정된 책은 사용자가 지정한 순서대로, 아직 재정렬 안 한 책은 id 순.
  const passages = await db(userType).execute({
    sql: `SELECT id, content, page, position, created_at FROM ${passagesTable}
          WHERE book_id = ? ORDER BY COALESCE(position, id) ASC, id ASC`,
    args: [id],
  });
  return NextResponse.json({ book: book.rows[0], passages: passages.rows });
}

export async function PATCH(req: Request, { params }: Params) {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const booksTable = tableName(userType, "books");
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  // 소감 또는 등록일자 변경 시 꽃 재매칭 여부 판단
  const shouldRematching =
    ("review" in body && body.review?.trim()) ||
    ("recorded_at" in body && body.recorded_at?.trim());

  // 백그라운드 꽃 매칭에 쓸 값을 미리 확보 (DB에서 기존 값 읽기)
  let pendingFlowerReview: string | null = null;
  let pendingFlowerDate: string | null = null;

  if (shouldRematching) {
    try {
      const bookRow = await db(userType).execute({
        sql: `SELECT review, recorded_at FROM ${booksTable} WHERE id = ?`,
        args: [id],
      });
      const effectiveReview =
        "review" in body
          ? (body.review?.trim() ?? "")
          : String(bookRow.rows[0]?.review ?? "").trim();
      const effectiveDate =
        "recorded_at" in body && body.recorded_at != null
          ? body.recorded_at.trim()
          : String(bookRow.rows[0]?.recorded_at ?? new Date().toISOString());

      if (effectiveReview) {
        pendingFlowerReview = effectiveReview;
        pendingFlowerDate = effectiveDate;
      }
    } catch {
      // DB 조회 실패 시 꽃 매칭 건너뜀
    }
  }

  const allowed = ["title", "author", "review", "recorded_at", "flower_name", "flower_meaning", "flower_season", "flower_emoji", "flower_reason", "first_sentence", "last_sentence", "visitor_name"];
  const updates: string[] = [];
  const args: InValue[] = [];
  for (const key of allowed) {
    if (key in body) {
      // recorded_at은 null로 덮어쓰지 않음 (NOT NULL 컬럼, 기존 날짜 보존)
      if (key === "recorded_at" && body[key] === null) continue;
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
  await db(userType).execute({
    sql: `UPDATE ${booksTable} SET ${updates.join(", ")} WHERE id = ?`,
    args,
  });

  // 꽃 매칭은 동기로 수행해 결과(성공/한도 초과)를 사용자에게 바로 알린다.
  // 한도 초과 시 꽃은 비워두고 flowerQuotaExceeded로 안내한다(정원 동기화로 재시도 가능).
  let flowerQuotaExceeded = false;
  if (pendingFlowerReview) {
    const reviewForFlower = pendingFlowerReview;
    const dateForFlower = pendingFlowerDate ?? new Date().toISOString();
    try {
      const season = getSeason(dateForFlower);
      const candidates = getFlowersBySeason(season);
      const flower = await matchFlower(reviewForFlower, candidates);
      if (flower) {
        await db(userType).execute({
          sql: `UPDATE ${booksTable}
                SET flower_name = ?, flower_meaning = ?, flower_season = ?,
                    flower_emoji = ?, flower_reason = ?
                WHERE id = ?`,
          args: [flower.name, flower.meaning, flower.season, flower.emoji, flower.reason, id],
        });
      }
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        flowerQuotaExceeded = true;
      }
      // 그 외 오류는 꽃만 비운 채 저장은 유지(정원 동기화 버튼으로 재시도 가능)
    }
  }

  const book = await db(userType).execute({
    sql: `SELECT * FROM ${booksTable} WHERE id = ?`,
    args: [id],
  });

  return NextResponse.json({ book: book.rows[0], flowerQuotaExceeded });
}

export async function DELETE(_req: Request, { params }: Params) {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const booksTable = tableName(userType, "books");
  const { id } = await params;
  await db(userType).execute({ sql: `DELETE FROM ${booksTable} WHERE id = ?`, args: [id] });
  return NextResponse.json({ ok: true });
}

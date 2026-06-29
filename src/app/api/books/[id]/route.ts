import { NextResponse, after } from "next/server";
import type { InValue } from "@libsql/client";
import { cookies } from "next/headers";
import { db, ensureSchema, nowIso } from "@/lib/db";
import { COOKIE_NAME, getUserType } from "@/lib/auth";
import { matchFlower } from "@/lib/gemini";
import { getSeason, getFlowersBySeason } from "@/lib/flowers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const { id } = await params;
  const book = await db(userType).execute({
    sql: "SELECT * FROM books WHERE id = ?",
    args: [id],
  });
  if (!book.rows[0]) {
    return NextResponse.json({ error: "책을 찾을 수 없습니다" }, { status: 404 });
  }
  const passages = await db(userType).execute({
    sql: "SELECT id, content, page, created_at FROM passages WHERE book_id = ? ORDER BY created_at ASC",
    args: [id],
  });
  return NextResponse.json({ book: book.rows[0], passages: passages.rows });
}

export async function PATCH(req: Request, { params }: Params) {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
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
        sql: "SELECT review, recorded_at FROM books WHERE id = ?",
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
    sql: `UPDATE books SET ${updates.join(", ")} WHERE id = ?`,
    args,
  });
  const book = await db(userType).execute({
    sql: "SELECT * FROM books WHERE id = ?",
    args: [id],
  });

  // 꽃 매칭은 응답 후 백그라운드에서 수행 (필사 임베딩과 동일한 패턴)
  if (pendingFlowerReview) {
    const reviewForFlower = pendingFlowerReview;
    const dateForFlower = pendingFlowerDate ?? new Date().toISOString();
    after(async () => {
      try {
        const season = getSeason(dateForFlower);
        const candidates = getFlowersBySeason(season);
        const flower = await matchFlower(reviewForFlower, candidates);
        if (flower) {
          await db().execute({
            sql: `UPDATE books
                  SET flower_name = ?, flower_meaning = ?, flower_season = ?,
                      flower_emoji = ?, flower_reason = ?
                  WHERE id = ?`,
            args: [flower.name, flower.meaning, flower.season, flower.emoji, flower.reason, id],
          });
        }
      } catch {
        // 꽃 매칭 실패 — 정원 동기화 버튼으로 재시도 가능
      }
    });
  }

  return NextResponse.json({ book: book.rows[0] });
}

export async function DELETE(_req: Request, { params }: Params) {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const { id } = await params;
  await db(userType).execute({ sql: "DELETE FROM books WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}

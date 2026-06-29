export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { db, ensureSchema, tableName } from "@/lib/db";
import type { Season } from "@/lib/flowers";
import { COOKIE_NAME, getUserType } from "@/lib/auth";
import GardenClient from "./GardenClient";

interface GardenBook {
  id: number;
  title: string;
  flower_name: string;
  flower_meaning: string;
  flower_season: Season;
  flower_emoji: string;
  flower_reason: string;
  recorded_at: string;
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  const isAdmin = userType === "admin";
  await ensureSchema(userType);

  let books: GardenBook[] = [];
  try {
    const result = await db(userType).execute(`
      SELECT id, title, flower_name, flower_meaning, flower_season, flower_emoji, flower_reason, recorded_at
      FROM ${tableName(userType, "books")}
      WHERE flower_name IS NOT NULL
      ORDER BY recorded_at ASC
    `);
    books = result.rows.map((r) => ({
      id: Number(r.id),
      title: String(r.title),
      flower_name: String(r.flower_name),
      flower_meaning: String(r.flower_meaning),
      flower_season: String(r.flower_season) as Season,
      flower_emoji: String(r.flower_emoji),
      flower_reason: String(r.flower_reason),
      recorded_at: String(r.recorded_at),
    }));
  } catch {
    // DB 오류 시 빈 정원
  }

  return <GardenClient books={books} isAdmin={isAdmin} />;
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema, tableName } from "@/lib/db";
import { COOKIE_NAME, getUserType } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const tagsTable = tableName(userType, "tags");
  const passageTagsTable = tableName(userType, "passage_tags");

  const result = await db(userType).execute(`
    SELECT t.id, t.name, COUNT(pt.passage_id) AS count
    FROM ${tagsTable} t
    LEFT JOIN ${passageTagsTable} pt ON t.id = pt.tag_id
    GROUP BY t.id, t.name
    ORDER BY count DESC, t.name ASC
  `);

  const tags = result.rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    count: Number(r.count),
  }));

  return NextResponse.json({ tags });
}

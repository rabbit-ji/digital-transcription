import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const result = await db().execute(`
    SELECT t.id, t.name, COUNT(pt.passage_id) AS count
    FROM tags t
    LEFT JOIN passage_tags pt ON t.id = pt.tag_id
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

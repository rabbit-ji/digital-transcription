import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema, tableName } from "@/lib/db";
import { COOKIE_NAME, getUserType } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const passagesTable = tableName(userType, "passages");
  const booksTable = tableName(userType, "books");
  const embeddingIdx = tableName(userType, "passages_embedding_idx");

  const passageIdStr = request.nextUrl.searchParams.get("passage_id");
  if (!passageIdStr) {
    return NextResponse.json({ similar: [] });
  }

  const passageId = parseInt(passageIdStr, 10);
  if (isNaN(passageId)) {
    return NextResponse.json({ similar: [] });
  }

  const sourceResult = await db(userType).execute({
    sql: `SELECT book_id FROM ${passagesTable} WHERE id = ?`,
    args: [passageId],
  });
  if (sourceResult.rows.length === 0 || sourceResult.rows[0].book_id === null) {
    return NextResponse.json({ similar: [] });
  }
  const sourceBookId = Number(sourceResult.rows[0].book_id);

  try {
    const result = await db(userType).execute({
      sql: `
        SELECT p.id, p.content, p.page, p.book_id,
               b.title AS book_title, vt.distance
        FROM vector_top_k('${embeddingIdx}',
               (SELECT embedding FROM ${passagesTable} WHERE id = ?), 6) vt
        JOIN ${passagesTable} p ON p.rowid = vt.rowid
        JOIN ${booksTable} b ON b.id = p.book_id
        WHERE p.id != ? AND p.book_id != ?
        LIMIT 5
      `,
      args: [passageId, passageId, sourceBookId],
    });

    const similar = result.rows.map((r) => ({
      id: Number(r.id),
      content: String(r.content),
      page: r.page !== null ? Number(r.page) : null,
      book_id: Number(r.book_id),
      book_title: String(r.book_title),
      distance: Number(r.distance),
    }));

    return NextResponse.json({ similar });
  } catch {
    return NextResponse.json({ similar: [] });
  }
}

import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  await ensureSchema();
  const { id } = await params;
  await db().execute({ sql: "DELETE FROM passages WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}

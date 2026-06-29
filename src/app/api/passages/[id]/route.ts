import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema } from "@/lib/db";
import { COOKIE_NAME, getUserType } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const cookieStore = await cookies();
  const userType = getUserType(cookieStore.get(COOKIE_NAME)?.value);
  await ensureSchema(userType);
  const { id } = await params;
  await db(userType).execute({ sql: "DELETE FROM passages WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}

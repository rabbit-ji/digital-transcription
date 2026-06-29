import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, getUserType } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const userType = getUserType(token);
  return NextResponse.json({ isAdmin: userType === "admin", userType });
}

import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "ra_session";

function secret(): string {
  return process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verify(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!payload.startsWith("ok:")) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toHex(mac) === sig;
}

export async function middleware(req: NextRequest) {
  // 관리자 전용 API만 보호 — 일반 페이지는 게스트도 자유롭게 접근 가능
  const ok = await verify(req.cookies.get(COOKIE_NAME)?.value);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"],
};

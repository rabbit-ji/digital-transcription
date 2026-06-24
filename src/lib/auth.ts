import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "ra_session";

function secret(): string {
  return process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** 입력 비밀번호가 APP_PASSWORD와 일치하는지 */
export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD || "";
  if (!expected) return false;
  return safeEqual(input, expected);
}

/** 로그인 성공 시 발급할 서명 토큰 */
export function makeSessionToken(): string {
  const payload = `ok:${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

/** 쿠키 토큰 유효성 검증(HMAC 서명 확인) */
export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!payload.startsWith("ok:")) return false;
  return safeEqual(sig, sign(payload));
}

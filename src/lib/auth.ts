import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "ra_session";

// 이 값보다 이전에 발급된 세션은 모두 무효 처리 (기존 로그인 일괄 해제)
const SESSION_EPOCH = 1782723863284;

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
  const expected = process.env.APP_PASSWORD || "670829";
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
  const issuedAt = parseInt(payload.slice(3), 10);
  if (issuedAt < SESSION_EPOCH) return false;
  return safeEqual(sig, sign(payload));
}

/** 토큰으로 유저 타입 판별 */
export function getUserType(token: string | undefined): "admin" | "guest" {
  return verifySessionToken(token) ? "admin" : "guest";
}

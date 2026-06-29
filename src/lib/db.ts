import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let _adminClient: Client | null = null;
let _guestClient: Client | null = null;

/** Turso(libSQL) 클라이언트 싱글턴 — 유저 타입에 따라 다른 DB 반환 */
export function db(userType: "admin" | "guest" = "admin"): Client {
  if (userType === "guest") {
    if (!_guestClient) {
      const url = process.env.TURSO_URL_GUEST ?? process.env.TURSO_URL;
      const authToken = process.env.TURSO_TOKEN_GUEST ?? process.env.TURSO_TOKEN;
      if (!url) throw new Error("TURSO_URL 환경변수가 없습니다");
      _guestClient = createClient({ url, authToken });
    }
    return _guestClient;
  }
  if (!_adminClient) {
    const url = process.env.TURSO_URL;
    const authToken = process.env.TURSO_TOKEN;
    if (!url) throw new Error("TURSO_URL 환경변수가 없습니다");
    _adminClient = createClient({ url, authToken });
  }
  return _adminClient;
}

let _adminSchemaReady: Promise<void> | null = null;
let _guestSchemaReady: Promise<void> | null = null;

/** db/schema.sql을 1회 실행해 테이블/인덱스를 보장(idempotent) */
export function ensureSchema(userType: "admin" | "guest" = "admin"): Promise<void> {
  if (userType === "guest") {
    if (!_guestSchemaReady) {
      _guestSchemaReady = initSchema("guest");
    }
    return _guestSchemaReady;
  }
  if (!_adminSchemaReady) {
    _adminSchemaReady = initSchema("admin");
  }
  return _adminSchemaReady;
}

async function initSchema(userType: "admin" | "guest"): Promise<void> {
  const client = db(userType);
  const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  await client.executeMultiple(sql);
  // 기존 DB에 신규 컬럼 마이그레이션 (이미 존재하면 무시)
  const migrations = [
    "ALTER TABLE books ADD COLUMN first_sentence TEXT",
    "ALTER TABLE books ADD COLUMN last_sentence TEXT",
    "ALTER TABLE books ADD COLUMN visitor_name TEXT",
  ];
  for (const stmt of migrations) {
    try { await client.execute(stmt); } catch { /* column already exists */ }
  }
}

/** number[] 임베딩 → libSQL vector32(?) 바인딩용 JSON 문자열 */
export function vectorParam(embedding: number[]): string {
  return JSON.stringify(embedding);
}

/** 현재 시각 ISO 문자열 */
export function nowIso(): string {
  return new Date().toISOString();
}

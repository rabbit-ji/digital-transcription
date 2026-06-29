import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let _client: Client | null = null;

/** Turso(libSQL) 클라이언트 싱글턴 — 게스트/관리자가 같은 DB를 공유하되 테이블로 격리 */
function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_URL;
    const authToken = process.env.TURSO_TOKEN;
    if (!url) throw new Error("TURSO_URL 환경변수가 없습니다");
    _client = createClient({ url, authToken });
  }
  return _client;
}

/**
 * libSQL 클라이언트 반환.
 * userType 인자는 호환성을 위해 유지하지만 같은 DB를 공유한다.
 * 게스트/관리자 데이터 격리는 tableName()의 테이블 접두사로 처리한다.
 */
export function db(_userType: "admin" | "guest" = "admin"): Client {
  return getClient();
}

const GUEST_PREFIX = "guest_";

/** 게스트/관리자별 실제 테이블·인덱스 식별자 (게스트는 guest_ 접두사) */
export function tableName(userType: "admin" | "guest", base: string): string {
  return userType === "guest" ? `${GUEST_PREFIX}${base}` : base;
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

/**
 * schema.sql의 테이블·인덱스 식별자에 접두사를 안전하게 적용.
 * 단일 패스 치환(긴 식별자 우선 alternation)이라 이미 치환된 부분을
 * 다시 매칭하지 않아 이중 접두사가 생기지 않고, 단어 경계(\b)로
 * 컬럼명(book_id, passage_id, tag_id)은 건드리지 않는다.
 */
function applyPrefix(sql: string, prefix: string): string {
  if (!prefix) return sql;
  const re =
    /\b(passages_embedding_idx|passages_book_idx|passage_tags|passages|books|tags)\b/g;
  return sql.replace(re, (m) => prefix + m);
}

async function initSchema(userType: "admin" | "guest"): Promise<void> {
  const client = getClient();
  const prefix = userType === "guest" ? GUEST_PREFIX : "";
  const raw = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  await client.executeMultiple(applyPrefix(raw, prefix));
  // 기존 DB에 신규 컬럼 마이그레이션 (이미 존재하면 무시)
  const booksTable = `${prefix}books`;
  const migrations = [
    `ALTER TABLE ${booksTable} ADD COLUMN first_sentence TEXT`,
    `ALTER TABLE ${booksTable} ADD COLUMN last_sentence TEXT`,
    `ALTER TABLE ${booksTable} ADD COLUMN visitor_name TEXT`,
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

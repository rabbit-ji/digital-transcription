import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let _client: Client | null = null;

/** Turso(libSQL) 클라이언트 싱글턴 */
export function db(): Client {
  if (!_client) {
    const url = process.env.TURSO_URL;
    const authToken = process.env.TURSO_TOKEN;
    if (!url) throw new Error("TURSO_URL 환경변수가 없습니다");
    _client = createClient({ url, authToken });
  }
  return _client;
}

let _schemaReady: Promise<void> | null = null;

/** db/schema.sql을 1회 실행해 테이블/인덱스를 보장(idempotent) */
export function ensureSchema(): Promise<void> {
  if (!_schemaReady) {
    _schemaReady = (async () => {
      const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
      await db().executeMultiple(sql);
      // 기존 DB에 신규 컬럼 마이그레이션 (이미 존재하면 무시)
      const migrations = [
        "ALTER TABLE books ADD COLUMN first_sentence TEXT",
        "ALTER TABLE books ADD COLUMN last_sentence TEXT",
      ];
      for (const stmt of migrations) {
        try { await db().execute(stmt); } catch { /* column already exists */ }
      }
    })();
  }
  return _schemaReady;
}

/** number[] 임베딩 → libSQL vector32(?) 바인딩용 JSON 문자열 */
export function vectorParam(embedding: number[]): string {
  return JSON.stringify(embedding);
}

/** 현재 시각 ISO 문자열 */
export function nowIso(): string {
  return new Date().toISOString();
}

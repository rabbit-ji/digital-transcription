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

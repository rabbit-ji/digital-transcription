import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const url = process.env.TURSO_URL;
const authToken = process.env.TURSO_TOKEN;
if (!url) {
  console.error("TURSO_URL 없음");
  process.exit(1);
}

const c = createClient({ url, authToken });

await c.executeMultiple(readFileSync("db/schema.sql", "utf8"));
console.log("OK schema");

const t = await c.execute(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
);
console.log("OK tables:", t.rows.map((r) => r.name).join(", "));

const now = new Date().toISOString();
const vec = JSON.stringify(Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0)));

const b = await c.execute({
  sql: "INSERT INTO books (title, recorded_at, created_at, updated_at) VALUES (?,?,?,?)",
  args: ["__verify__", now, now, now],
});
const bookId = Number(b.lastInsertRowid);

await c.execute({
  sql: "INSERT INTO passages (book_id, content, embedding, created_at) VALUES (?,?,vector32(?),?)",
  args: [bookId, "테스트 구절", vec, now],
});

const knn = await c.execute({
  sql: "SELECT id FROM vector_top_k('passages_embedding_idx', vector32(?), 3)",
  args: [vec],
});
console.log("OK vector_top_k rows:", knn.rows.length);

// 테스트 데이터 정리(자체 삭제, CASCADE)
await c.execute({ sql: "DELETE FROM books WHERE id=?", args: [bookId] });
console.log("OK cleanup");
console.log("ALL OK");

-- 독서 필사 아카이빙 — Turso(libSQL) 스키마
-- 날짜는 모두 ISO 8601 문자열(TEXT)

CREATE TABLE IF NOT EXISTS books (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT NOT NULL,
  author         TEXT,
  isbn           TEXT,
  cover_url      TEXT,
  review         TEXT,                 -- 책별 소감
  -- 꽃(생각의 정원): 필사일 계절 + 소감 기반 꽃말
  flower_name    TEXT,
  flower_meaning TEXT,
  flower_season  TEXT,                 -- 봄/여름/가을/겨울
  flower_emoji   TEXT,
  flower_reason  TEXT,                 -- 왜 이 꽃인지(소감 연결)
  first_sentence TEXT,                 -- 책의 첫 문장
  last_sentence  TEXT,                 -- 책의 마지막 문장
  visitor_name   TEXT,                 -- 방문자 이름(게스트 방명록)
  recorded_at    TEXT NOT NULL,        -- 필사 시작일(계절 판정 기준)
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS passages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  page           INTEGER,
  embedding      F32_BLOB(768),        -- (미사용) 과거 유사 필사 검색용
  tags_extracted INTEGER DEFAULT 0,    -- 태그 추출 시도 완료 여부(1=완료, 재추출 안 함)
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS passage_tags (
  passage_id INTEGER NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (passage_id, tag_id)
);

CREATE INDEX IF NOT EXISTS passages_book_idx ON passages (book_id);

-- libSQL 벡터 검색 인덱스
CREATE INDEX IF NOT EXISTS passages_embedding_idx
  ON passages (libsql_vector_idx(embedding));

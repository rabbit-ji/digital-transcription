export const dynamic = "force-dynamic";

import Link from "next/link";
import { db, ensureSchema } from "@/lib/db";
import type { Season } from "@/lib/flowers";

interface GardenBook {
  id: number;
  title: string;
  flower_name: string;
  flower_meaning: string;
  flower_season: Season;
  flower_emoji: string;
  flower_reason: string;
  recorded_at: string;
}

const SEASON_ORDER: Season[] = ["봄", "여름", "가을", "겨울"];
const SEASON_BG: Record<Season, string> = {
  봄: "bg-pink-50 border-pink-100",
  여름: "bg-green-50 border-green-100",
  가을: "bg-amber-50 border-amber-100",
  겨울: "bg-sky-50 border-sky-100",
};
const SEASON_LABEL: Record<Season, string> = {
  봄: "🌱 봄",
  여름: "☀️ 여름",
  가을: "🍂 가을",
  겨울: "❄️ 겨울",
};

export default async function GardenPage() {
  await ensureSchema();

  let books: GardenBook[] = [];
  try {
    const result = await db().execute(`
      SELECT id, title, flower_name, flower_meaning, flower_season, flower_emoji, flower_reason, recorded_at
      FROM books
      WHERE flower_name IS NOT NULL
      ORDER BY recorded_at ASC
    `);
    books = result.rows.map((r) => ({
      id: Number(r.id),
      title: String(r.title),
      flower_name: String(r.flower_name),
      flower_meaning: String(r.flower_meaning),
      flower_season: String(r.flower_season) as Season,
      flower_emoji: String(r.flower_emoji),
      flower_reason: String(r.flower_reason),
      recorded_at: String(r.recorded_at),
    }));
  } catch {
    // DB 오류 시 빈 정원
  }

  const bySeason = SEASON_ORDER.reduce<Record<Season, GardenBook[]>>(
    (acc, s) => ({ ...acc, [s]: [] }),
    {} as Record<Season, GardenBook[]>
  );
  for (const book of books) {
    bySeason[book.flower_season]?.push(book);
  }

  const totalCount = books.length;

  return (
    <div className="max-w-lg mx-auto p-6 space-y-8">
      <div className="pt-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">생각의 정원</h1>
          <p className="text-stone-400 text-sm mt-1">소감을 쓴 책마다 꽃 한 송이</p>
        </div>
        {totalCount > 0 && (
          <span className="text-xs text-stone-400">{totalCount}권의 책</span>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="bg-stone-50 rounded-2xl p-8 text-center border border-stone-100">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-stone-500 text-sm">아직 정원이 비어 있어요.</p>
          <p className="text-stone-400 text-xs mt-1">책 소감을 남기면 꽃이 피어납니다.</p>
          <Link href="/books" className="text-xs text-stone-600 underline mt-3 inline-block">
            나의 책 목록으로
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {SEASON_ORDER.map((season) => {
            const seasonBooks = bySeason[season];
            if (seasonBooks.length === 0) return null;
            return (
              <div key={season}>
                <p className="text-xs font-medium text-stone-400 mb-3">{SEASON_LABEL[season]}</p>
                <div className="grid grid-cols-2 gap-3">
                  {seasonBooks.map((book) => (
                    <Link
                      key={book.id}
                      href={`/books/${book.id}`}
                      className={`rounded-2xl p-4 border ${SEASON_BG[season]} hover:opacity-80 transition-opacity`}
                    >
                      <p className="text-3xl mb-2">{book.flower_emoji}</p>
                      <p className="text-xs font-medium text-stone-700 line-clamp-1">{book.flower_name}</p>
                      <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{book.flower_meaning}</p>
                      <p className="text-xs text-stone-500 mt-2 font-medium line-clamp-1">{book.title}</p>
                      {book.flower_reason && (
                        <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">{book.flower_reason}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link href="/" className="text-xs text-stone-400 hover:text-stone-600 transition-colors block text-center">
        ← 홈으로
      </Link>
    </div>
  );
}

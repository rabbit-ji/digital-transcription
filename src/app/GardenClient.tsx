"use client";
import Link from "next/link";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Season } from "@/lib/flowers";
import AdminLoginButton from "@/components/AdminLoginButton";

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

interface Props {
  books: GardenBook[];
  isAdmin: boolean;
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

export default function GardenClient({ books, isAdmin }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"garden" | "card">("garden");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/sync-flowers", { method: "POST" });
      const data = await res.json() as { synced: number; rematched: number };
      if (data.synced === 0 && data.rematched === 0) {
        setSyncResult("모두 최신 상태예요");
      } else {
        const parts = [
          data.synced > 0 && `이모지 ${data.synced}개 업데이트`,
          data.rematched > 0 && `새로 매칭 ${data.rematched}개`,
        ].filter(Boolean);
        setSyncResult(parts.join(", "));
      }
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }, [router]);

  const totalCount = books.length;
  const isGarden = viewMode === "garden";

  const bySeason = SEASON_ORDER.reduce<Record<Season, GardenBook[]>>(
    (acc, s) => ({ ...acc, [s]: [] }),
    {} as Record<Season, GardenBook[]>
  );
  for (const book of books) {
    bySeason[book.flower_season]?.push(book);
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={
        isGarden
          ? { background: "linear-gradient(180deg, #bfdbfe 0%, #d1fae5 45%, #bbf7d0 80%, #6ee7b7 100%)" }
          : { backgroundColor: "#fafaf9" }
      }
    >
      {/* 헤더 */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-3 w-full">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className={`text-2xl font-semibold ${isGarden ? "text-emerald-900" : "text-stone-800"}`}>
              생각의 정원
            </h1>
            <p className={`text-sm mt-1 ${isGarden ? "text-emerald-700/80" : "text-stone-400"}`}>
              소감을 쓴 책마다 꽃 한 송이
            </p>
            {totalCount > 0 && (
              <span className={`text-xs mt-0.5 block ${isGarden ? "text-emerald-600/70" : "text-stone-400"}`}>
                {totalCount}권의 책
              </span>
            )}
          </div>
          <nav className="flex flex-col items-end gap-2 pt-1 flex-shrink-0">
            <div className="flex gap-4">
              <Link
                href="/books"
                className={`text-sm transition-colors whitespace-nowrap ${
                  isGarden ? "text-emerald-800 hover:text-emerald-950" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                책 목록
              </Link>
              <Link
                href="/dictionary"
                className={`text-sm transition-colors whitespace-nowrap ${
                  isGarden ? "text-emerald-800 hover:text-emerald-950" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                인용 사전
              </Link>
            </div>
            {isAdmin && (
              <div className="text-right">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className={`text-xs transition-colors disabled:opacity-50 ${
                    isGarden ? "text-emerald-700/60 hover:text-emerald-900" : "text-stone-400 hover:text-stone-600"
                  }`}
                >
                  {syncing ? "동기화 중…" : "🔄 꽃 동기화"}
                </button>
                {syncResult && (
                  <p className={`text-xs mt-0.5 ${isGarden ? "text-emerald-700/60" : "text-stone-400"}`}>
                    {syncResult}
                  </p>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* 숏컷 - 새 책 추가 */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-3 w-full">
        <Link
          href="/books/new"
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl border text-sm transition-all ${
            isGarden
              ? "bg-white/50 border-emerald-200 text-emerald-800 hover:bg-white/70"
              : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
          }`}
        >
          <span className="text-base">📖</span>
          <span>오늘 읽은 책을 기록해볼까요?</span>
          <span className="ml-auto opacity-40 text-xs">→</span>
        </Link>
      </div>

      {/* 뷰 토글 */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-4 w-full">
        <div
          className={`inline-flex gap-1 p-1 rounded-xl ${isGarden ? "bg-white/30" : "bg-stone-100"}`}
        >
          <button
            onClick={() => setViewMode("garden")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isGarden
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-stone-400 hover:text-stone-600"
            }`}
          >
            🌿 정원
          </button>
          <button
            onClick={() => setViewMode("card")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !isGarden
                ? "bg-white text-stone-700 shadow-sm"
                : "text-emerald-700/60 hover:text-emerald-800"
            }`}
          >
            ☰ 목록
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      {totalCount === 0 ? (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-12 w-full">
          <div
            className={`rounded-2xl p-8 text-center ${
              isGarden ? "bg-white/40 border border-emerald-100" : "bg-stone-50 border border-stone-100"
            }`}
          >
            <p className="text-4xl mb-3">🌱</p>
            <p className={`text-sm ${isGarden ? "text-emerald-800" : "text-stone-500"}`}>
              아직 정원이 비어 있어요.
            </p>
            <p className={`text-xs mt-1 ${isGarden ? "text-emerald-600/70" : "text-stone-400"}`}>
              책 소감을 남기면 꽃이 피어납니다.
            </p>
            <Link
              href="/books"
              className={`text-xs underline mt-3 inline-block ${
                isGarden ? "text-emerald-700" : "text-stone-600"
              }`}
            >
              나의 책 목록으로
            </Link>
          </div>
        </div>
      ) : isGarden ? (
        /* 정원 모드 (B) - 꽃들이 정원에 자유롭게 펼쳐진 뷰 */
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-6 w-full">
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
            {books.map((book, i) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="flex flex-col items-center group"
                style={{ width: "76px", marginTop: `${(i % 4) * 12}px` }}
              >
                <span
                  className="text-5xl sm:text-6xl group-hover:scale-125 transition-transform duration-300 drop-shadow-md leading-none"
                  title={`${book.flower_name} — ${book.title}`}
                >
                  {book.flower_emoji}
                </span>
                <p className="text-[11px] font-semibold text-emerald-900 mt-2 text-center leading-snug">
                  {book.flower_name}
                </p>
                <p className="text-[10px] text-emerald-700/70 text-center line-clamp-1 max-w-[76px] leading-snug mt-0.5">
                  {book.title}
                </p>
              </Link>
            ))}
          </div>
          {/* 정원 바닥 장식 */}
          <div className="mt-8 flex justify-center">
            <span className="text-2xl opacity-20 select-none tracking-widest">
              🌿 🌱 🌿 🌱 🌿 🌱 🌿 🌱 🌿
            </span>
          </div>
        </div>
      ) : (
        /* 카드 모드 (A) - 계절별 카드 그리드 */
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-12 w-full">
          <div className="space-y-6">
            {SEASON_ORDER.map((season) => {
              const seasonBooks = bySeason[season];
              if (seasonBooks.length === 0) return null;
              return (
                <div key={season}>
                  <p className="text-xs font-medium text-stone-400 mb-3">{SEASON_LABEL[season]}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                          <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                            {book.flower_reason}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-auto">
        <AdminLoginButton isAdmin={isAdmin} />
      </div>
    </div>
  );
}

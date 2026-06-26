"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Book {
  id: number;
  title: string;
  author: string | null;
  cover_url: string | null;
  review: string | null;
  flower_name: string | null;
  flower_meaning: string | null;
  flower_season: string | null;
  flower_emoji: string | null;
  flower_reason: string | null;
  first_sentence: string | null;
  last_sentence: string | null;
  recorded_at: string | null;
}

interface Passage {
  id: number;
  content: string;
  page: number | null;
  created_at: string;
}

interface SimilarPassage {
  id: number;
  content: string;
  page: number | null;
  book_id: number;
  book_title: string;
  distance: number;
}

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [passageContent, setPassageContent] = useState("");
  const [passagePage, setPassagePage] = useState("");
  const [addingPassage, setAddingPassage] = useState(false);

  const [expandedSimilarId, setExpandedSimilarId] = useState<number | null>(null);
  const [similarPassages, setSimilarPassages] = useState<Record<number, SimilarPassage[]>>({});
  const [loadingSimilarId, setLoadingSimilarId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/books/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setBook(data.book as Book);
        setPassages(data.passages as Passage[]);
      })
      .catch(() => setError("책 정보를 불러오지 못했어요"))
      .finally(() => setLoading(false));
  }, [id]);

  async function addPassage() {
    if (!passageContent.trim()) return;
    setAddingPassage(true);
    try {
      const res = await fetch("/api/passages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: id,
          content: passageContent.trim(),
          page: passagePage ? Number(passagePage) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPassages((prev) => [...prev, data.passage as Passage]);
      setPassageContent("");
      setPassagePage("");
    } finally {
      setAddingPassage(false);
    }
  }

  async function deletePassage(passageId: number) {
    await fetch(`/api/passages/${passageId}`, { method: "DELETE" });
    setPassages((prev) => prev.filter((p) => p.id !== passageId));
  }

  async function toggleSimilar(passageId: number) {
    if (expandedSimilarId === passageId) {
      setExpandedSimilarId(null);
      return;
    }
    setExpandedSimilarId(passageId);
    if (similarPassages[passageId]) return;
    setLoadingSimilarId(passageId);
    try {
      const res = await fetch(`/api/passages/similar?passage_id=${passageId}`);
      const data = await res.json();
      setSimilarPassages((prev) => ({ ...prev, [passageId]: data.similar ?? [] }));
    } finally {
      setLoadingSimilarId(null);
    }
  }

  if (loading) return <div className="max-w-2xl mx-auto p-4 sm:p-6 text-stone-400">불러오는 중…</div>;
  if (error || !book) return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <p className="text-red-500">{error || "책을 찾을 수 없어요"}</p>
      <Link href="/books" className="text-sm text-stone-500 underline mt-2 inline-block">목록으로</Link>
    </div>
  );

  const formattedDate = book.recorded_at
    ? String(book.recorded_at).substring(0, 10).replace(/-/g, ".")
    : null;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="text-stone-400 hover:text-stone-600 text-sm mt-1 cursor-pointer flex-shrink-0">←</button>
        {book.cover_url ? (
          <img src={book.cover_url} alt="" className="w-16 h-22 object-cover rounded-lg shadow flex-shrink-0" />
        ) : (
          <div className="w-16 h-22 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 text-xs flex-shrink-0">표지</div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-stone-800">{book.title}</h1>
          {book.author && <p className="text-sm text-stone-500 mt-0.5">{book.author}</p>}
          {formattedDate && <p className="text-xs text-stone-400 mt-1">📅 {formattedDate}</p>}
        </div>
        <Link
          href={`/books/${id}/edit`}
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0 mt-1"
        >
          편집
        </Link>
      </div>

      {/* 꽃 카드 */}
      {book.flower_emoji && (
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
          <p className="text-3xl mb-2">{book.flower_emoji}</p>
          <p className="font-medium text-stone-800">{book.flower_name}</p>
          {book.flower_meaning && <p className="text-sm text-stone-500 mt-0.5">꽃말: {book.flower_meaning}</p>}
          {book.flower_season && <p className="text-xs text-stone-400 mt-0.5">{book.flower_season}</p>}
          {book.flower_reason && <p className="text-sm text-stone-600 mt-2 italic">{book.flower_reason}</p>}
        </div>
      )}

      {/* 소감 */}
      {book.review && (
        <div>
          <h2 className="text-sm font-medium text-stone-600 mb-2">📝 나의 소감</h2>
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap bg-stone-50 rounded-2xl p-4 border border-stone-100">{book.review}</p>
        </div>
      )}

      {/* 첫 문장 */}
      {book.first_sentence && (
        <div>
          <h2 className="text-sm font-medium text-stone-600 mb-2">📖 첫 문장</h2>
          <div className="border-l-2 border-stone-200 pl-4">
            <p className="text-sm text-stone-700 leading-relaxed">{book.first_sentence}</p>
          </div>
        </div>
      )}

      {/* 필사 목록 */}
      <div>
        <h2 className="text-sm font-medium text-stone-600 mb-3">✍️ 필사 ({passages.length})</h2>
        {passages.length === 0 ? (
          <p className="text-stone-400 text-sm py-4 text-center">아직 필사된 구절이 없어요.</p>
        ) : (
          <div className="space-y-3">
            {passages.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-stone-100 p-4 relative group">
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">{p.content}</p>
                {p.page && <p className="text-xs text-stone-400 mt-2">p. {p.page}</p>}
                <button
                  onClick={() => deletePassage(p.id)}
                  className="absolute top-3 right-3 text-xs text-stone-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  삭제
                </button>
                <button
                  onClick={() => toggleSimilar(p.id)}
                  className="mt-3 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {expandedSimilarId === p.id ? "▲ 닫기" : "✦ 연결된 구절"}
                </button>
                {expandedSimilarId === p.id && (
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    {loadingSimilarId === p.id ? (
                      <p className="text-xs text-stone-400">찾는 중…</p>
                    ) : (similarPassages[p.id]?.length ?? 0) === 0 ? (
                      <p className="text-xs text-stone-400">연결된 구절이 없어요.</p>
                    ) : (
                      <div className="space-y-2">
                        {similarPassages[p.id].map((s) => (
                          <Link
                            key={s.id}
                            href={`/books/${s.book_id}`}
                            className="block bg-stone-50 rounded-xl p-3 hover:bg-stone-100 transition-colors"
                          >
                            <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">{s.content}</p>
                            <p className="text-xs text-stone-400 mt-1">{s.book_title}{s.page ? ` · p.${s.page}` : ""}</p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 마지막 문장 */}
      {book.last_sentence && (
        <div>
          <h2 className="text-sm font-medium text-stone-600 mb-2">📖 마지막 문장</h2>
          <div className="border-l-2 border-stone-200 pl-4">
            <p className="text-sm text-stone-700 leading-relaxed">{book.last_sentence}</p>
          </div>
        </div>
      )}

      {/* 필사 추가 폼 */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-stone-600">✍️ 필사 추가</h2>
        <textarea
          value={passageContent}
          onChange={(e) => setPassageContent(e.target.value)}
          placeholder="밑줄 그은 구절을 입력하세요…"
          rows={3}
          className="w-full border border-stone-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={passagePage}
            onChange={(e) => setPassagePage(e.target.value)}
            placeholder="페이지 (선택)"
            className="w-32 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
          <button
            onClick={addPassage}
            disabled={addingPassage || !passageContent.trim()}
            className="flex-1 bg-stone-800 text-white py-2 rounded-xl text-sm disabled:opacity-50 hover:bg-stone-700 transition-colors"
          >
            {addingPassage ? "저장 중…" : "+ 필사 추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  const [review, setReview] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const [firstSentence, setFirstSentence] = useState("");
  const [lastSentence, setLastSentence] = useState("");
  const [savingSentences, setSavingSentences] = useState(false);

  const [recordedAt, setRecordedAt] = useState("");
  const [savingDate, setSavingDate] = useState(false);

  const [passageContent, setPassageContent] = useState("");
  const [passagePage, setPassagePage] = useState("");
  const [addingPassage, setAddingPassage] = useState(false);

  const [deletingBook, setDeletingBook] = useState(false);

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
        setReview(data.book.review ?? "");
        setFirstSentence(data.book.first_sentence ?? "");
        setLastSentence(data.book.last_sentence ?? "");
        setRecordedAt(data.book.recorded_at ? String(data.book.recorded_at).substring(0, 10) : "");
      })
      .catch(() => setError("책 정보를 불러오지 못했어요"))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveDate() {
    if (!recordedAt) return;
    setSavingDate(true);
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recorded_at: recordedAt }),
      });
      const data = await res.json();
      if (res.ok) setBook(data.book as Book);
    } finally {
      setSavingDate(false);
    }
  }

  async function saveSentences() {
    setSavingSentences(true);
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_sentence: firstSentence, last_sentence: lastSentence }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBook(data.book as Book);
    } finally {
      setSavingSentences(false);
    }
  }

  async function saveReview() {
    if (!book) return;
    setSavingReview(true);
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBook(data.book as Book);
    } finally {
      setSavingReview(false);
    }
  }

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

  async function deleteBook() {
    if (!confirm("정말 이 책을 삭제할까요? 모든 필사 내용도 함께 삭제됩니다.")) return;
    setDeletingBook(true);
    await fetch(`/api/books/${id}`, { method: "DELETE" });
    router.push("/books");
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

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="text-stone-400 hover:text-stone-600 text-sm mt-1 cursor-pointer">←</button>
        {book.cover_url ? (
          <img src={book.cover_url} alt="" className="w-16 h-22 object-cover rounded-lg shadow flex-shrink-0" />
        ) : (
          <div className="w-16 h-22 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 text-xs flex-shrink-0">표지</div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-stone-800">{book.title}</h1>
          {book.author && <p className="text-sm text-stone-500 mt-0.5">{book.author}</p>}
        </div>
        <button
          onClick={deleteBook}
          disabled={deletingBook}
          className="text-xs text-stone-400 hover:text-red-400 transition-colors flex-shrink-0"
        >
          삭제
        </button>
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

      {/* 등록일자 편집 */}
      <div>
        <h2 className="text-sm font-medium text-stone-600 mb-2">📅 등록일자</h2>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
          <button
            onClick={saveDate}
            disabled={savingDate || !recordedAt}
            className="bg-stone-800 text-white px-4 py-2 rounded-xl text-sm disabled:opacity-50 hover:bg-stone-700 transition-colors whitespace-nowrap"
          >
            {savingDate ? "저장 중…" : "날짜 저장"}
          </button>
        </div>
        <p className="text-xs text-stone-400 mt-1">날짜를 바꾸면 해당 계절의 꽃으로 다시 지정돼요.</p>
      </div>

      {/* 첫 문장 / 마지막 문장 */}
      <div>
        <h2 className="text-sm font-medium text-stone-600 mb-3">📖 첫 문장 · 마지막 문장</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-stone-400 mb-1">첫 문장</p>
            <textarea
              value={firstSentence}
              onChange={(e) => setFirstSentence(e.target.value)}
              placeholder="책의 첫 문장을 기록해두세요…"
              rows={2}
              className="w-full border border-stone-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>
          <div>
            <p className="text-xs text-stone-400 mb-1">마지막 문장</p>
            <textarea
              value={lastSentence}
              onChange={(e) => setLastSentence(e.target.value)}
              placeholder="책의 마지막 문장을 기록해두세요…"
              rows={2}
              className="w-full border border-stone-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>
          <button
            onClick={saveSentences}
            disabled={savingSentences}
            className="bg-stone-800 text-white px-4 py-2 rounded-xl text-sm disabled:opacity-50 hover:bg-stone-700 transition-colors"
          >
            {savingSentences ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {/* 소감 */}
      <div>
        <h2 className="text-sm font-medium text-stone-600 mb-2">📝 나의 소감</h2>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="이 책에 대한 소감을 적어보세요…"
          rows={4}
          className="w-full border border-stone-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
        <button
          onClick={saveReview}
          disabled={savingReview}
          className="mt-2 bg-stone-800 text-white px-4 py-2 rounded-xl text-sm disabled:opacity-50 hover:bg-stone-700 transition-colors"
        >
          {savingReview ? "저장 중…" : "소감 저장"}
        </button>
      </div>

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

        {/* 필사 추가 폼 */}
        <div className="mt-4 space-y-2">
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
    </div>
  );
}

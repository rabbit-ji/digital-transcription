"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface NaverBook {
  title: string;
  author: string;
  isbn: string;
  image: string;
  description: string;
  pubdate: string;
}

interface PendingPassage {
  content: string;
  page: string;
}

type Step = "search" | "form";

export default function NewBookPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NaverBook[]>([]);
  const [selected, setSelected] = useState<NaverBook | null>(null);
  const [step, setStep] = useState<Step>("search");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [recordedAt, setRecordedAt] = useState("");
  const [review, setReview] = useState("");
  const [firstSentence, setFirstSentence] = useState("");
  const [lastSentence, setLastSentence] = useState("");
  const [passages, setPassages] = useState<PendingPassage[]>([]);
  const [passageContent, setPassageContent] = useState("");
  const [passagePage, setPassagePage] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setResults([]);
    setSelected(null);
    try {
      const res = await fetch(`/api/books/cover?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색 실패");
      setResults(data.books ?? []);
      if ((data.books ?? []).length === 0) {
        setError("검색 결과가 없어요. 제목을 직접 입력해서 추가할 수도 있어요.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색 중 오류가 발생했어요");
    } finally {
      setSearching(false);
    }
  }

  function handleSelect(book: NaverBook) {
    setSelected(book);
    setStep("form");
    setError("");
  }

  function handleManualAdd() {
    if (!query.trim()) {
      setError("책 제목을 입력해주세요");
      return;
    }
    setSelected(null);
    setStep("form");
    setError("");
  }

  function addPassage() {
    if (!passageContent.trim()) return;
    setPassages((prev) => [...prev, { content: passageContent.trim(), page: passagePage }]);
    setPassageContent("");
    setPassagePage("");
  }

  function removePassage(index: number) {
    setPassages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const bookBody = selected
        ? { title: selected.title, author: selected.author, isbn: selected.isbn, cover_url: selected.image }
        : { title: query.trim() };
      const bookRes = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookBody),
      });
      const bookData = await bookRes.json();
      if (!bookRes.ok) throw new Error(bookData.error ?? "추가 실패");
      const bookId = bookData.book.id;

      if (passages.length > 0) {
        await Promise.all(
          passages.map((p) =>
            fetch("/api/passages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                book_id: bookId,
                content: p.content,
                page: p.page ? Number(p.page) : undefined,
              }),
            })
          )
        );
      }

      if (review.trim() || firstSentence.trim() || lastSentence.trim() || recordedAt) {
        const patchRes = await fetch(`/api/books/${bookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review: review.trim() || null,
            first_sentence: firstSentence.trim() || null,
            last_sentence: lastSentence.trim() || null,
            recorded_at: recordedAt || null,
          }),
        });
        if (!patchRes.ok) {
          const d = await patchRes.json();
          throw new Error(d.error ?? "저장 실패");
        }
      }

      router.replace(`/books/${bookId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했어요");
      setSubmitting(false);
    }
  }

  if (step === "form") {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { setStep("search"); setError(""); }}
            className="text-stone-400 hover:text-stone-600 text-sm cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-base font-semibold text-stone-800">책 정보 입력</h1>
            <p className="text-xs text-stone-400 mt-0.5 truncate max-w-xs">
              {selected ? selected.title : query.trim()}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 mb-6">{error}</p>
        )}

        <div className="lg:grid lg:grid-cols-2 lg:gap-12">
          {/* 왼쪽: 메타데이터 */}
          <div className="space-y-6">
            {selected && (
              <div className="flex gap-3 bg-stone-50 rounded-2xl p-4 border border-stone-100">
                {selected.image ? (
                  <img src={selected.image} alt="" className="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0" />
                ) : (
                  <div className="w-12 h-16 bg-stone-100 rounded flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 line-clamp-2">{selected.title}</p>
                  {selected.author && <p className="text-xs text-stone-500 mt-0.5">{selected.author}</p>}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-stone-600">📅 등록일자</label>
              <input
                type="date"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
              <p className="text-xs text-stone-400">날짜에 따라 어울리는 계절 꽃이 지정돼요.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-stone-600">📝 나의 소감</label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="이 책에 대한 소감을 자유롭게 적어보세요"
                rows={6}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
              <p className="text-xs text-stone-400">소감을 바탕으로 어울리는 꽃이 선정돼요.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-stone-600">📖 첫 문장</label>
              <textarea
                value={firstSentence}
                onChange={(e) => setFirstSentence(e.target.value)}
                placeholder="책의 첫 문장을 입력하세요"
                rows={3}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>

          </div>

          {/* 오른쪽: 필사 + 마지막 문장 */}
          <div className="mt-8 lg:mt-0 pt-8 lg:pt-0 border-t lg:border-t-0 border-stone-100 space-y-6">
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-stone-600">✍️ 필사 ({passages.length})</h2>

              {passages.length > 0 && (
                <div className="space-y-2">
                  {passages.map((p, i) => (
                    <div key={i} className="bg-stone-50 rounded-xl border border-stone-100 p-3 relative group">
                      <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap pr-8">{p.content}</p>
                      {p.page && <p className="text-xs text-stone-400 mt-1">p. {p.page}</p>}
                      <button
                        onClick={() => removePassage(i)}
                        className="absolute top-3 right-3 text-xs text-stone-300 hover:text-red-400 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <textarea
                  value={passageContent}
                  onChange={(e) => setPassageContent(e.target.value)}
                  placeholder="밑줄 그은 구절을 입력하세요…"
                  rows={3}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-300"
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
                    disabled={!passageContent.trim()}
                    className="flex-1 bg-stone-100 text-stone-700 py-2 rounded-xl text-sm disabled:opacity-50 hover:bg-stone-200 transition-colors"
                  >
                    + 필사 추가
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-stone-600">📖 마지막 문장</label>
              <textarea
                value={lastSentence}
                onChange={(e) => setLastSentence(e.target.value)}
                placeholder="책의 마지막 문장을 입력하세요"
                rows={3}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-stone-100">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-stone-800 text-white py-3 rounded-2xl font-medium disabled:opacity-50 hover:bg-stone-700 transition-colors"
          >
            {submitting ? "저장 중…" : "저장하기"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-8 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-stone-400 hover:text-stone-600 text-sm cursor-pointer">←</button>
        <h1 className="text-2xl font-semibold text-stone-800">책 추가</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="책 제목 또는 저자로 검색"
          className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="bg-stone-800 text-white px-4 py-2.5 rounded-xl text-sm disabled:opacity-50 hover:bg-stone-700 transition-colors"
        >
          {searching ? "검색 중…" : "검색"}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-2 mb-6">
          {results.map((book) => (
            <button
              key={book.isbn || book.title}
              onClick={() => handleSelect(book)}
              className="w-full flex gap-3 p-3 rounded-2xl border border-stone-200 hover:border-stone-400 text-left transition-colors"
            >
              {book.image ? (
                <img src={book.image} alt="" className="w-10 h-14 object-cover rounded shadow-sm flex-shrink-0" />
              ) : (
                <div className="w-10 h-14 bg-stone-100 rounded flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 line-clamp-2">{book.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">{book.author}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {query.trim() && (
        <button
          onClick={handleManualAdd}
          className="w-full py-3 rounded-2xl text-sm text-stone-500 border border-stone-200 hover:bg-stone-50 transition-colors"
        >
          &ldquo;{query.trim()}&rdquo; 직접 추가하기
        </button>
      )}
    </div>
  );
}

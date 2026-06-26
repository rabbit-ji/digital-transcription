"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BookData {
  title: string;
  review: string | null;
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

export default function BookEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [bookTitle, setBookTitle] = useState("");
  const [review, setReview] = useState("");
  const [firstSentence, setFirstSentence] = useState("");
  const [lastSentence, setLastSentence] = useState("");
  const [recordedAt, setRecordedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingBook, setDeletingBook] = useState(false);
  const [error, setError] = useState("");

  const [passages, setPassages] = useState<Passage[]>([]);
  const [passageContent, setPassageContent] = useState("");
  const [passagePage, setPassagePage] = useState("");
  const [addingPassage, setAddingPassage] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        const book = data.book as BookData;
        setBookTitle(book.title);
        setReview(book.review ?? "");
        setFirstSentence(book.first_sentence ?? "");
        setLastSentence(book.last_sentence ?? "");
        setRecordedAt(book.recorded_at ? String(book.recorded_at).substring(0, 10) : "");
        setPassages(data.passages as Passage[]);
      })
      .catch(() => setError("책 정보를 불러오지 못했어요"))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review,
          first_sentence: firstSentence,
          last_sentence: lastSentence,
          recorded_at: recordedAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      router.push(`/books/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했어요");
      setSaving(false);
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
    if (!confirm(`"${bookTitle}" 책을 삭제할까요? 필사 기록도 모두 사라져요.`)) return;
    setDeletingBook(true);
    try {
      await fetch(`/api/books/${id}`, { method: "DELETE" });
      router.push("/books");
    } finally {
      setDeletingBook(false);
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto p-4 sm:p-6 text-stone-400">불러오는 중…</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-stone-400 hover:text-stone-600 text-sm cursor-pointer"
        >
          ←
        </button>
        <div>
          <h1 className="text-base font-semibold text-stone-800">편집</h1>
          {bookTitle && <p className="text-xs text-stone-400 mt-0.5">{bookTitle}</p>}
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 mb-6">{error}</p>}

      {/* PC: 2단 레이아웃 */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-12">
        {/* 왼쪽: 메타데이터 폼 + 액션 */}
        <div className="space-y-6">
          {/* 등록일자 */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-stone-600">📅 등록일자</label>
            <input
              type="date"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
            <p className="text-xs text-stone-400">날짜를 바꾸면 해당 계절의 꽃이 새로 지정돼요.</p>
          </div>

          {/* 소감 */}
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

          {/* 첫 문장 */}
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
                {passages.map((p) => (
                  <div key={p.id} className="bg-stone-50 rounded-xl border border-stone-100 p-3 relative group">
                    <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap pr-8">{p.content}</p>
                    {p.page && <p className="text-xs text-stone-400 mt-1">p. {p.page}</p>}
                    <button
                      onClick={() => deletePassage(p.id)}
                      className="absolute top-3 right-3 text-xs text-stone-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 필사 추가 폼 */}
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
                  disabled={addingPassage || !passageContent.trim()}
                  className="flex-1 bg-stone-100 text-stone-700 py-2 rounded-xl text-sm disabled:opacity-50 hover:bg-stone-200 transition-colors"
                >
                  {addingPassage ? "저장 중…" : "+ 필사 추가"}
                </button>
              </div>
            </div>
          </div>

          {/* 마지막 문장 */}
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

      {/* 저장 / 취소 + 삭제 */}
      <div className="mt-8 pt-6 border-t border-stone-100 space-y-3">
        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-stone-800 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-stone-700 transition-colors"
          >
            {saving ? "저장 중…" : "저장하기"}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-xl text-sm text-stone-500 border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            취소
          </button>
        </div>
        <button
          onClick={deleteBook}
          disabled={deletingBook}
          className="w-full py-3 rounded-xl text-sm text-red-400 border border-red-100 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deletingBook ? "삭제 중…" : "책 삭제"}
        </button>
      </div>
    </div>
  );
}

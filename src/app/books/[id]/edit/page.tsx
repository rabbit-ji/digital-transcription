"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BookData {
  review: string | null;
  first_sentence: string | null;
  last_sentence: string | null;
  recorded_at: string | null;
  title: string;
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

  if (loading) return <div className="max-w-2xl mx-auto p-4 sm:p-6 text-stone-400">불러오는 중…</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-16 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
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

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

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

      {/* 저장 / 취소 */}
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

      {/* 책 삭제 */}
      <div className="pt-4 border-t border-stone-100">
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

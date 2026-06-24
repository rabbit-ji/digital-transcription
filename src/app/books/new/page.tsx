"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface NaverBook {
  title: string;
  author: string;
  isbn: string;
  image: string;
  description: string;
  pubdate: string;
}

export default function NewBookPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NaverBook[]>([]);
  const [selected, setSelected] = useState<NaverBook | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
        setError("검색 결과가 없어요. 직접 입력해서 추가할 수 있어요.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색 중 오류가 발생했어요");
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit() {
    if (!selected && !query.trim()) {
      setError("책 제목을 입력해주세요");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body = selected
        ? { title: selected.title, author: selected.author, isbn: selected.isbn, cover_url: selected.image }
        : { title: query.trim() };
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "추가 실패");
      router.push(`/books/${data.book.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "추가 중 오류가 발생했어요");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/books" className="text-stone-400 hover:text-stone-600 text-sm">←</Link>
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
              onClick={() => setSelected(book)}
              className={`w-full flex gap-3 p-3 rounded-2xl border text-left transition-colors ${
                selected?.isbn === book.isbn && selected?.title === book.title
                  ? "border-stone-800 bg-stone-50"
                  : "border-stone-200 hover:border-stone-400"
              }`}
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

      {(selected || query.trim()) && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-stone-800 text-white py-3 rounded-2xl font-medium disabled:opacity-50 hover:bg-stone-700 transition-colors"
        >
          {submitting
            ? "추가 중…"
            : selected
            ? `"${selected.title}" 추가하기`
            : `"${query.trim()}" 직접 추가하기`}
        </button>
      )}
    </div>
  );
}

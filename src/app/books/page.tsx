export const dynamic = "force-dynamic";

import Link from "next/link";
import { db, ensureSchema } from "@/lib/db";

export default async function BooksPage() {
  await ensureSchema();
  const result = await db().execute(
    "SELECT id, title, author, cover_url, flower_emoji, flower_name, recorded_at, created_at FROM books ORDER BY COALESCE(recorded_at, created_at) DESC"
  );
  const books = result.rows;

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 overflow-x-hidden">
      <div className="flex justify-between items-center mb-6 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0">
            ← 홈
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold text-stone-800 truncate">나의 책 목록</h1>
        </div>
        <Link
          href="/books/new"
          className="bg-stone-800 text-white px-3 sm:px-4 py-2 rounded-xl text-sm hover:bg-stone-700 transition-colors flex-shrink-0"
        >
          + 책 추가
        </Link>
      </div>

      {books.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-3">📖</p>
          <p>아직 기록된 책이 없어요.</p>
          <Link href="/books/new" className="text-sm text-stone-600 underline mt-2 inline-block">
            첫 번째 책 추가하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {books.map((book) => (
            <Link
              key={String(book.id)}
              href={`/books/${book.id}`}
              className="flex gap-3 p-3 sm:gap-4 sm:p-4 bg-white rounded-2xl border border-stone-100 hover:border-stone-300 transition-colors overflow-hidden"
            >
              {book.cover_url ? (
                <img
                  src={String(book.cover_url)}
                  alt=""
                  className="w-10 h-14 sm:w-12 sm:h-16 object-cover rounded shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-14 sm:w-12 sm:h-16 bg-stone-100 rounded flex items-center justify-center text-stone-400 text-xs flex-shrink-0">
                  표지
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800 truncate">{String(book.title)}</p>
                {book.author && (
                  <p className="text-sm text-stone-500 mt-0.5 truncate">{String(book.author)}</p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {book.flower_emoji && (
                    <span className="text-base leading-none">{String(book.flower_emoji)}</span>
                  )}
                  {book.flower_name && (
                    <span className="text-xs text-stone-500">{String(book.flower_name)}</span>
                  )}
                </div>
                {book.recorded_at && (
                  <p className="text-xs text-stone-400 mt-1">
                    {String(book.recorded_at).substring(0, 10).replace(/-/g, ".")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

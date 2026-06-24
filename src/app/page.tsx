import Link from "next/link";
import { db, ensureSchema } from "@/lib/db";

export default async function HomePage() {
  await ensureSchema();

  let todaySentence: { content: string; book_title: string } | null = null;
  try {
    const result = await db().execute(`
      SELECT p.content, b.title AS book_title
      FROM passages p
      JOIN books b ON b.id = p.book_id
      ORDER BY RANDOM()
      LIMIT 1
    `);
    if (result.rows[0]) {
      todaySentence = {
        content: String(result.rows[0].content),
        book_title: String(result.rows[0].book_title),
      };
    }
  } catch {
    // 아직 필사가 없는 경우 무시
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-8">
      <div className="pt-8">
        <h1 className="text-3xl font-semibold text-stone-800">📖</h1>
        <p className="text-stone-500 mt-1 text-sm">나의 독서 아카이브</p>
      </div>

      {todaySentence ? (
        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
          <p className="text-xs text-stone-400 mb-2">오늘의 한 문장</p>
          <p className="text-stone-700 leading-relaxed italic">"{todaySentence.content}"</p>
          <p className="text-xs text-stone-400 mt-3">— {todaySentence.book_title}</p>
        </div>
      ) : (
        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
          <p className="text-xs text-stone-400 mb-2">오늘의 한 문장</p>
          <p className="text-stone-400 text-sm">아직 필사된 구절이 없어요.</p>
          <Link href="/books/new" className="text-xs text-stone-600 underline mt-1 inline-block">
            첫 번째 필사 시작하기
          </Link>
        </div>
      )}

      <nav className="space-y-3">
        <Link
          href="/books"
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-100 hover:border-stone-300 transition-colors"
        >
          <div>
            <p className="font-medium text-stone-800">나의 책 목록</p>
            <p className="text-xs text-stone-400 mt-0.5">읽은 책과 필사 관리</p>
          </div>
          <span className="text-stone-300">→</span>
        </Link>
        <Link
          href="/garden"
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-100 hover:border-stone-300 transition-colors"
        >
          <div>
            <p className="font-medium text-stone-800">생각의 정원</p>
            <p className="text-xs text-stone-400 mt-0.5">책별 꽃으로 가득 찬 나의 정원</p>
          </div>
          <span className="text-stone-300">→</span>
        </Link>
        <Link
          href="/dictionary"
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-100 hover:border-stone-300 transition-colors"
        >
          <div>
            <p className="font-medium text-stone-800">나만의 인용 사전</p>
            <p className="text-xs text-stone-400 mt-0.5">태그별로 모아보는 필사 구절</p>
          </div>
          <span className="text-stone-300">→</span>
        </Link>
      </nav>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface TagInfo {
  id: number;
  name: string;
  count: number;
}

interface PassageWithBook {
  id: number;
  content: string;
  page: number | null;
  created_at: string;
  book_id: number;
  book_title: string;
  book_cover_url: string | null;
}

function DictionaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTag = searchParams.get("tag") ?? null;

  const [tags, setTags] = useState<TagInfo[]>([]);
  const [passages, setPassages] = useState<PassageWithBook[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setTags(d.tags ?? []));
  }, []);

  const fetchPassages = useCallback(async (tag: string) => {
    setLoading(true);
    const res = await fetch(`/api/passages/by-tag?tag=${encodeURIComponent(tag)}`);
    const data = await res.json();
    setPassages(data.passages ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedTag) fetchPassages(selectedTag);
    else setPassages([]);
  }, [selectedTag, fetchPassages]);

  const handleTag = (tag: string) => {
    if (selectedTag === tag) {
      router.push("/dictionary");
    } else {
      router.push(`/dictionary?tag=${encodeURIComponent(tag)}`);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-8">
      <div className="pt-8">
        <h1 className="text-2xl font-semibold text-stone-800">나만의 인용 사전</h1>
        <p className="text-stone-400 text-sm mt-1">태그로 필사를 모아보세요</p>
      </div>

      {tags.length === 0 ? (
        <div className="bg-stone-50 rounded-2xl p-8 text-center border border-stone-100">
          <p className="text-3xl mb-3">🏷️</p>
          <p className="text-stone-500 text-sm">아직 태그가 없어요.</p>
          <p className="text-stone-400 text-xs mt-1">필사를 추가하면 AI가 자동으로 태그를 붙여드려요.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTag(tag.name)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                selectedTag === tag.name
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {tag.name}
              <span className="ml-1 opacity-60">{tag.count}</span>
            </button>
          ))}
        </div>
      )}

      {selectedTag && (
        <div className="space-y-4">
          <p className="text-xs text-stone-400">
            <span className="font-medium text-stone-600">#{selectedTag}</span> 태그 필사
            {!loading && <span className="ml-1">({passages.length}개)</span>}
          </p>
          {loading ? (
            <div className="text-center text-stone-300 text-sm py-8">불러오는 중…</div>
          ) : passages.length === 0 ? (
            <div className="text-center text-stone-300 text-sm py-8">필사가 없어요.</div>
          ) : (
            <div className="space-y-3">
              {passages.map((p) => (
                <Link
                  key={p.id}
                  href={`/books/${p.book_id}`}
                  className="block bg-stone-50 rounded-2xl p-4 border border-stone-100 hover:bg-stone-100 transition-colors"
                >
                  <p className="text-sm text-stone-700 leading-relaxed line-clamp-3">{p.content}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {p.book_cover_url && (
                      <img src={p.book_cover_url} alt="" className="w-6 h-8 object-cover rounded" />
                    )}
                    <span className="text-xs text-stone-400 line-clamp-1">{p.book_title}</span>
                    {p.page && <span className="text-xs text-stone-300">p.{p.page}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <Link href="/" className="text-xs text-stone-400 hover:text-stone-600 transition-colors block text-center">
        ← 홈으로
      </Link>
    </div>
  );
}

export default function DictionaryPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto p-4 sm:p-6 pt-16 text-stone-300 text-sm text-center">불러오는 중…</div>}>
      <DictionaryContent />
    </Suspense>
  );
}

export interface NaverBook {
  title: string;
  author: string;
  isbn: string;
  image: string;
  description: string;
  pubdate: string;
}

export async function searchBooks(query: string): Promise<NaverBook[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 없습니다");
  }
  const url = `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=5`;
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });
  if (!res.ok) {
    throw new Error(`네이버 책 검색 실패: ${res.status}`);
  }
  const data = await res.json();
  return (data.items ?? []).map((item: Record<string, string>) => ({
    title: stripHtml(item.title ?? ""),
    author: stripHtml(item.author ?? ""),
    isbn: item.isbn ?? "",
    image: item.image ?? "",
    description: stripHtml(item.description ?? ""),
    pubdate: item.pubdate ?? "",
  }));
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

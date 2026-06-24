import { NextResponse } from "next/server";
import { searchBooks } from "@/lib/books-api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "q 파라미터가 필요합니다" }, { status: 400 });
  }
  try {
    const books = await searchBooks(query);
    return NextResponse.json({ books });
  } catch (err) {
    const message = err instanceof Error ? err.message : "검색 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

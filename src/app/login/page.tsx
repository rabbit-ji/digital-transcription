"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setLoading(false);
    if (r.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setErr("비밀번호가 올바르지 않아요");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm"
      >
        <h1 className="mb-1 text-xl font-semibold text-stone-800">독서 정원</h1>
        <p className="mb-6 text-sm text-stone-500">
          나만의 필사 아카이브에 들어가요
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="비밀번호"
          autoFocus
          className="mb-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 outline-none focus:border-stone-500"
        />
        {err && <p className="mb-3 text-sm text-red-500">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-stone-800 px-3 py-2 font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
        >
          {loading ? "확인 중…" : "들어가기"}
        </button>
      </form>
    </main>
  );
}

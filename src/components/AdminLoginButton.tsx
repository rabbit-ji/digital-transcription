"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  isAdmin: boolean;
}

export default function AdminLoginButton({ isAdmin }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("비밀번호가 틀렸어요");
        return;
      }
      setOpen(false);
      setPassword("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        {isAdmin ? (
          <button
            onClick={logout}
            className="text-xs text-stone-300 hover:text-stone-500 transition-colors px-2 py-1"
          >
            관리자 로그아웃
          </button>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="text-xs text-stone-200 hover:text-stone-400 transition-colors px-2 py-1"
          >
            관리자
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-16 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-6 w-full max-w-sm space-y-4">
            <h2 className="text-sm font-medium text-stone-700">관리자 로그인</h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") login(); }}
              placeholder="비밀번호"
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={login}
                disabled={loading || !password}
                className="flex-1 bg-stone-800 text-white py-2.5 rounded-xl text-sm disabled:opacity-50 hover:bg-stone-700 transition-colors"
              >
                {loading ? "확인 중…" : "로그인"}
              </button>
              <button
                onClick={() => { setOpen(false); setPassword(""); setError(""); }}
                className="px-4 py-2.5 rounded-xl text-sm text-stone-500 border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

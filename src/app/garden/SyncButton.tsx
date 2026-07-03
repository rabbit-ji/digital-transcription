"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SyncResult {
  ok?: boolean;
  rematched: number;
  remaining: number;
  quotaExceeded: boolean;
}

export function SyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sync-flowers", { method: "POST" });
      const data = (await res.json()) as SyncResult;
      setResult(data);

      if (data.quotaExceeded) {
        alert(
          `오늘의 AI 꽃 매칭 한도를 모두 사용했어요.\n` +
            `${data.rematched > 0 ? `${data.rematched}개는 매칭했고, ` : ""}` +
            `${data.remaining}개가 남았어요. 내일 다시 '꽃 동기화'를 눌러주세요.`
        );
      }
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  const resultText = result
    ? result.quotaExceeded
      ? `한도 초과 — ${result.remaining}개 남음`
      : result.rematched > 0
        ? `새로 매칭 ${result.rematched}개`
        : "모두 최신 상태예요"
    : null;

  return (
    <div>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="text-xs text-stone-400 hover:text-stone-600 disabled:opacity-50 transition-colors"
      >
        {syncing ? "동기화 중…" : "🔄 꽃 동기화"}
      </button>
      {resultText && <p className="text-xs text-stone-400 mt-0.5">{resultText}</p>}
    </div>
  );
}

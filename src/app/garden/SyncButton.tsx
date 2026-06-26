"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SyncResult {
  synced: number;
  rematched: number;
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
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  const resultText = result
    ? result.synced === 0 && result.rematched === 0
      ? "모두 최신 상태예요"
      : [
          result.synced > 0 && `이모지 ${result.synced}개 업데이트`,
          result.rematched > 0 && `새로 매칭 ${result.rematched}개`,
        ]
          .filter(Boolean)
          .join(", ")
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

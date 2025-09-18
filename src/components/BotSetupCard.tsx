// src/components/BotSetupCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChevronRight } from "lucide-react";

type Props = {
  refCode: string;
  isBotRunning?: boolean;               // 실행 중이면 카드/입력 비활성
  symbol?: string;                      // 부모 초기값(있으면 우선)
  entryAmount?: string | number;        // "
  onSaved?: (next: { symbol: string; entryAmount: number }) => void; // 저장 후 부모 갱신
};

export default function BotSetupCard({
  refCode,
  isBotRunning = false,
  symbol,
  entryAmount,
  onSaved,
}: Props) {
  // 모달
  const [open, setOpen] = useState(false);

  // 로컬 입력값
  const [sym, setSym] = useState(symbol ?? "XRPUSDT");
  const [amount, setAmount] = useState(
    entryAmount !== undefined ? String(entryAmount) : "50"
  );

  const [loading, setLoading] = useState(false);

  // 부모에서 값이 안 온 경우 1회 로드
  useEffect(() => {
    if (!refCode) return;
    if (symbol !== undefined || entryAmount !== undefined) return;

    (async () => {
      const { data, error } = await supabase
        .from("bot_settings")
        .select("symbol, entry_amount")
        .eq("ref_code", refCode)
        .maybeSingle();

      if (!error && data) {
        setSym(data.symbol ?? "XRPUSDT");
        setAmount(String(data.entry_amount ?? 50));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refCode]);

  const summary = useMemo(
    () => `${sym} / 진입 ${amount}`,
    [sym, amount]
  );

  async function handleSave() {
    if (!refCode) return;

    const n = parseFloat(amount);
    if (!sym || isNaN(n) || n <= 0) {
      alert("❗ 유효한 심볼/수량을 입력하세요.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("bot_settings")
      .upsert(
        {
          ref_code: refCode,
          symbol: sym,
          entry_amount: n,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "ref_code" }
      );
    setLoading(false);

    if (error) {
      console.error("세팅 저장 실패:", error.message);
      alert("❌ 세팅 저장 실패");
      return;
    }
    onSaved?.({ symbol: sym, entryAmount: n });
    alert("✅ 세팅 저장 완료");
    setOpen(false);
  }

  const cardDisabled = isBotRunning;

  return (
    <>
      {/* 카드 */}
      <div
        onClick={() => !cardDisabled && setOpen(true)}
        className={`bg-white border rounded-xl px-4 py-3 flex items-center justify-between
        ${cardDisabled ? "opacity-50 pointer-events-none border-gray-200" : "cursor-pointer border-gray-200"}`}
      >
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-800">봇 세팅하기</span>
          <span className="text-xs text-gray-500">{summary}</span>
        </div>
        <ChevronRight className="text-gray-400" />
      </div>

      {/* 모달 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl w-[90%] max-w-md p-6 space-y-4 shadow-lg">
            <h2 className="text-lg font-bold">봇 세팅</h2>

            <div>
              <label className="block text-sm font-medium mb-1">거래 심볼</label>
              <select
                value={sym}
                onChange={(e) => setSym(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="XRPUSDT">XRP/USDT</option>
                {/* 필요 시 심볼 추가 */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">진입 금액(코인 수량)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="any"
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                자산 1000 USDT 기준 50 XRP 진입. 자산 규모에 맞게 비례 조정하세요.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
              >
                {loading ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// src/app/bot/coinw-connect/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ShieldCheck } from "lucide-react";

// ❗ 정적 프리렌더 단계에서 useSearchParams로 인한 오류 회피
export const dynamic = "force-dynamic";

function CoinWConnectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? "";

  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState(false);

  const disabled = loading || !refCode || !apiKey || !secretKey;

  async function handleSave() {
    if (!refCode) {
      alert("초대코드(ref)가 없습니다. 이전 단계에서 다시 시도해주세요.");
      return;
    }
    if (!apiKey || !secretKey) {
      alert("API Key와 Secret Key를 모두 입력하세요.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("bot_settings")
        .upsert(
          {
            ref_code: refCode,
            api_key: apiKey,
            secret_key: secretKey,
            updated_at: new Date().toISOString(), // 필요시 KST 함수로 교체
          },
          { onConflict: "ref_code" }
        );

      if (error) {
        alert("저장 실패: " + error.message);
        return;
      }

      alert("저장 완료!");
      router.replace(`/bot?ref=${encodeURIComponent(refCode)}`);
    } catch (e: any) {
      alert("저장 중 오류가 발생했습니다.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-md rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h1 className="font-semibold text-gray-800">CoinW API 키 등록</h1>
        </div>

        {refCode ? (
          <p className="text-xs text-gray-500 mb-3">
            초대코드: <span className="font-medium">{refCode}</span>
          </p>
        ) : (
          <p className="text-xs text-red-600 mb-3">
            초대코드(ref) 파라미터가 없습니다. 이전 단계에서 다시 진입해주세요.
          </p>
        )}

        <div className="space-y-3">
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value.trim())}
            placeholder="API Key"
            autoComplete="off"
            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
          />
          <input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value.trim())}
            placeholder="Secret Key"
            autoComplete="new-password"
            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={disabled}
          className="mt-4 w-full py-2 bg-blue-600 text-white font-semibold rounded-lg
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </div>
  );
}

export default function CoinWConnectPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">로딩중…</div>}>
      <CoinWConnectInner />
    </Suspense>
  );
}

// src/app/deposit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Copy } from "lucide-react";
import { useActiveAccount } from "thirdweb/react";
import TopBar from "@/components/TopBar";

export default function DepositPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const [copied, setCopied] = useState(false);

  const depositAddress = account?.address || "0x000...000"; // 연결된 지갑 주소

  const handleCopy = async () => {
    if (depositAddress) {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="min-h-screen bg-[#eef2f6] pb-10">
      <TopBar
  title="입금하기"
  showBack={true} // ✅ 꼭 필요
  onBack={() => router.push("/store")} // ✅ 스토어 페이지 이동
/>


      <div className="max-w-md mx-auto mt-5 px-4">
        {/* 상단 자산 박스 */}
        <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/tether-icon.png" alt="USDT" className="w-7 h-7" />
            <span className="text-gray-700 font-semibold">Tether</span>
          </div>
          <span className="text-gray-900 font-bold">30 USDT</span> {/* 필요 시 동적 */}
        </div>

        {/* 주소 박스 */}
        <div className="bg-white rounded-xl shadow mt-4 px-4 py-3 text-center">
          <p className="text-xs text-gray-600 break-all">{depositAddress}</p>
          <p className="text-[12px] text-gray-500 mt-2">
            해당 주소는 <strong>POLYGON</strong> 네트워크를 지원합니다.
            <br />
            그 외 네트워크로는 자산 입금이 <span className="text-red-500 font-semibold">불가능</span>합니다.
          </p>
          <button
            onClick={handleCopy}
            className="mt-3 w-full py-2 rounded-md bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600"
          >
            주소 복사하기
          </button>
        </div>

        {/* 복사 확인 */}
        {copied && (
          <div className="mt-5 w-full bg-gray-700 text-white text-sm font-medium py-2 rounded-full text-center">
            복사가 완료되었습니다
          </div>
        )}
      </div>
    </main>
  );
}

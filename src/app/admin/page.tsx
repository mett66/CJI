// src/app/admin/page.tsx

"use client";

import AdminAuth from "@/components/AdminAuth";
import ManualRewardPanel from "@/components/admin/ManualRewardPanel";
import { useState } from "react";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCalculateRewards = async () => {
    setLoading(true);
    setMessage("리워드 계산 중...");
    const res = await fetch("/api/admin/calculate-rewards", { method: "POST" });
    const data = await res.json();
    setMessage(data.message || "리워드 계산 완료");
    setLoading(false);
  };

  const handleSendRewards = async () => {
    setLoading(true);
    setMessage("리워드 송금 중...");
    const res = await fetch("/api/admin/send-rewards", { method: "POST" });
    const data = await res.json();
    setMessage(data.message || "리워드 송금 완료");
    setLoading(false);
  };

  return (
    <AdminAuth>
      <div className="space-y-8">
        {/* 상단 관리자 요약 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">📊 관리자 대시보드</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>총 유저 수</li>
            <li>총 보유 NFT 수</li>
            <li>누적 리워드 지급액</li>
            <li>대기 중인 출금 요청 수</li>
          </ul>
        </div>

        {/* ✅ 수동 송금 패널 */}
        <ManualRewardPanel />

        {/* ✅ 리워드 계산 / 송금 버튼 */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold">🛠 리워드 자동 처리</h3>

          <button
            onClick={handleCalculateRewards}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
          >
            📊 리워드 계산
          </button>

          <button
            onClick={handleSendRewards}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
          >
            💸 리워드 송금
          </button>

          {message && (
            <p className="text-sm text-gray-500 mt-2 text-center">{message}</p>
          )}
        </div>
      </div>
    </AdminAuth>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function InviteDetailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const refCode = searchParams.get("code");

  const [name, setName] = useState("");
  const [membership, setMembership] = useState<any | null>(null);
  const [history, setHistory] = useState<{ date: string; amount: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!refCode) return;

      // 유저 name 조회
      const { data: user } = await supabase
        .from("users")
        .select("name")
        .eq("ref_code", refCode)
        .maybeSingle();

      if (user?.name) setName(user.name);

      // 멤버십 가입현황 조회
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("*")
        .eq("ref_code", refCode)
        .order("created_at", { ascending: false })
        .limit(1);

      if (enrollments && enrollments.length > 0) {
        setMembership(enrollments[0]);
      } else {
        setMembership(null);
      }

      // 리워드 내역 조회
      const { data: historyData, error: historyError } = await supabase
        .from("reward_transfers")
        .select("created_at, total_amount")
        .eq("ref_code", refCode)
        .order("created_at", { ascending: false });

      if (historyError) {
        console.error("❌ 리워드 기록 조회 실패:", historyError.message);
      }

      if (historyData) {
        const formatted = historyData.map((item: any) => {
          const kst = new Date(new Date(item.created_at).getTime() + 9 * 60 * 60 * 1000);
          const dateStr = `${kst.getFullYear()}. ${kst.getMonth() + 1}. ${kst.getDate()}.`;
          return {
            date: dateStr,
            amount: item.total_amount,
          };
        });
        setHistory(formatted);
      }
    };

    fetchData();
  }, [refCode]);

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-24">
      {/* 상단바 */}
      <div className="w-full py-3 flex items-center px-2">
        <button onClick={() => router.push("/invite")} className="mr-3">
          <img src="/icon-back.png" alt="뒤로가기" className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-800">
          {name || "상세정보"}
        </h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-2">
        {/* 멤버십 가입 현황 */}
        <h2 className="font-semibold text-sm text-gray-700 mb-2 pl-2">
          {name ? `${name} 님의 프라 멤버십 현황` : "프라 멤버십 현황"}
        </h2>
        <div className="bg-white rounded-xl shadow p-4 flex flex-col space-y-2">
          {membership ? (
            <div className="border rounded-xl border-blue-200 p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">100 프라 멤버십</p>
              <p className="text-xs text-gray-600">구입일: {membership.started_at?.slice(0, 10)}</p>
              <p className="text-xs text-gray-600">유효기간: ~{membership.expired_at?.slice(0, 10)}</p>
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500 py-8">
              구독중인 프라멤버십이 없어요
            </div>
          )}
        </div>



      </div>
    </main>
  );
}

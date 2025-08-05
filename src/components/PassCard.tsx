// components/PassStatusCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface Props {
  refCode: string;
}

interface PassInfo {
  pass_type: string;
  created_at: string;
  pass_expired_at: string;
}

export default function PassStatusCard({ refCode }: Props) {
  const [pass, setPass] = useState<PassInfo | null>(null);

  useEffect(() => {
    const loadPass = async () => {
      if (!refCode) return;

      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const { data } = await supabase
        .from('enrollments')
        .select('pass_type, created_at, pass_expired_at')
        .eq('ref_code', refCode)
        .gte('pass_expired_at', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) setPass(data);
    };

    loadPass();
  }, [refCode]);

  return (
    <div className="space-y-0">
      {/* 고정 타이틀 */}
      <div className="bg-white border border-blue-200 rounded-t-xl px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">구독중인 프라멤버십</h3>
      </div>

      {/* 구독 상태별 내용 */}
      {pass ? (
        <div className="bg-white border border-blue-200 border-t-0 rounded-b-xl px-4 py-4 flex items-center gap-3">
          <img src="/pass-300.png" alt="PASS" className="w-12 h-12" />
          <div className="text-sm">
            <p className="font-semibold text-gray-900">{pass.pass_type} 멤버십</p>
            <p className="text-xs text-gray-500">구입일 : {pass.created_at.slice(0, 10)}</p>
            <p className="text-xs text-gray-500">유효기간 : ~{pass.pass_expired_at}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-blue-200 border-t-0 rounded-b-xl px-4 py-4 text-center">
          <p className="text-sm font-semibold text-gray-800 mb-2">구독중인 멤버십이 없어요</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            스토어에서 PASS를 구입한 후 API를 연동하면<br />
            트레이딩봇을 이용할 수 있어요
          </p>
          <Link href="/store">
            <p className="text-xs text-blue-600 mt-2 font-semibold cursor-pointer">
              스토어 바로가기 &gt;
            </p>
          </Link>
        </div>
      )}
    </div>
  );
}

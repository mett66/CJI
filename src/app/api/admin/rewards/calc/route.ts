import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getKSTISOString, getLastWeekRangeKST } from "@/lib/dateUtil";

export async function POST() {
  try {
    // ✅ 이번 주 월요일 실행 가정 → 전주 월~일 집계
    const todayKst = getKSTISOString().slice(0, 10); // YYYY-MM-DD
    const range = getLastWeekRangeKST(todayKst);

    // ✅ 1번 테이블(enrollments)에서 결제완료 건만 로드
    const { data: enrolls, error: loadErr } = await supabase
      .from("enrollments")
      .select("ref_code, ref_by, center_id, tuition_fee, memo, created_at")
      .gte("created_at", range.gte)
      .lt("created_at", range.lt)
      .eq("memo", "결제 완료");

    if (loadErr) throw loadErr;
    if (!enrolls || enrolls.length === 0) {
      return NextResponse.json({ inserted: 0, updated: 0, message: "집계 대상 없음" });
    }

    // ✅ 버킷: 지급 대상 ref_code별 합산 (초대자 50%, 센터 20%)
    type Bucket = { ref_code: string; referral_amount: number; center_amount: number; };
    const buckets = new Map<string, Bucket>();

    for (const row of enrolls) {
      const tuition = Number(row.tuition_fee ?? 0);
      if (!tuition || tuition <= 0) continue;

      // 초대자(ref_by) 50%
      if (row.ref_by) {
        const k = String(row.ref_by);
        const b = buckets.get(k) ?? { ref_code: k, referral_amount: 0, center_amount: 0 };
        b.referral_amount += Math.floor(tuition * 0.50 * 100) / 100; // 소수점 2자리 버림
        buckets.set(k, b);
      }
      // 센터(center_id) 20%
      if (row.center_id) {
        const k = String(row.center_id);
        const b = buckets.get(k) ?? { ref_code: k, referral_amount: 0, center_amount: 0 };
        b.center_amount += Math.floor(tuition * 0.20 * 100) / 100;
        buckets.set(k, b);
      }
    }

    if (buckets.size === 0) {
      return NextResponse.json({ inserted: 0, updated: 0, message: "금액 집계 0" });
    }

    // ✅ 지급대상 사용자 정보(users) 보강
    const targetCodes = Array.from(buckets.keys());
    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("ref_code, name, wallet_address")
      .in("ref_code", targetCodes);
    if (usersErr) throw usersErr;

    const userMap = new Map<string, { name?: string | null; wallet_address?: string | null }>();
    for (const u of users ?? []) {
      userMap.set(u.ref_code, { name: u.name ?? null, wallet_address: u.wallet_address ?? null });
    }

    // ✅ 2번 테이블(reward_transfers)로 upsert (키: ref_code + reward_date)
    const nowIso = getKSTISOString();
    const rewardDate = todayKst; // 실행 월요일을 정산일로 기록

    let upserted = 0;

    for (const [, b] of buckets) {
      const referral = Math.round((b.referral_amount ?? 0) * 100) / 100;
      const center   = Math.round((b.center_amount ?? 0) * 100) / 100;
      const total    = Math.round((referral + center) * 100) / 100;

      const info = userMap.get(b.ref_code) || {};
      const payload = {
        ref_code: b.ref_code,
        name: info.name ?? null,
        wallet_address: info.wallet_address ?? null,
        referral_amount: referral,
        center_amount: center,
        total_amount: total,
        status: "pending",
        reward_date: rewardDate,
        created_at: nowIso,
        // period_start / period_end 컬럼이 테이블에 있다면 아래 두 줄을 활성화
        // period_start: range.period_start,
        // period_end: range.period_end,
      };

      const { error: upErr } = await supabase
        .from("reward_transfers")
        .upsert(payload, { onConflict: "ref_code,reward_date" }); // ⚠️ 유니크 인덱스 필요
      if (upErr) throw upErr;

      upserted += 1;
    }

    return NextResponse.json({
      inserted: upserted,
      rewardDate,
      period: { start: range.period_start, end: range.period_end },
    });
  } catch (e: any) {
    console.error("Rewards calc error:", e);
    return NextResponse.json({ message: e?.message ?? "서버 오류" }, { status: 500 });
  }
}

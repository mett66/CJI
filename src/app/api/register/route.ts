// /app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getKSTISOString, getKSTDateString } from "@/lib/dateUtil";

// Vercel(Edge 아님) 런타임에서 실행 가정
export const dynamic = "force-dynamic";

// ✅ 서버에서만 사용하는 Service Role Key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // 환경변수 누락 시 빌드/런타임에서 바로 알 수 있게
  // (주의: 콘솔에만 출력, 응답은 아래 try/catch에서 처리)
  console.error("❌ Supabase env missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/** ----------------------------------------------------------------
 *  추천코드 생성: "CJI1001"부터 1씩 증가
 *  - 마지막 사용자의 ref_code 기준
 *  - "CJI" 접두사 뒤 숫자만 안전 추출
 *  - 중복 방지를 위해 실제 사용 가능 코드가 나올 때까지 확인
 * ---------------------------------------------------------------- */
async function generateNextReferralCode(): Promise<string> {
  // 가장 최근 생성된 사용자 1명
  const { data, error } = await supabase
    .from("users")
    .select("ref_code")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("❌ ref_code 조회 실패:", error.message);
    throw new Error("ref_code 조회 실패");
  }

  // 기본 시작값
  let nextNum = 1001;

  if (data && data.length > 0) {
    const last = data[0].ref_code || "";
    if (last.startsWith("CJI")) {
      // "CJI" 이후 숫자만 추출
      const m = last.slice(3).match(/\d+/);
      if (m) {
        const n = parseInt(m[0], 10);
        if (!Number.isNaN(n)) nextNum = n + 1;
      }
    }
  }

  // 혹시 모를 중복을 피하기 위해 사용 가능할 때까지 증가
  // (동시 요청이 드물다는 가정, 그래도 50회 한도 방어)
  for (let i = 0; i < 50; i++) {
    const candidate = `CJI${nextNum}`;

    const { data: exists, error: existsErr } = await supabase
      .from("users")
      .select("ref_code")
      .eq("ref_code", candidate)
      .maybeSingle();

    if (existsErr) {
      console.error("❌ ref_code 중복 확인 실패:", existsErr.message);
      throw new Error("ref_code 중복 확인 실패");
    }

    if (!exists) return candidate; // 사용 가능
    nextNum += 1; // 중복이면 1 증가 후 재시도
  }

  throw new Error("추천코드 생성 충돌(동시성) - 잠시 후 다시 시도해주세요.");
}

/** ----------------------------------------------------------------
 *  POST /api/register
 *  body: { wallet_address, email?, phone?, ref_by?, name? }
 * ---------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      wallet_address,
      email = "",
      phone = "01000000000",
      ref_by = "CJI1001",
      name = "",
    } = body || {};

    if (!wallet_address) {
      return NextResponse.json({ error: "지갑 주소는 필수입니다." }, { status: 400 });
    }

    const normalizedAddress = String(wallet_address).toLowerCase();

    // 🔍 이미 등록된 유저 확인
    const { data: existing, error: lookupError } = await supabase
      .from("users")
      .select("id, ref_code")
      .eq("wallet_address", normalizedAddress)
      .maybeSingle();

    if (lookupError) {
      console.error("❌ 유저 조회 실패:", lookupError);
      return NextResponse.json({ error: "유저 조회 실패" }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({
        message: "이미 등록된 유저입니다.",
        id: existing.id,
        ref_code: existing.ref_code,
      });
    }

    // 🧠 추천인 → 센터ID 결정
    let center_id = "CJI1001";
    if (ref_by) {
      const { data: referrer, error: referrerError } = await supabase
        .from("users")
        .select("center_id, ref_code")
        .eq("ref_code", ref_by)
        .maybeSingle();

      if (referrerError) {
        console.error("❌ 추천인 정보 조회 실패:", referrerError);
        return NextResponse.json({ error: "추천인 정보 조회 실패" }, { status: 500 });
      }
      if (referrer) {
        center_id = referrer.center_id || "CJI1001";
      }
    }

    // ✅ 추천코드 생성 (중복 방지)
    const newRefCode = await generateNextReferralCode();

    // ✅ name 컬럼이 NOT NULL일 수 있으므로 기본값 보정
    const finalName = (typeof name === "string" && name.trim()) || "사용자";

    // ✅ KST 기준 가입일/시간
    const joinedAt = getKSTISOString();    // 2025-05-26T09:12:33.000Z
    const joinedDate = getKSTDateString(); // 2025-05-26

    // 🆕 신규 유저 등록
    const { data: inserted, error: insertError } = await supabase
      .from("users")
      .insert({
        wallet_address: normalizedAddress,
        email,
        phone,
        name: finalName,
        ref_code: newRefCode,
        ref_by,
        center_id,
        joined_at: joinedAt,
        joined_date: joinedDate,
      })
      .select("id, ref_code")
      .single();

    if (insertError) {
      console.error("❌ 등록 실패:", insertError);
      // Supabase 상세 메시지를 클라이언트에 전달
      return NextResponse.json({ error: insertError.message || "등록 실패" }, { status: 500 });
    }

    return NextResponse.json({
      message: "등록 완료",
      id: inserted.id,
      ref_code: inserted.ref_code,
    });
  } catch (err: any) {
    console.error("register API error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

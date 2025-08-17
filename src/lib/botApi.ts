// ✅ API 베이스: 환경변수 우선, 없으면 기존 도메인 사용
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://snowmart.co.kr";

// ✅ 공통: 타임아웃 유틸
function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(timer) };
}

// ✅ 시작
export async function startBot(refCode: string) {
  const { controller, clear } = withTimeout(15000); // 15초 타임아웃
  try {
    const res = await fetch(`${API_BASE}/start-bot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref_code: refCode }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      // JSON/텍스트 에러 모두 안전 처리
      let detail = "봇 시작 오류";
      try {
        const err = await res.json();
        detail = err?.detail ?? detail;
      } catch {
        try {
          const txt = await res.text();
          if (txt) detail = txt;
        } catch {}
      }
      throw new Error(`❌ Start Bot Error: ${res.status} - ${detail}`);
    }

    return await res.json();
  } finally {
    clear();
  }
}

// ✅ 중지
export async function stopBot(refCode: string) {
  const { controller, clear } = withTimeout(15000); // 15초 타임아웃
  try {
    const res = await fetch(`${API_BASE}/stop-bot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref_code: refCode }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = "봇 중지 오류";
      try {
        const err = await res.json();
        detail = err?.detail ?? detail;
      } catch {
        try {
          const txt = await res.text();
          if (txt) detail = txt;
        } catch {}
      }
      throw new Error(`❌ Stop Bot Error: ${res.status} - ${detail}`);
    }

    return await res.json();
  } finally {
    clear();
  }
}

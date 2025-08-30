// lib/botApi.ts

// ✅ 프록시 사용: 클라에서는 동일 오리진만 호출
//    필요시 앞에 붙여쓸 베이스 경로(현재는 빈 문자열)
const API_BASE = ""; // e.g. "", 혹은 "/"

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(timer) };
}

// ✅ 시작
export async function startBot(refCode: string) {
  const { controller, clear } = withTimeout(15000); // 15초 타임아웃
  try {
    const res = await fetch(`${API_BASE}/api/start-bot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref_code: refCode }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
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

    try {
      return await res.json();
    } catch {
      return {};
    }
  } finally {
    clear();
  }
}

// ✅ 중지
export async function stopBot(refCode: string) {
  const { controller, clear } = withTimeout(15000); // 15초 타임아웃
  try {
    const res = await fetch(`${API_BASE}/api/stop-bot`, {
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

    try {
      return await res.json();
    } catch {
      return {};
    }
  } finally {
    clear();
  }
}

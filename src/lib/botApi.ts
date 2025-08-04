export async function startBot(refCode: string) {
  const res = await fetch("https://snowmart.co.kr/start-bot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref_code: refCode }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "봇 시작 오류");
  }

  return await res.json();
}

export async function stopBot(refCode: string) {
  const res = await fetch("https://snowmart.co.kr/stop-bot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref_code: refCode }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`❌ Stop Bot Error: ${res.status} - ${errorText}`);
  }

  return res.json();
}

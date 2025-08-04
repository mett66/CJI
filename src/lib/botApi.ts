// src/lib/botApi.ts

export async function startBot(refCode: string) {
  try {
    const res = await fetch("http://snowmart.co.kr:8000/start-bot", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref_code: refCode,  // ✅ entry_amount 제외
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || '봇 시작 오류');
    }

    return await res.json();
  } catch (err) {
    console.error('❌ startBot error:', err);
    throw err;
  }
}


export async function stopBot(walletAddress: string) {
  const res = await fetch("http://snowmart.co.kr:8000/stop-bot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ wallet_address: walletAddress }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`❌ Stop Bot Error: ${res.status} - ${errorText}`);
  }

  return res.json();
}


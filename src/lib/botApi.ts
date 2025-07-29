// src/lib/botApi.ts

export async function startBot(refCode: string) {
  const res = await fetch("http://snowmart.co.kr:8000/start-bot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref_code: refCode }),
  });
  return res.json();
}

export async function stopBot(refCode: string) {
  const res = await fetch("http://snowmart.co.kr:8000/stop-bot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref_code: refCode }),
  });
  return res.json();
}

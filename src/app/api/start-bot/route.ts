import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const REMOTE = process.env.REMOTE_API_BASE || "https://snowmart.co.kr";
  const body = await req.json();

  const r = await fetch(`${REMOTE}/start-bot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // 에러/본문 그대로 전달
  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: { "Content-Type": r.headers.get("content-type") ?? "application/json" },
  });
}

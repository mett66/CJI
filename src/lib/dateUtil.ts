// 한국시간 ISO 문자열 (타임스탬프 저장용)
export function getKSTISOString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString();
}

// 한국 날짜 문자열 (YYYY-MM-DD)
export function getKSTDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

// 내부 헬퍼: Date -> KST 기준 YYYY-MM-DD
function toKSTDateYYYYMMDD(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// ✅ 전주(월~일) KST 구간 반환 (월요일 실행 가정)
export function getLastWeekRangeKST(todayKstYYYYMMDD?: string) {
  const today = todayKstYYYYMMDD ?? getKSTISOString().slice(0, 10); // YYYY-MM-DD (KST)
  // KST 자정 기준 시점(UTC로는 전날 15:00Z)
  const base = new Date(`${today}T00:00:00+09:00`);

  const MS = 24 * 60 * 60 * 1000;
  const startUTC = new Date(base.getTime() - 7 * MS); // 전주 월요일 KST 자정
  const endUTC   = new Date(base.getTime() - 1 * MS); // 전주 일요일 KST 자정

  const startDate = toKSTDateYYYYMMDD(startUTC); // ← KST로 재보정해서 날짜 문자열 생성
  const endDate   = toKSTDateYYYYMMDD(endUTC);

  return {
    gte: `${startDate} 00:00:00+09`,
    lt:  `${endDate} 23:59:59.999+09`,
    period_start: startDate,
    period_end: endDate,
  };
}

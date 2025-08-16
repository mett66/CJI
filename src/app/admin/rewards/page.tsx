export default function AdminRewardsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">리워드송금</h1>
      <p className="text-sm text-gray-600">
        계산 실행 → 분류별 확인 → 종합/송금 대상 관리 플로우.
      </p>
      {/* TODO: 기준일 선택, 계산 실행 버튼, reward_transfers 테이블, 상태(pending/paid/failed) */}
    </section>
  );
}

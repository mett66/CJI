export default function AdminBotsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">봇운영현황</h1>
      <p className="text-sm text-gray-600">
        유저별 실행상태/설정/로그를 확인하고 원격 명령을 보낼 수 있습니다.
      </p>
      {/* TODO: 상태 필터, 리스트, 시작/중지/전체청산 액션, 로그 보기 */}
    </section>
  );
}

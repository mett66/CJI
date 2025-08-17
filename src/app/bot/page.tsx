'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabaseClient';
import { useActiveAccount } from 'thirdweb/react';
import { ChevronRight, PauseCircle, PlayCircle } from 'lucide-react';
import { startBot, stopBot } from '@/lib/botApi';
import Link from 'next/link';
import PassCard from '@/components/PassCard';

export default function BotPage() {
  const [showcoinwModal, setShowcoinwModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);

  const [coinwApiKey, setcoinwApiKey] = useState('');
  const [coinwApiSecret, setcoinwApiSecret] = useState('');

  const [symbol, setSymbol] = useState('XRPUSDT');
  const [entryAmount, setEntryAmount] = useState('5');

  const [refCode, setRefCode] = useState('');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const account = useActiveAccount();

  const [stopOption, setStopOption] = useState<'close-all' | 'keep-position'>('close-all');

  const [botStatus, setBotStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown');
  const [checking, setChecking] = useState(false);

  const [hasMembership, setHasMembership] = useState(false);

  // 파생값
  const isBotRunning = botStatus === 'running';

  /**
   * ✅ 멤버십 체크: enrollments → (fallback) user_passes → passes → users
   */
  const checkMembership = async (wallet?: string, ref?: string) => {
    const w = (wallet || account?.address || '').toLowerCase();
    const r = ref ?? refCode;
    if (!w || !r) {
      setHasMembership(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    // 0) enrollments (정식)
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, ref_code, pass_expired_at')
        .eq('ref_code', r)
        .gte('pass_expired_at', today)
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasMembership(true);
        return;
      }
    } catch (_) {}

    // ---- 이하: 과거 호환용 fallback ----
    const nowIso = new Date().toISOString();

    // 1) user_passes
    try {
      const { data: passes, error } = await supabase
        .from('user_passes')
        .select('id,status,expires_at,wallet_address,ref_code')
        .eq('wallet_address', w)
        .eq('status', 'active')
        .gte('expires_at', nowIso)
        .limit(1);

      if (!error && passes && passes.length > 0) {
        setHasMembership(true);
        return;
      }
    } catch (_) {}

    // 2) passes
    try {
      const { data, error } = await supabase
        .from('passes')
        .select('id,status,expires_at,wallet_address,ref_code')
        .eq('wallet_address', w)
        .eq('status', 'active')
        .gte('expires_at', nowIso)
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasMembership(true);
        return;
      }
    } catch (_) {}

    // 3) users 내 만료/프리미엄 플래그
    try {
      const { data, error } = await supabase
        .from('users')
        .select('pass_expires_at,is_premium')
        .eq('wallet_address', w)
        .maybeSingle();

      if (!error && data) {
        const active =
          (data.pass_expires_at && new Date(data.pass_expires_at) >= new Date()) ||
          data.is_premium === true;
        setHasMembership(!!active);
        return;
      }
    } catch (_) {}

    setHasMembership(false);
  };

  /**
   * ✅ 초기 로드: 사용자/설정/구독/상태
   *  - 중첩 useEffect 제거
   *  - 중복 setRefCode/setName 제거
   */
  useEffect(() => {
    if (!account?.address) return;

    (async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('ref_code, name, is_running, symbol, entry_amount, api_key, secret_key')
        .eq('wallet_address', account.address.toLowerCase())
        .single();

      if (!userData) return;

      setRefCode(userData.ref_code);
      setName(userData.name);
      setBotStatus(userData.is_running ? 'running' : 'stopped');

      // 멤버십 확인
      await checkMembership(account.address, userData.ref_code);

      // 사용자 설정 반영
      setSymbol(userData.symbol || 'XRPUSDT');
      setEntryAmount(userData.entry_amount?.toString() || '5');
      setApiKey(userData.api_key || '');
      setApiSecret(userData.secret_key || '');
      setcoinwApiKey(userData.api_key || '');
      setcoinwApiSecret(userData.secret_key || '');
    })();
  }, [account?.address]);

  /**
   * ✅ users.is_running 실시간 반영 (내 지갑만)
   */
  useEffect(() => {
    if (!account?.address) return;
    const w = account.address.toLowerCase();

    const ch = supabase
      .channel('users_running_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `wallet_address=eq.${w}` },
        (payload) => {
          const next = (payload.new as any)?.is_running;
          if (typeof next === 'boolean') setBotStatus(next ? 'running' : 'stopped');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [account?.address]);

  /**
   * ✅ enrollments / user_passes 실시간 반영
   */
  useEffect(() => {
    if (!refCode) return;

    const chEnroll = supabase
      .channel('enrollments_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrollments', filter: `ref_code=eq.${refCode}` },
        () => {
          checkMembership(account?.address, refCode);
        }
      )
      .subscribe();

    const w = account?.address?.toLowerCase();
    let chUserPasses: ReturnType<typeof supabase.channel> | undefined;

    if (w) {
      chUserPasses = supabase
        .channel('user_passes_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_passes', filter: `wallet_address=eq.${w}` },
          () => {
            checkMembership(w, refCode);
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(chEnroll);
      if (chUserPasses) supabase.removeChannel(chUserPasses);
    };
  }, [refCode, account?.address]);

  /**
   * ✅ 탭 복귀 시 멤버십 재확인
   */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && account?.address) {
        checkMembership(account.address, refCode);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [account?.address, refCode]);

  const handleSaveSettings = async () => {
    if (!account?.address || !symbol || entryAmount === '') {
      alert('❗ 필수 정보를 모두 입력하세요.');
      return;
    }

    const parsedAmount = parseFloat(entryAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('❗ 유효한 진입 수량을 입력해주세요.');
      return;
    }

    const { error } = await supabase
      .from('users')
      .upsert(
        {
          wallet_address: account.address.toLowerCase(),
          symbol,
          entry_amount: parsedAmount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      );

    if (error) {
      console.error('❌ 설정 저장 실패:', error.message);
      alert('설정 저장 실패');
    } else {
      alert('✅ 설정이 저장되었습니다.');
    }
  };

  const handleStartBot = async () => {
    if (!refCode || !account?.address) return;

    await supabase
      .from('users')
      .update({ is_running: true, updated_at: new Date().toISOString() })
      .eq('wallet_address', account.address.toLowerCase());

    try {
      const result = await startBot(refCode);
      alert(`🚀 봇 시작: ${result.message || result.ref_code}`);
      setBotStatus('running'); // 즉시 반영
    } catch (e) {
      console.error(e);
      alert('❌ 백엔드 실행 요청 실패');
    }
  };

  const handleStopBot = async () => {
    if (!refCode || !account?.address) return;

    await supabase
      .from('users')
      .update({ is_running: false, updated_at: new Date().toISOString() })
      .eq('wallet_address', account.address.toLowerCase());

    try {
      const result = await stopBot(refCode);
      alert(`🛑 봇 중지: ${result.message || result.ref_code}`);
      setBotStatus('stopped'); // 즉시 반영
    } catch (e) {
      console.error(e);
      alert('❌ 백엔드 중지 요청 실패');
    }
  };

  const handleSavecoinwApi = async () => {
    if (!account?.address || !coinwApiKey || !coinwApiSecret) {
      alert('❗ API 키와 시크릿을 모두 입력해주세요.');
      return;
    }

    const { error } = await supabase
      .from('users')
      .upsert(
        {
          wallet_address: account.address.toLowerCase(),
          api_key: coinwApiKey,
          secret_key: coinwApiSecret,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      );

    if (error) {
      console.error('❌ API 저장 실패:', error.message);
      alert('❌ 저장 실패');
    } else {
      alert('✅ API 저장 완료');
      setShowcoinwModal(false);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-[#f5f7fa] pb-24">
        <TopBar title="트레이딩봇" />
        <div className="px-4 pt-4 space-y-2">
          <img src="/ad1.png" alt="스노봇 배너" className="w-full rounded-xl object-cover h-[100px]" />

          {refCode && <PassCard refCode={refCode} />}

          {/* API 연동 카드 - 구독(enrollments) 없으면 비활성화 */}
          <div
            className={`bg-white border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between 
              ${hasMembership ? 'cursor-pointer' : 'opacity-50 pointer-events-none'}`}
            onClick={() => hasMembership && setShowcoinwModal(true)}
          >
            <div className="flex items-center gap-3">
              <img src="/api.png" alt="coinw" className="w-10 h-10" />
              <div className="flex flex-col">
                <span className={`text-sm font-semibold ${hasMembership ? 'text-blue-600' : 'text-gray-400'}`}>
                  COINW API 연동하기
                </span>
                <span className="text-xs text-gray-500">봇 실행을 위해 API 연동을 완료해주세요</span>
              </div>
            </div>
            <ChevronRight className={`${hasMembership ? 'text-blue-500' : 'text-gray-300'}`} size={20} />
          </div>

          {/* 설정 카드 - 실행 중 비활성화 */}
          <div className={`bg-white rounded-xl shadow px-4 py-5 space-y-5 ${isBotRunning ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="text-base font-semibold text-gray-900">트레이딩봇</h3>

            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">거래 심볼 선택</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                disabled={isBotRunning}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="XRPUSDT">XRP/USDT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">진입금액 (코인 수량)</label>
              <input
                type="number"
                disabled={isBotRunning}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
                min="0"
                step="any"
                placeholder="예: 100"
              />
              <p className="text-xs text-gray-500 mt-1 leading-snug">
                진입금액은 자산 금액 1000USDT 기준으로 5로 설정하면 50XRP로 주문 진입합니다.<br />
                나의 자산규모에 맞게 비례대로 설정을 변경해주세요.
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={!refCode || isBotRunning}
              title={isBotRunning ? '봇 실행 중에는 설정을 변경할 수 없습니다.' : undefined}
              className={`w-full py-3 rounded font-semibold text-white text-sm transition ${
                !refCode || isBotRunning ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              🗂 설정 저장하기
            </button>
          </div>

          {/* 제어 버튼 */}
          <div className="mt-6 space-y-4">
            <button
              onClick={() => setShowStartModal(true)}
              className="w-full py-3 rounded-full bg-[#377DFF] text-white text-sm font-semibold hover:bg-blue-700 transition"
              disabled={!refCode}
            >
              시작하기
            </button>

            {/* 상태 박스 */}
            <div
              className={`w-full rounded-xl border shadow-sm transition-colors duration-200
                ${isBotRunning ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}
              aria-live="polite"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center justify-center rounded-full p-1.5
                      ${isBotRunning ? 'bg-emerald-100' : 'bg-rose-100'}`}
                  >
                    {isBotRunning ? (
                      <PlayCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <PauseCircle className="w-5 h-5 text-rose-600" />
                    )}
                  </span>
                  <div>
                    <div className={`text-sm font-semibold ${isBotRunning ? 'text-emerald-700' : 'text-rose-700'}`}>
                      봇 상태: {isBotRunning ? '실행 중' : '중지됨'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isBotRunning ? '자동 주문이 실행되고 있어요.' : '봇이 멈춰있습니다. 시작하기를 눌러 실행하세요.'}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium
                    ${isBotRunning ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}
                >
                  {isBotRunning ? 'RUNNING' : 'STOPPED'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowStopModal(true)}
              className="w-full py-3 rounded-full border border-[#377DFF] text-[#377DFF] text-sm font-semibold hover:bg-blue-50 transition"
              disabled={!refCode}
            >
              중지하기
            </button>
          </div>
        </div>
      </main>

      {/* 시작 모달 */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl w-[90%] max-w-md p-6 space-y-6 shadow-lg">
            <h2 className="text-lg font-bold text-center">프라봇을 시작합니다</h2>
            <div className="text-sm text-gray-800 space-y-2">
              <p>
                <span className="font-medium">거래심볼:</span> {symbol}
              </p>
              <p>
                <span className="font-medium">진입금액:</span> {entryAmount}
              </p>
              <p className="text-xs text-gray-500">나의 자산규모에 맞는 진입금액으로 설정되었는지 확인해주세요</p>
            </div>
            <div className="flex justify-between gap-4 pt-2">
              <button onClick={() => setShowStartModal(false)} className="w-full py-2 rounded-md bg-gray-200 text-sm font-medium hover:bg-gray-300">
                취소
              </button>
              <button
                onClick={() => {
                  handleStartBot();
                  setShowStartModal(false);
                }}
                className="w-full py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 중지 모달 */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl w-[90%] max-w-md p-6 space-y-6 shadow-lg">
            <h2 className="text-lg font-bold text-center">스노봇을 중지합니다</h2>

            <div className="p-4 rounded-lg border border-gray-300 bg-gray-50">
              <p className="text-sm font-semibold mb-1">현재 포지션은 유지할게요</p>
              <p className="text-xs text-gray-500">봇은 중지되지만 현재 모든 포지션은 유지됩니다</p>
            </div>

            <div className="flex justify-between gap-4 pt-2">
              <button onClick={() => setShowStopModal(false)} className="w-full py-2 rounded-md bg-gray-200 text-sm font-medium hover:bg-gray-300">
                취소
              </button>
              <button
                onClick={async () => {
                  await handleStopBot();
                  setShowStopModal(false);
                }}
                className="w-full py-2 rounded-md bg-[#377DFF] text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API 연동 모달 */}
      {showcoinwModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl shadow-md w-[90%] max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">coinw 거래소 API 연결</h2>
            <input
              type="text"
              placeholder="API 키"
              className="w-full border px-3 py-2 rounded mb-3"
              value={coinwApiKey}
              onChange={(e) => setcoinwApiKey(e.target.value)}
            />
            <input
              type="text"
              placeholder="API 시크릿"
              className="w-full border px-3 py-2 rounded mb-5"
              value={coinwApiSecret}
              onChange={(e) => setcoinwApiSecret(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowcoinwModal(false)} className="px-4 py-2 bg-gray-200 rounded">
                취소
              </button>
              <button onClick={handleSavecoinwApi} className="px-4 py-2 bg-blue-600 text-white rounded">
                연결
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </>
  );
}

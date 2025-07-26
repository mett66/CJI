'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabaseClient';
import { useActiveAccount } from 'thirdweb/react';
import { ChevronRight } from "lucide-react"; // 상단에 import 추가

export default function BotPage() {
  const [showBitunixModal, setShowBitunixModal] = useState(false);
  const [bitunixApiKey, setBitunixApiKey] = useState('');
  const [bitunixApiSecret, setBitunixApiSecret] = useState('');

  const [symbol, setSymbol] = useState('XRPUSDT');
  const [entryAmount, setEntryAmount] = useState('200');

  const [refCode, setRefCode] = useState('');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const account = useActiveAccount();

  useEffect(() => {
    if (!account?.address) return;

    const fetch = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('ref_code, name')
        .eq('wallet_address', account.address.toLowerCase())
        .single();

      if (!userData) return;

      setRefCode(userData.ref_code);
      setName(userData.name);

      const { data: setting } = await supabase
        .from('bot_settings')
        .select('symbol, entry_amount, api_key, secret_key')
        .eq('ref_code', userData.ref_code)
        .single();

      if (setting) {
        setSymbol(setting.symbol || 'XRPUSDT');
        setEntryAmount(setting.entry_amount?.toString() || '200');
        setApiKey(setting.api_key || '');
        setApiSecret(setting.secret_key || '');
        setBitunixApiKey(setting.api_key || '');
        setBitunixApiSecret(setting.secret_key || '');
      }
    };

    fetch();
  }, [account]);

  useEffect(() => {
    if (symbol === 'BTCUSDT') setEntryAmount('0.005');
    if (symbol === 'XRPUSDT') setEntryAmount('200');
  }, [symbol]);

const handleSaveSettings = async () => {
  if (!refCode || !apiKey || !apiSecret || !symbol || entryAmount === "") {
    alert("❗️필수 정보를 모두 입력하세요.");
    return;
  }

  const parsedAmount = parseFloat(entryAmount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    alert("❗ 유효한 진입 수량을 입력해주세요.");
    return;
  }

  const { error } = await supabase
    .from("bot_settings")
    .upsert({
      ref_code: refCode,
      api_key: apiKey,
      secret_key: apiSecret,
      entry_amount: parsedAmount,
      symbol,
      is_running: false,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("❌ Supabase 저장 실패:", error);
    alert("설정 저장 실패");
  } else {
    alert("✅ 설정이 저장되었습니다.");
  }
};


  const BACKEND_URL = 'https://aitrading.ac';

  const handleStartBot = async () => {
    if (!refCode) return;

    await supabase
      .from('bot_settings')
      .update({ is_running: true, updated_at: new Date().toISOString() })
      .eq('ref_code', refCode);

    try {
      const response = await fetch(`${BACKEND_URL}/run-bot/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref_code: refCode }),
      });

      const result = await response.json();
      alert(response.ok ? `🚀 봇 시작: ${result.ref_code}` : `❌ 실패: ${result.detail}`);
    } catch (e) {
      console.error(e);
      alert('❌ 백엔드 실행 요청 실패');
    }
  };

  const handleStopBot = async () => {
    if (!refCode) return;

    await supabase
      .from('bot_settings')
      .update({ is_running: false, updated_at: new Date().toISOString() })
      .eq('ref_code', refCode);

    try {
      const response = await fetch(`${BACKEND_URL}/stop-bot/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref_code: refCode }),
      });

      const result = await response.json();
      alert(response.ok ? `🛑 봇 중지: ${result.ref_code}` : `❌ 실패: ${result.detail}`);
    } catch (e) {
      console.error(e);
      alert('❌ 백엔드 중지 요청 실패');
    }
  };

  const handleClosePosition = async () => {
    if (!refCode || !symbol) {
      alert('❗ RefCode 또는 심볼 정보가 없습니다.');
      console.warn('⛔ refCode:', refCode, '⛔ symbol:', symbol);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/force-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref_code: refCode, symbol }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('✅ 전체 포지션 청산 요청 완료');
      } else {
        alert(`❌ 청산 실패: ${result.message || '서버 오류'}`);
      }
    } catch (e) {
      console.error('❌ 포지션 종료 요청 오류:', e);
      alert('❌ 포지션 종료 요청 실패');
    }
  };

  const handleSaveBitunixApi = async () => {
    if (!refCode || !bitunixApiKey || !bitunixApiSecret) {
      alert('❗ API 키와 시크릿을 모두 입력해주세요.');
      return;
    }

    const { error } = await supabase
      .from('bot_settings')
      .upsert({
        ref_code: refCode,
        api_key: bitunixApiKey,
        secret_key: bitunixApiSecret,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      alert('❌ 저장 실패');
      console.error('Bitunix 저장 오류:', error);
    } else {
      alert('✅ Bitunix 연결 완료');
      setShowBitunixModal(false);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-[#f5f7fa] pb-24">
        <TopBar title="자동매매 봇 설정" />

        <div className="px-4 pt-4 space-y-6">
          {/* ✅ 배너 영역 */}
          <img
            src="/ad1.png"
            alt="스노봇 배너"
            className="w-full rounded-xl object-cover h-[100px]"
          />

{/* ✅ Bitunix API 연결 카드 (수정된 버전) */}
<div
  className="bg-white border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer"
  onClick={() => setShowBitunixModal(true)}
>
  <div className="flex items-center gap-3">
    <img src="/api.png" alt="Bitunix" className="w-10 h-10" />
    <div className="flex flex-col">
      <span className="text-sm font-semibold text-blue-600">COINW API 연동하기</span>
      <span className="text-xs text-gray-500">봇 실행을 위해 API 연동을 완료해주세요</span>
    </div>
  </div>
  <ChevronRight className="text-blue-500" size={20} />
</div>

          {/* ✅ 설정 입력 영역 */}
          <div className="bg-white rounded-xl shadow px-4 py-5 space-y-4">
            <div>
              <label className="text-sm font-medium">거래 심볼 선택</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full border px-3 py-2 rounded mt-2"
              >
                <option value="BTCUSDT">BTCUSDT</option>
                <option value="XRPUSDT">XRPUSDT</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">
                구매 수량
              </label>
              <input
                type="number"
                className="w-full border px-3 py-2 rounded mt-2"
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
                min="0"
                step="any"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-3 rounded bg-blue-600 text-white font-bold"
              disabled={!refCode}
            >
              🗂 설정 저장하기
            </button>
          </div>

 {/* ✅ 시작 / 중지 버튼 (좌우 정렬) */}
<div className="mt-4">
  <div className="flex gap-3">
    <button
      onClick={handleStartBot}
      className="flex-1 py-3 rounded bg-green-600 text-white font-bold text-sm hover:bg-green-700"
      disabled={!refCode}
    >
      ▶ 시작
    </button>
    <button
      onClick={handleStopBot}
      className="flex-1 py-3 rounded bg-purple-600 text-white font-bold text-sm hover:bg-purple-700"
      disabled={!refCode}
    >
      ■ 중지 및 주문취소
    </button>
  </div>

  {/* ✅ 아래 단독 청산 버튼 */}
  <button
    onClick={handleClosePosition}
    className="w-full mt-3 py-3 rounded bg-red-600 text-white font-bold text-sm hover:bg-red-700"
    disabled={!refCode}
  >
    🛑 전체 포지션 청산
  </button>
</div>


        </div>
      </main>

      {/* ✅ Bitunix API 연결 모달 */}
      {showBitunixModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl shadow-md w-[90%] max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Bitunix 거래소 API 연결</h2>

            <input
              type="text"
              placeholder="API 키"
              className="w-full border px-3 py-2 rounded mb-3"
              value={bitunixApiKey}
              onChange={(e) => setBitunixApiKey(e.target.value)}
            />
            <input
              type="text"
              placeholder="API 시크릿"
              className="w-full border px-3 py-2 rounded mb-5"
              value={bitunixApiSecret}
              onChange={(e) => setBitunixApiSecret(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBitunixModal(false)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                취소
              </button>
              <button
                onClick={handleSaveBitunixApi}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
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

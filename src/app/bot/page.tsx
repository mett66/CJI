'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabaseClient';
import { useActiveAccount } from 'thirdweb/react';

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
    if (symbol === 'BTCUSDT') {
      setEntryAmount('0.005');
    } else if (symbol === 'XRPUSDT') {
      setEntryAmount('200');
    }
  }, [symbol]);

  const handleSaveSettings = async () => {
    if (!refCode || !apiKey || !apiSecret || !symbol || !entryAmount) {
      alert('❗️필수 정보를 모두 입력하세요.');
      return;
    }

    const { error } = await supabase
      .from('bot_settings')
      .upsert({
        ref_code: refCode,
        api_key: apiKey,
        secret_key: apiSecret,
        entry_amount: parseFloat(entryAmount),
        symbol,
        is_running: false,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('❌ Supabase 저장 실패:', error);
      alert('설정 저장 실패');
    } else {
      alert('✅ 설정이 저장되었습니다.');
    }
  };

const BACKEND_URL = "http://15.165.203.198:8000"; // 👈 여기에 실제 FastAPI 서버 주소 입력

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
    console.log('📤 포지션 종료 요청:', { ref_code: refCode, symbol });

    const response = await fetch('http://localhost:8000/force-close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref_code: refCode,
        symbol: symbol,
      }),
    });

    const result = await response.json();
    console.log('📥 응답 결과:', result);

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

        <div className="px-4 py-4 space-y-4">
          <div className="bg-black text-white text-sm rounded-md px-4 py-2 flex items-center justify-between">
            <span>🕒 티켓: ~ 2025-08-01 18:49</span>
          </div>

          <div className="bg-white rounded-xl shadow px-4 py-5">
            <button
              className="w-full py-2 rounded border border-gray-400 text-gray-800 font-medium"
              onClick={() => setShowBitunixModal(true)}
            >
              Bitunix 거래소 API 연결
            </button>
          </div>

          <div className="bg-white rounded-xl shadow px-4 py-5 space-y-4">
            <div>
              <label className="text-sm font-medium">거래 심볼 선택</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full border px-3 py-2 rounded mt-2"
              >
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="XRPUSDT">XRP/USDT</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">진입 금액 (BTC 또는 해당 코인 수량)</label>
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

          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={handleStartBot}
              className="w-full py-3 rounded bg-green-600 text-white font-bold"
              disabled={!refCode}
            >
              ▶ 시작
            </button>
            <button
              onClick={handleStopBot}
              className="w-full py-3 rounded bg-purple-600 text-white font-bold"
              disabled={!refCode}
            >
              ■ 중지 및 주문취소
            </button>
          </div>
        </div>
      </main>

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

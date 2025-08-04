'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabaseClient';
import { useActiveAccount } from 'thirdweb/react';
import { ChevronRight } from "lucide-react";
import { startBot, stopBot } from '@/lib/botApi';
import Link from "next/link";

export default function BotPage() {
  const [showcoinwModal, setShowcoinwModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false); // ✅ 추가
  const [coinwApiKey, setcoinwApiKey] = useState('');
  const [coinwApiSecret, setcoinwApiSecret] = useState('');

  const [symbol, setSymbol] = useState('XRPUSDT');
  const [entryAmount, setEntryAmount] = useState('200');

  const [refCode, setRefCode] = useState('');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const account = useActiveAccount();
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopOption, setStopOption] = useState<'close-all' | 'keep-position'>('close-all');


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
  .from('users')
  .select('symbol, entry_amount, api_key, secret_key')
  .eq('wallet_address', account.address.toLowerCase())
  .single();


      if (setting) {
        setSymbol(setting.symbol || 'XRPUSDT');
        setEntryAmount(setting.entry_amount?.toString() || '50');
        setApiKey(setting.api_key || '');
        setApiSecret(setting.secret_key || '');
        setcoinwApiKey(setting.api_key || '');
        setcoinwApiSecret(setting.secret_key || '');
      }
    };

    fetch();
  }, [account]);

  useEffect(() => {
    if (symbol === 'BTCUSDT') setEntryAmount('0.005');
    if (symbol === 'XRPUSDT') setEntryAmount('50');
  }, [symbol]);

 const handleSaveSettings = async () => {
  if (!account?.address || !symbol || entryAmount === "") {
    alert("❗ 필수 정보를 모두 입력하세요.");
    return;
  }

  const parsedAmount = parseFloat(entryAmount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    alert("❗ 유효한 진입 수량을 입력해주세요.");
    return;
  }

  const { error } = await supabase
    .from("users")
    .upsert(
      {
        wallet_address: account.address.toLowerCase(),
        symbol,
        entry_amount: parsedAmount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "wallet_address", // 기존 주소 있으면 update
      }
    );

  if (error) {
    console.error("❌ 설정 저장 실패:", error.message);
    alert("설정 저장 실패");
  } else {
    alert("✅ 설정이 저장되었습니다.");
  }
};


const handleStartBot = async () => {
  if (!refCode) return;

  await supabase
    .from('users')
    .update({ is_running: true, updated_at: new Date().toISOString() })
    .eq('wallet_address', account.address.toLowerCase());

  try {
    const result = await startBot(refCode); // ✅ 수량 전달 X
    alert(`🚀 봇 시작: ${result.message || result.ref_code}`);
  } catch (e) {
    console.error(e);
    alert('❌ 백엔드 실행 요청 실패');
  }
};


  const handleStopBot = async () => {
    if (!refCode) return;

    await supabase
      .from('users')
      .update({ is_running: false, updated_at: new Date().toISOString() })
       .eq('wallet_address', account.address?.toLowerCase());

    try {
      const result = await stopBot(account.address);
      alert(`🛑 봇 중지: ${result.message || result.ref_code}`);
    } catch (e) {
      console.error(e);
      alert('❌ 백엔드 중지 요청 실패');
    }
  };


const handleSavecoinwApi = async () => {
  if (!account?.address || !coinwApiKey || !coinwApiSecret) {
    alert("❗ API 키와 시크릿을 모두 입력해주세요.");
    return;
  }

  const { error } = await supabase
    .from("users")
    .upsert(
      {
        wallet_address: account.address.toLowerCase(),
        api_key: coinwApiKey,
        secret_key: coinwApiSecret,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "wallet_address",
      }
    );

  if (error) {
    console.error("❌ API 저장 실패:", error.message);
    alert("❌ 저장 실패");
  } else {
    alert("✅ API 저장 완료");
    setShowcoinwModal(false);
  }
};



  return (
    <>
      <main className="min-h-screen bg-[#f5f7fa] pb-24">
        <TopBar title="자동매매 봇 설정" />
        <div className="px-4 pt-4 space-y-2">
          <img src="/ad1.png" alt="스노봇 배너" className="w-full rounded-xl object-cover h-[100px]" />

          {/* PASS 카드 */}
          <div className="space-y-0">
            <div className="bg-white border border-blue-200 rounded-t-xl px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">구독중인 PASS</h3>
            </div>
            <div className="bg-white border border-blue-200 border-t-0 rounded-b-xl px-4 py-4 text-center">
              <p className="text-sm font-semibold text-gray-800 mb-2">구독중인 PASS가 없어요</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                스토어에서 PASS를 구입한 후 API를 연동하면<br />
                트레이딩봇을 이용할 수 있어요
              </p>
              <Link href="/store">
                <p className="text-xs text-blue-600 mt-2 font-semibold cursor-pointer">
                  스토어 바로가기 &gt;
                </p>
              </Link>
            </div>
          </div>

          {/* API 연동 카드 */}
          <div
            className="bg-white border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer"
            onClick={() => setShowcoinwModal(true)}
          >
            <div className="flex items-center gap-3">
              <img src="/api.png" alt="coinw" className="w-10 h-10" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-blue-600">COINW API 연동하기</span>
                <span className="text-xs text-gray-500">봇 실행을 위해 API 연동을 완료해주세요</span>
              </div>
            </div>
            <ChevronRight className="text-blue-500" size={20} />
          </div>

          {/* 설정 카드 */}
          <div className="bg-white rounded-xl shadow px-4 py-5 space-y-5">
            <h3 className="text-base font-semibold text-gray-900">트레이딩봇</h3>

            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">거래 심볼 선택</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="XRPUSDT">XRP/USDT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">진입금액 (코인 수량)</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
                min="0"
                step="any"
                placeholder="예: 100"
              />
              <p className="text-xs text-gray-500 mt-1 leading-snug">
                진입금액은 자산 금액 1000USDT 기준으로 기본 설정됩니다.<br />
                나의 자산규모에 맞게 설정을 변경해주세요.
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              className={`w-full py-3 rounded font-semibold text-white text-sm transition ${
                refCode ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
              }`}
              disabled={!refCode}
            >
              🗂 설정 저장하기
            </button>
          </div>

          {/* 제어 버튼 */}
{/* 제어 버튼 */}
<div className="mt-6 space-y-4">
  {/* 시작 버튼 - 파란색 둥글게 */}
  <button
    onClick={() => setShowStartModal(true)}
    className="w-full py-3 rounded-full bg-[#377DFF] text-white text-sm font-semibold hover:bg-blue-700 transition"
    disabled={!refCode}
  >
    시작하기
  </button>

  {/* 중지 버튼 - 아래 단독 */}
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

      {/* ✅ 시작 모달 */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl w-[90%] max-w-md p-6 space-y-6 shadow-lg">
            <h2 className="text-lg font-bold text-center">스노봇을 시작합니다</h2>
            <div className="text-sm text-gray-800 space-y-2">
              <p><span className="font-medium">거래심볼:</span> {symbol}</p>
              <p><span className="font-medium">진입금액:</span> {entryAmount}</p>
              <p className="text-xs text-gray-500">
                나의 자산규모에 맞는 진입금액으로 설정되었는지 확인해주세요
              </p>
            </div>
            <div className="flex justify-between gap-4 pt-2">
              <button
                onClick={() => setShowStartModal(false)}
                className="w-full py-2 rounded-md bg-gray-200 text-sm font-medium hover:bg-gray-300"
              >
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

      {showStopModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white rounded-xl w-[90%] max-w-md p-6 space-y-6 shadow-lg">
      <h2 className="text-lg font-bold text-center">스노봇을 중지합니다</h2>

      {/* 설명 영역 */}
      <div className="p-4 rounded-lg border border-gray-300 bg-gray-50">
        <p className="text-sm font-semibold mb-1">현재 포지션은 유지할게요</p>
        <p className="text-xs text-gray-500">
          봇은 중지되지만 현재 모든 포지션은 유지됩니다
        </p>
      </div>

      {/* 하단 버튼 */}
      <div className="flex justify-between gap-4 pt-2">
        <button
          onClick={() => setShowStopModal(false)}
          className="w-full py-2 rounded-md bg-gray-200 text-sm font-medium hover:bg-gray-300"
        >
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


      {/* 기존 COINW 모달 */}
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
              <button
                onClick={() => setShowcoinwModal(false)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                취소
              </button>
              <button
                onClick={handleSavecoinwApi}
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

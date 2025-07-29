import { generateSignature } from './sign';

const API_KEY = process.env.NEXT_PUBLIC_BITINUX_API_KEY!;
const SECRET_KEY = process.env.NEXT_PUBLIC_BITINUX_SECRET_KEY!;
const WS_URL = 'wss://fapi.coinw.com/public';

export function connectcoinwSocket(onData: (data: any) => void) {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.random().toString(36).substring(2, 18);
  const sign = generateSignature(API_KEY, SECRET_KEY, nonce, timestamp);

  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('✅ WebSocket 연결됨');

    const loginMsg = {
      op: 'login',
      args: [
        {
          apiKey: API_KEY,
          timestamp,
          nonce,
          sign,
        },
      ],
    };

    console.log('📤 로그인 전송:', loginMsg);
    ws.send(JSON.stringify(loginMsg));
  };

  ws.onmessage = (event) => {
    let msg: any;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      console.error('❌ JSON 파싱 실패:', event.data);
      return;
    }

    console.log('📩 수신:', msg);

    // 로그인 응답 처리
    if (msg.op === 'login') {
      if (msg.data?.result === true) {
        console.log('✅ 로그인 성공');

        const subMsg = {
          op: 'subscribe',
          args: [
            {
              ch: 'position', // 또는 'positions', 'futures.position' 등 필요 시 확인
            },
          ],
        };
        console.log('📤 포지션 채널 구독 전송:', subMsg);
        ws.send(JSON.stringify(subMsg));
      } else {
        console.error('❌ 로그인 실패:', msg);
      }
      return;
    }

    // 포지션 데이터 수신 처리
    if (msg.ch === 'position' && msg.data?.event === 'UPDATE') {
      console.log('📌 포지션 업데이트 수신:', msg.data);
      onData(msg.data);
    } else {
      console.log('ℹ️ 기타 메시지:', msg);
    }
  };

  ws.onerror = (error) => {
    console.error('❌ WebSocket 에러:', error);
  };

  ws.onclose = () => {
    console.log('❌ WebSocket 종료');
  };

  return ws;
}

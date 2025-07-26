'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gift, Users, User, Book } from "lucide-react"; // 📚 Book 아이콘 추가

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <div className="relative">
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-14 text-xs text-gray-500">
          <Link href="/bot" className="flex flex-col items-center">
            <Home size={20} className={isActive("/bot") ? "text-blue-600" : "text-gray-400"} />
            <span className={isActive("/bot") ? "text-blue-600" : "text-gray-400"}>스노봇</span>
          </Link>

          <Link href="/store" className="flex flex-col items-center">
            <Gift size={20} className={isActive("/store") ? "text-blue-600" : "text-gray-400"} />
            <span className={isActive("/store") ? "text-blue-600" : "text-gray-400"}>스토어</span>
          </Link>

          {/* ✅ 학습 탭 추가 */}
          <Link href="/learn" className="flex flex-col items-center">
            <Book size={20} className={isActive("/learn") ? "text-blue-600" : "text-gray-400"} />
            <span className={isActive("/learn") ? "text-blue-600" : "text-gray-400"}>학습</span>
          </Link>

          <Link href="/invite" className="flex flex-col items-center">
            <Users size={20} className={isActive("/invite") ? "text-blue-600" : "text-gray-400"} />
            <span className={isActive("/invite") ? "text-blue-600" : "text-gray-400"}>친구초대</span>
          </Link>

          <Link href="/mypage" className="flex flex-col items-center">
            <User size={20} className={isActive("/mypage") ? "text-blue-600" : "text-gray-400"} />
            <span className={isActive("/mypage") ? "text-blue-600" : "text-gray-400"}>마이페이지</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

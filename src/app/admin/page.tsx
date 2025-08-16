// src/app/admin/page.tsx
"use client";

import AdminAuth from "@/components/AdminAuth";
import ManualRewardPanel from "@/components/admin/ManualRewardPanel";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErr, setUsersErr] = useState<string | null>(null);

  const [editing, setEditing] = useState<{ id: any; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleCalculateRewards = async () => {
    setLoading(true);
    setMessage("리워드 계산 중...");
    const res = await fetch("/api/admin/calculate-rewards", { method: "POST" });
    const data = await res.json();
    setMessage(data.message || "리워드 계산 완료");
    setLoading(false);
  };

  const handleSendRewards = async () => {
    setLoading(true);
    setMessage("리워드 송금 중...");
    const res = await fetch("/api/admin/send-rewards", { method: "POST" });
    const data = await res.json();
    setMessage(data.message || "리워드 송금 완료");
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersErr(null);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (e: any) {
      setUsersErr(e?.message ?? "유저 불러오기 실패");
    } finally {
      setUsersLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { id, col } = editing;
    const { error } = await supabase
      .from("users")
      .update({ [col]: editValue })
      .eq("id", id);

    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, [col]: editValue } : u))
      );
    }
    setEditing(null);
    setEditValue("");
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
  <AdminAuth>
    {/* 전체 폭 사용 & 좌우 여백 제거 */}
    <div className="space-y-8 w-full px-4">
      {/* 수동 송금 */}
      <ManualRewardPanel />

      {/* 리워드 처리 버튼 */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold">🛠 리워드 자동 처리</h3>
        <button
          onClick={handleCalculateRewards}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
        >
          📊 리워드 계산
        </button>
        <button
          onClick={handleSendRewards}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
        >
          💸 리워드 송금
        </button>
        {message && (
          <p className="text-sm text-gray-500 mt-2 text-center">{message}</p>
        )}
      </div>

      {/* 유저 목록 */}
<section className="space-y-3 w-full">
  <h3 className="text-lg font-bold">👥 유저 목록 (수정 가능)</h3>

  {usersLoading && <div>불러오는 중...</div>}
  {usersErr && <div className="text-red-500">{usersErr}</div>}

  {!usersLoading && !usersErr && (
    <div className="rounded-lg border border-gray-200 overflow-auto w-full max-h-[70vh]">
      <table className="w-full text-sm table-auto">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            {(users[0] ? Object.keys(users[0]) : [])
              .filter(
                (col) =>
                  col !== "id" &&
                  col !== "nickname" &&
                  col !== "created_at" &&
                  col !== "joined_at" &&
                  col !== "role" &&
                  col !== "api_key" &&
                  col !== "secret_key" &&
                  col !== "symbol" &&
                  col !== "entry_amount" &&
                  col !== "is_running" &&
                  col !== "updated_at"
              )
              .map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap border-b"
                >
                  {col}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={999} className="px-3 py-4 text-gray-500">
                데이터 없음
              </td>
            </tr>
          )}

          {users.map((row) => (
            <tr key={row.id} className="odd:bg-white even:bg-gray-50 align-top">
              {Object.keys(users[0] ?? {})
.filter(
  (col) =>
    col !== "id" &&
    col !== "nickname" &&
    col !== "created_at" &&
    col !== "joined_at" &&
    col !== "role" &&
    col !== "api_key" &&
    col !== "secret_key" &&
    col !== "symbol" &&
    col !== "is_running" &&
    col !== "entry_amount" &&
    col !== "updated_at"
)

                .map((col) => {
                  const val = row[col];
                  const text =
                    typeof val === "object"
                      ? JSON.stringify(val)
                      : String(val ?? "");

                  const isEditing =
                    editing?.id === row.id && editing?.col === col;

                  return (
                    <td
                      key={col}
                      className="px-3 py-2 border-b whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer align-top"
                      onClick={() => {
                        setEditing({ id: row.id, col });
                        setEditValue(row[col] ?? "");
                      }}
                    >
                      {isEditing ? (
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                          }}
                          autoFocus
                          className="border rounded px-1 py-0.5 w-full break-all"
                        />
                      ) : (
                        text
                      )}
                    </td>
                  );
                })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>



    </div>
  </AdminAuth>
);
}

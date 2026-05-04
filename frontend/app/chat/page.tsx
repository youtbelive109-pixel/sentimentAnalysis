"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { AuthState } from "@/lib/types";

const AuthForm = dynamic(() => import("@/components/AuthForm"), { ssr: false });
const ChatRoom = dynamic(() => import("@/components/ChatRoom"), { ssr: false });

export default function ChatPage() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [room, setRoom] = useState("general");
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [customRoom, setCustomRoom] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("zenith_auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.authenticated) {
          // Use a microtask to avoid synchronous setState in effect body
          queueMicrotask(() => setAuth(parsed));
        }
      } catch {}
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("zenith_auth");
    setAuth(null);
  }

  function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    if (customRoom.trim()) {
      setRoom(customRoom.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"));
      setShowRoomPicker(false);
    }
  }

  if (!auth) {
    return <AuthForm onAuthenticated={(a) => setAuth(a)} />;
  }

  if (showRoomPicker) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: "#F2F0EB" }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="serif text-4xl font-semibold tracking-tighter mb-2" style={{ color: "#1C1C1B" }}>
              ZENITH.
            </h1>
            <p className="mono text-[11px] tracking-widest uppercase" style={{ color: "#C9A690" }}>
              Select Chat Room
            </p>
          </div>

          <div
            className="p-8"
            style={{
              backgroundColor: "#F2F0EB",
              border: "1px solid rgba(0,0,0,0.1)",
              boxShadow: "0 30px 60px -12px rgba(0,0,0,0.15)",
            }}
          >
            <div className="mono text-[10px] text-gray-500 border-b-2 border-dashed border-gray-300 pb-3 mb-6 flex justify-between">
              <span>ROOM_SELECT</span>
              <span className="px-2 py-0.5" style={{ backgroundColor: "#D4E157" }}>ACTIVE</span>
            </div>

            <div className="space-y-3 mb-6">
              {["general", "random", "tech", "design"].map((r) => (
                <button
                  key={r}
                  onClick={() => { setRoom(r); setShowRoomPicker(false); }}
                  className="w-full text-left px-4 py-3 border border-gray-200 hover:border-black transition-colors flex items-center justify-between"
                >
                  <span className="mono text-sm"># {r}</span>
                  <span className="mono text-[10px] text-gray-400">JOIN</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-3">
              <div className="mono text-[10px] text-gray-500">OR CREATE CUSTOM ROOM</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customRoom}
                  onChange={(e) => setCustomRoom(e.target.value)}
                  placeholder="room-name"
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 mono text-xs"
                  style={{ backgroundColor: "#1C1C1B", color: "#F2F0EB" }}
                >
                  GO
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ChatRoom
      auth={auth}
      room={room}
      onLogout={handleLogout}
    />
  );
}

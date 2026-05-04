"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage, User, AuthState } from "@/lib/types";
import MessageReactions from "./MessageReactions";
import EmojiPickerWrapper from "./EmojiPickerWrapper";
import GifPicker from "./GifPicker";
import StickerPicker from "./StickerPicker";

interface ChatRoomProps {
  auth: AuthState;
  room: string;
  onLogout: () => void;
}

export default function ChatRoom({ auth, room, onLogout }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<number>(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pollingRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const joinedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Join room on mount
  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", room, email: auth.email, name: auth.name }),
    })
      .then(() => setConnected(true))
      .catch(() => setConnected(false));

    return () => {
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", room, email: auth.email }),
      }).catch(() => {});
    };
  }, [room, auth.email, auth.name]);

  // Poll for messages
  useEffect(() => {
    async function poll() {
      try {
        const since = lastTimestampRef.current || "";
        const params = new URLSearchParams({ room, email: auth.email });
        if (since) params.set("since", String(since));

        const res = await fetch(`/api/chat?${params}`);
        if (!res.ok) return;

        const data = await res.json();
        setConnected(true);

        if (data.messages && data.messages.length > 0) {
          if (lastTimestampRef.current === 0) {
            // Initial load
            setMessages(data.messages);
          } else {
            // Append new messages
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m: ChatMessage) => m.id));
              const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
              if (newMsgs.length === 0) return prev;
              return [...prev, ...newMsgs];
            });
          }
          const maxTs = Math.max(...data.messages.map((m: ChatMessage) => m.timestamp));
          lastTimestampRef.current = maxTs;
        }

        // Update reactions on existing messages
        if (data.messages) {
          setMessages((prev) =>
            prev.map((existing: ChatMessage) => {
              const updated = data.messages.find((m: ChatMessage) => m.id === existing.id);
              if (updated && JSON.stringify(updated.reactions) !== JSON.stringify(existing.reactions)) {
                return { ...existing, reactions: updated.reactions };
              }
              return existing;
            })
          );
        }

        if (data.users) {
          setUsers(data.users);
        }

        if (data.typing) {
          setTypingUsers(data.typing);
        }
      } catch {
        setConnected(false);
      }
    }

    // Initial fetch
    poll();

    // Poll every 1 second for near-real-time
    pollingRef.current = setInterval(poll, 1000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [room, auth.email]);

  async function sendMessage(type: "message" | "gif" | "sticker", content: string) {
    if (!content.trim()) return;

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          room,
          type,
          sender: auth.name,
          senderEmail: auth.email,
          content: content.trim(),
        }),
      });

      if (type === "message") setInput("");
      setShowEmoji(false);
      setShowGif(false);
      setShowSticker(false);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }

  async function handleReact(messageId: string, emoji: string) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "react",
          room,
          messageId,
          emoji,
          email: auth.email,
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, reactions: data.message.reactions } : m
          )
        );
      }
    } catch (err) {
      console.error("Failed to react:", err);
    }
  }

  function handleTyping() {
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "typing",
        room,
        email: auth.email,
        name: auth.name,
        isTyping: true,
      }),
    }).catch(() => {});

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "typing",
          room,
          email: auth.email,
          name: auth.name,
          isTyping: false,
        }),
      }).catch(() => {});
    }, 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage("message", input);
    }
  }

  const onlineUsers = Object.values(users).filter((u) => u.online);
  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex h-screen" style={{ backgroundColor: "#F2F0EB", color: "#1C1C1B" }}>
      {/* Sidebar */}
      <div
        className="w-64 flex-shrink-0 flex flex-col border-r"
        style={{ borderColor: "rgba(0,0,0,0.1)", backgroundColor: "#EDEAE4" }}
      >
        <div className="p-5 border-b" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
          <h1 className="serif text-2xl font-semibold tracking-tighter">ZENITH.</h1>
          <p className="mono text-[9px] mt-1 tracking-widest" style={{ color: "#C9A690" }}>
            REAL-TIME CHAT
          </p>
        </div>

        <div className="p-4 border-b" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
          <div className="mono text-[10px] text-gray-500 mb-1">ROOM</div>
          <div className="mono text-sm font-bold"># {room}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mono text-[10px] text-gray-500 mb-3">
            ONLINE -- {onlineUsers.length}
          </div>
          <div className="space-y-2">
            {onlineUsers.map((user) => (
              <div key={user.email} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm truncate">{user.name}</span>
                {user.email === auth.email && (
                  <span className="mono text-[9px] px-1 py-0.5" style={{ backgroundColor: "#D4E157" }}>
                    YOU
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <div className="text-sm font-medium truncate">{auth.name}</div>
              <div className="mono text-[10px] text-gray-500 truncate">{auth.email}</div>
            </div>
            <button
              onClick={onLogout}
              className="mono text-[10px] px-3 py-1.5 border border-black hover:bg-black hover:text-white transition-colors flex-shrink-0"
            >
              EXIT
            </button>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "rgba(0,0,0,0.1)" }}
        >
          <div className="flex items-center gap-3">
            <span className="mono text-sm font-bold"># {room}</span>
            <span
              className={`mono text-[10px] px-2 py-0.5 ${connected ? "" : "bg-red-100 text-red-700"}`}
              style={connected ? { backgroundColor: "#D4E157" } : {}}
            >
              {connected ? "CONNECTED" : "RECONNECTING..."}
            </span>
          </div>
          <div className="mono text-[10px] text-gray-500">
            {onlineUsers.length} online
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="mono text-[11px] text-gray-400 mb-2">NO MESSAGES YET</div>
                <p className="text-sm text-gray-500">Start the conversation!</p>
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`group ${msg.type === "system" ? "text-center" : ""}`}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {msg.type === "system" ? (
                <div className="py-2">
                  <span className="mono text-[10px] text-gray-400 px-3 py-1 bg-gray-100 rounded-full">
                    {msg.content}
                  </span>
                </div>
              ) : (
                <div
                  className={`py-2 px-3 rounded transition-colors ${
                    hoveredMessageId === msg.id ? "bg-black/[0.03]" : ""
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-medium text-sm"
                      style={{ color: msg.senderEmail === auth.email ? "#2A382E" : "#1C1C1B" }}
                    >
                      {msg.sender}
                    </span>
                    <span className="mono text-[10px] text-gray-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {msg.type === "message" && (
                    <p className="text-sm mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  )}

                  {msg.type === "gif" && (
                    <div className="mt-1">
                      <img
                        src={msg.content}
                        alt="GIF"
                        className="max-w-xs rounded border border-gray-200"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {msg.type === "sticker" && (
                    <div className="mt-1 w-32 h-32">
                      <StickerDisplay url={msg.content} />
                    </div>
                  )}

                  <MessageReactions
                    reactions={msg.reactions || {}}
                    currentUserEmail={auth.email}
                    onReact={(emoji) => handleReact(msg.id, emoji)}
                  />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <div className="px-6 py-1">
            <span className="mono text-[11px] text-gray-400 italic">
              {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing...
            </span>
          </div>
        )}

        {/* Input area */}
        <div className="px-6 py-4 border-t" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
          <div className="relative">
            {showEmoji && (
              <EmojiPickerWrapper
                onSelect={(emoji) => {
                  setInput((prev) => prev + emoji);
                  setShowEmoji(false);
                }}
                onClose={() => setShowEmoji(false)}
              />
            )}
            {showGif && (
              <GifPicker
                onSelect={(url) => sendMessage("gif", url)}
                onClose={() => setShowGif(false)}
              />
            )}
            {showSticker && (
              <StickerPicker
                onSelect={(url) => sendMessage("sticker", url)}
                onClose={() => setShowSticker(false)}
              />
            )}

            <div className="flex items-end gap-2">
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setShowEmoji(!showEmoji);
                    setShowGif(false);
                    setShowSticker(false);
                  }}
                  className={`w-9 h-9 flex items-center justify-center border transition-colors text-lg ${
                    showEmoji
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-black"
                  }`}
                  title="Emoji"
                >
                  😊
                </button>
                <button
                  onClick={() => {
                    setShowGif(!showGif);
                    setShowEmoji(false);
                    setShowSticker(false);
                  }}
                  className={`w-9 h-9 flex items-center justify-center border transition-colors mono text-[10px] font-bold ${
                    showGif
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-black"
                  }`}
                  title="GIF"
                >
                  GIF
                </button>
                <button
                  onClick={() => {
                    setShowSticker(!showSticker);
                    setShowEmoji(false);
                    setShowGif(false);
                  }}
                  className={`w-9 h-9 flex items-center justify-center border transition-colors text-lg ${
                    showSticker
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-black"
                  }`}
                  title="Sticker"
                >
                  🎭
                </button>
              </div>

              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-sm resize-none focus:outline-none focus:border-black transition-colors"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  minHeight: "42px",
                  maxHeight: "120px",
                }}
              />

              <button
                onClick={() => sendMessage("message", input)}
                disabled={!input.trim()}
                className="px-5 py-2.5 mono text-xs transition-all disabled:opacity-30"
                style={{ backgroundColor: "#1C1C1B", color: "#F2F0EB" }}
              >
                SEND
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StickerDisplay({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAnimation() {
      try {
        const res = await fetch(url);
        if (cancelled) return;
        const animData = await res.json();
        if (cancelled || !containerRef.current) return;
        const lottie = (await import("lottie-web")).default;
        const anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: animData,
        });
        return () => anim.destroy();
      } catch {
        // fallback for invalid sticker URLs
      }
    }
    loadAnimation();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return <div ref={containerRef} className="w-full h-full" />;
}

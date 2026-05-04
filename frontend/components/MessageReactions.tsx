"use client";

import { useState } from "react";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👏"];

interface MessageReactionsProps {
  reactions: Record<string, string[]>;
  currentUserEmail: string;
  onReact: (emoji: string) => void;
}

export default function MessageReactions({ reactions, currentUserEmail, onReact }: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {hasReactions &&
        Object.entries(reactions).map(([emoji, users]) => {
          const userReacted = users.includes(currentUserEmail);
          return (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                userReacted
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400"
              }`}
            >
              <span>{emoji}</span>
              <span className="mono text-[10px]">{users.length}</span>
            </button>
          );
        })}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-xs transition-colors"
          title="Add reaction"
        >
          +
        </button>

        {showPicker && (
          <div className="absolute bottom-8 left-0 z-50 bg-white border border-gray-200 shadow-lg p-2 flex gap-1 rounded">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  setShowPicker(false);
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

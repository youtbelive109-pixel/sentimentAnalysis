"use client";

import { useEffect, useRef } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiPickerWrapperProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPickerWrapper({ onSelect, onClose }: EmojiPickerWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-16 left-0 z-50">
      <Picker
        data={data}
        onEmojiSelect={(emoji: { native: string }) => onSelect(emoji.native)}
        theme="light"
        previewPosition="none"
        skinTonePosition="none"
        maxFrequentRows={2}
      />
    </div>
  );
}

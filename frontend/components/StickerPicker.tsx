"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ALL_STICKERS } from "@/lib/stickers";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface StickerPickerProps {
  onSelect: (stickerUrl: string) => void;
  onClose: () => void;
}

export default function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
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
    <div
      ref={ref}
      className="absolute bottom-16 left-0 z-50 w-80 bg-white border border-gray-200 shadow-xl"
      style={{ maxHeight: "400px" }}
    >
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <span className="mono text-[10px] font-bold text-gray-500">STICKERS</span>
        <button onClick={onClose} className="text-gray-400 hover:text-black text-sm">x</button>
      </div>
      <div className="overflow-y-auto p-3 grid grid-cols-3 gap-3" style={{ maxHeight: "340px" }}>
        {ALL_STICKERS.map((sticker) => (
          <button
            key={sticker.name}
            onClick={() => onSelect(sticker.url)}
            className="flex flex-col items-center p-2 border border-gray-100 hover:border-black transition-colors rounded"
            title={sticker.name}
          >
            <div className="w-16 h-16 flex items-center justify-center">
              <StickerPreview url={sticker.url} />
            </div>
            <span className="mono text-[9px] text-gray-500 mt-1 truncate w-full text-center">
              {sticker.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StickerPreview({ url }: { url: string }) {
  // For Lottie stickers, we display them as small animations
  return (
    <div className="w-14 h-14">
      <LottieSticker url={url} />
    </div>
  );
}

function LottieSticker({ url }: { url: string }) {
  // Lottie-react can accept a URL path or an animation data object
  // We'll use an iframe approach for URL-based lotties, or fetch the JSON
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAnimation() {
      try {
        const res = await fetch(url);
        if (cancelled) return;
        const animData = await res.json();
        if (cancelled || !containerRef.current) return;
        // Dynamically import and render
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
        // Sticker URL might be invalid, show fallback
      }
    }
    loadAnimation();
    return () => { cancelled = true; };
  }, [url]);

  return <div ref={containerRef} className="w-full h-full" />;
}

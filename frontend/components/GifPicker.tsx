"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

// Using Tenor API v2 (free tier, no key required for limited usage)
// Fallback: use a curated set of popular GIFs
const TRENDING_GIFS = [
  "https://media.tenor.com/images/b7a1e88e6b2c2b68a0b0d4b0b0b0b0b0/tenor.gif",
];

const GIPHY_SEARCH_URL = "https://api.giphy.com/v1/gifs";
const GIPHY_API_KEY = "GlVGYHkr3WSBnllca54iNt0yFbjz7L65"; // Public beta key

interface GiphyGif {
  id: string;
  images: {
    fixed_height_small: { url: string };
    fixed_height: { url: string };
    original: { url: string };
  };
  title: string;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
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

  const fetchGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const endpoint = searchQuery.trim()
        ? `${GIPHY_SEARCH_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=g`
        : `${GIPHY_SEARCH_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.data || []);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifs("");
  }, [fetchGifs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) fetchGifs(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, fetchGifs]);

  return (
    <div
      ref={ref}
      className="absolute bottom-16 left-0 z-50 w-80 bg-white border border-gray-200 shadow-xl"
      style={{ maxHeight: "400px" }}
    >
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="mono text-[10px] font-bold text-gray-500">GIF_SEARCH</span>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-sm">x</button>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-black"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
      </div>
      <div className="overflow-y-auto p-2 grid grid-cols-2 gap-2" style={{ maxHeight: "300px" }}>
        {loading ? (
          <div className="col-span-2 text-center py-8 mono text-[11px] text-gray-400">
            Loading...
          </div>
        ) : gifs.length === 0 ? (
          <div className="col-span-2 text-center py-8 mono text-[11px] text-gray-400">
            No GIFs found
          </div>
        ) : (
          gifs.map((gif) => (
            <button
              key={gif.id}
              onClick={() => onSelect(gif.images.fixed_height.url)}
              className="overflow-hidden border border-gray-100 hover:border-black transition-colors"
            >
              <img
                src={gif.images.fixed_height_small.url}
                alt={gif.title}
                className="w-full h-24 object-cover"
                loading="lazy"
              />
            </button>
          ))
        )}
      </div>
      <div className="p-2 border-t border-gray-100 text-center">
        <span className="mono text-[9px] text-gray-400">Powered by GIPHY</span>
      </div>
    </div>
  );
}

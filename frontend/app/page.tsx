'use client';

import { useEffect, useRef, useState } from 'react';

type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'UNKNOWN';
type Order = 'time' | 'relevance';

interface Comment {
  text: string;
  sentiment: Sentiment;
  score: number;
}

const SENTIMENT = {
  POSITIVE: { label: 'Positive', rgb: '16, 185, 129',  dot: 'bg-emerald-400' },
  NEGATIVE: { label: 'Negative', rgb: '239, 68, 68',   dot: 'bg-red-400'     },
  NEUTRAL:  { label: 'Neutral',  rgb: '245, 158, 11',  dot: 'bg-amber-400'   },
  UNKNOWN:  { label: 'Unknown',  rgb: '113, 113, 122', dot: 'bg-zinc-500'    },
};

const BACKEND = 'https://sentimentanalysis-production-bcfe.up.railway.app';

export default function Home() {
  const [url, setUrl] = useState('');
  const [order, setOrder] = useState<Order>('time');
  const [maxResults, setMaxResults] = useState(20);
  const [inputValue, setInputValue] = useState('20');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [totalExpected, setTotalExpected] = useState(20);
  const esRef = useRef<EventSource | null>(null);
  const doneRef = useRef(false);

  // Wake the Railway container while the user is still on the page
  useEffect(() => {
    fetch(`${BACKEND}/health`).catch(() => {});
    return () => { esRef.current?.close(); };
  }, []);

  function handleCountInput(raw: string) {
    setInputValue(raw);
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1 && n <= 100) setMaxResults(n);
  }

  function commitCountInput() {
    const n = parseInt(inputValue, 10);
    if (isNaN(n) || n < 1) { setMaxResults(1); setInputValue('1'); }
    else if (n > 100)       { setMaxResults(100); setInputValue('100'); }
    else                    { setMaxResults(n); setInputValue(String(n)); }
  }

  function analyze() {
    if (!url.trim()) return;

    // Close any in-flight connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    doneRef.current = false;
    setLoading(true);
    setError(null);
    setComments([]);
    setStatusMessage('Connecting\u2026');
    setTotalExpected(maxResults);

    const streamUrl = `${BACKEND}/analyze/stream?url=${encodeURIComponent(url.trim())}&order=${order}&max_results=${maxResults}`;
    const es = new EventSource(streamUrl);
    esRef.current = es;

    // If no event arrives within 90 seconds, show a timeout error.
    // Resets on every incoming event so it only fires during a genuine stall.
    let timeoutId: ReturnType<typeof setTimeout>;
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!doneRef.current) {
          setError('The backend stopped responding. Please try again.');
          setLoading(false);
          es.close();
          esRef.current = null;
        }
      }, 90000);
    };
    resetTimeout();

    es.addEventListener('status', (e) => {
      resetTimeout();
      try { setStatusMessage(JSON.parse((e as MessageEvent).data).message); } catch {}
    });

    es.addEventListener('comment', (e) => {
      resetTimeout();
      const { text, sentiment, score } = JSON.parse((e as MessageEvent).data);
      setComments(prev => [...prev, { text, sentiment, score }]);
    });

    es.addEventListener('summary', () => {
      clearTimeout(timeoutId);
      doneRef.current = true;
      setLoading(false);
      es.close();
      esRef.current = null;
    });

    es.addEventListener('error', (e) => {
      if (doneRef.current) return; // already completed successfully, ignore connection close
      clearTimeout(timeoutId);
      const data = (e as MessageEvent).data;
      if (data) {
        try { setError(JSON.parse(data).detail ?? 'Something went wrong.'); }
        catch { setError('Something went wrong.'); }
      } else {
        // Connection-level error (network drop, Railway timeout, non-200 response)
        setError('Connection lost. The backend may have timed out.');
      }
      setLoading(false);
      es.close();
      esRef.current = null;
    });
  }

  const stats = comments.length > 0
    ? (() => {
        const total = comments.length;
        const pos = comments.filter(x => x.sentiment === 'POSITIVE').length;
        const neg = comments.filter(x => x.sentiment === 'NEGATIVE').length;
        const neu = comments.filter(x => x.sentiment === 'NEUTRAL').length;
        const avgConf = comments.reduce((s, x) => s + x.score, 0) / total;
        return { total, pos, neg, neu, avgConf };
      })()
    : null;

  return (
    <main className="min-h-screen bg-[#080808] text-[#e2e2e2]">
      <div className="max-w-2xl mx-auto px-5 py-14">

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 bg-[#111] border border-[#222] rounded-full px-3 py-1 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Powered by Twitter-RoBERTa
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
            YouTube Sentiment<br />Analyzer
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Paste a video URL to classify the mood of its comment section.
          </p>
        </div>

        {/* Input card */}
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-4 shadow-2xl">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analyze()}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-[#080808] border border-[#252525] rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
          />
          {/* Comment count */}
          <div className="mt-4 px-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 font-medium">Comments</span>
              <input
                type="number"
                min={1}
                max={100}
                value={inputValue}
                onChange={e => handleCountInput(e.target.value)}
                onBlur={commitCountInput}
                onKeyDown={e => e.key === 'Enter' && commitCountInput()}
                className="w-14 bg-[#080808] border border-[#252525] rounded-lg px-2 py-1 text-xs text-zinc-200 text-center tabular-nums focus:outline-none focus:border-zinc-600 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={maxResults}
              onChange={e => { const n = Number(e.target.value); setMaxResults(n); setInputValue(String(n)); }}
              className="w-full h-1 rounded-full appearance-none cursor-pointer bg-[#252525] accent-white"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-zinc-700">1</span>
              <span className="text-[10px] text-zinc-700">100</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            {/* Order toggle */}
            <div className="flex items-center bg-[#080808] border border-[#1f1f1f] rounded-lg p-0.5">
              {(['time', 'relevance'] as Order[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => setOrder(opt)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                    order === opt
                      ? 'bg-[#1f1f1f] text-white shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  {opt === 'time' ? 'Recent' : 'Relevant'}
                </button>
              ))}
            </div>
            {/* Submit */}
            <button
              onClick={analyze}
              disabled={loading || !url.trim()}
              className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-xl hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
            >
              {loading ? 'Analyzing…' : 'Analyze →'}
            </button>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="mt-12 flex flex-col items-center gap-3 text-zinc-600">
            <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin" />
            <p className="text-xs">{statusMessage}</p>
            {comments.length > 0 && (
              <p className="text-xs tabular-nums text-zinc-700">
                {comments.length} / {totalExpected} classified
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-start gap-3 bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3">
            <span className="text-red-500 text-sm leading-5">✕</span>
            <p className="text-sm text-red-400 leading-5">{error}</p>
          </div>
        )}

        {/* Results — render progressively as comments stream in */}
        {stats && (
          <div className="mt-10 space-y-6">

            {/* Summary */}
            <div>
              <p className="text-[11px] text-zinc-600 uppercase tracking-widest font-semibold mb-3">
                Summary · {stats.total} comment{stats.total !== 1 ? 's' : ''}{loading ? '…' : ''}
              </p>

              {/* Proportion bar */}
              <div className="flex h-1 rounded-full overflow-hidden mb-4 gap-px">
                {stats.pos > 0 && (
                  <div
                    className="bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(stats.pos / stats.total) * 100}%` }}
                  />
                )}
                {stats.neu > 0 && (
                  <div
                    className="bg-amber-500 transition-all duration-500"
                    style={{ width: `${(stats.neu / stats.total) * 100}%` }}
                  />
                )}
                {stats.neg > 0 && (
                  <div
                    className="bg-red-500 transition-all duration-500"
                    style={{ width: `${(stats.neg / stats.total) * 100}%` }}
                  />
                )}
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard
                  label="Positive"
                  value={String(stats.pos)}
                  sub={`${Math.round((stats.pos / stats.total) * 100)}%`}
                  valueClass="text-emerald-400"
                />
                <StatCard
                  label="Neutral"
                  value={String(stats.neu)}
                  sub={`${Math.round((stats.neu / stats.total) * 100)}%`}
                  valueClass="text-amber-400"
                />
                <StatCard
                  label="Negative"
                  value={String(stats.neg)}
                  sub={`${Math.round((stats.neg / stats.total) * 100)}%`}
                  valueClass="text-red-400"
                />
                <StatCard
                  label="Avg. Confidence"
                  value={`${Math.round(stats.avgConf * 100)}%`}
                  valueClass="text-white"
                />
              </div>
            </div>

            {/* Comment list */}
            <div>
              <p className="text-[11px] text-zinc-600 uppercase tracking-widest font-semibold mb-3">
                Comments
              </p>
              <div className="space-y-2">
                {comments.map((comment, i) => (
                  <CommentCard key={i} comment={comment} />
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-3.5">
      <p className="text-[11px] text-zinc-600 mb-1.5 font-medium">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${valueClass ?? 'text-white'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-700 mt-0.5">{sub}</p>}
    </div>
  );
}

function CommentCard({ comment }: { comment: Comment }) {
  const cfg = SENTIMENT[comment.sentiment] ?? SENTIMENT.UNKNOWN;
  // Map confidence [0.33–1.0] to background opacity [0.07–0.35]
  const bgOpacity = 0.07 + 0.28 * ((comment.score - 0.33) / 0.67);
  const clampedBg = Math.min(0.35, Math.max(0.07, bgOpacity));

  return (
    <div
      style={{
        backgroundColor: `rgba(${cfg.rgb}, ${clampedBg})`,
        borderColor: `rgba(${cfg.rgb}, 0.2)`,
      }}
      className="border rounded-xl px-4 py-3 transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-zinc-200 leading-relaxed flex-1 min-w-0 break-words">
          {comment.text}
        </p>
        <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
          {/* Sentiment label — dark bubble, white text, colored dot */}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-black/40 text-white border border-white/10">
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          {/* Confidence score — dark bubble, white text */}
          <span className="text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-full bg-black/40 text-white border border-white/10">
            {(comment.score * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

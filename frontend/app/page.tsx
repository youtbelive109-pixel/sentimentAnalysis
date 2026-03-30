'use client';

import { useState } from 'react';

type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'UNKNOWN';
type Order = 'time' | 'relevance';

interface Comment {
  text: string;
  sentiment: Sentiment;
  score: number;
}

interface AnalyzeResponse {
  video_id: string;
  comment_count: number;
  comments: Comment[];
}

const SENTIMENT = {
  POSITIVE: {
    label: 'Positive',
    pill: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    dot: 'bg-emerald-400',
  },
  NEGATIVE: {
    label: 'Negative',
    pill: 'bg-red-500/15 text-red-400 border border-red-500/25',
    dot: 'bg-red-400',
  },
  NEUTRAL: {
    label: 'Neutral',
    pill: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    dot: 'bg-amber-400',
  },
  UNKNOWN: {
    label: 'Unknown',
    pill: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/25',
    dot: 'bg-zinc-500',
  },
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [order, setOrder] = useState<Order>('time');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  async function analyze() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(
        `https://sentimentanalysis-production-bcfe.up.railway.app/analyze?url=${encodeURIComponent(url.trim())}&order=${order}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.detail ?? 'Something went wrong.');
      } else {
        setData(json);
      }
    } catch {
      setError('Could not reach the backend. Make sure it is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }

  const stats = data
    ? (() => {
        const c = data.comments;
        const total = c.length;
        const pos = c.filter(x => x.sentiment === 'POSITIVE').length;
        const neg = c.filter(x => x.sentiment === 'NEGATIVE').length;
        const neu = c.filter(x => x.sentiment === 'NEUTRAL').length;
        const avgConf = c.reduce((s, x) => s + x.score, 0) / total;
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
            Powered by DistilRoBERTa
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

        {/* Loading */}
        {loading && (
          <div className="mt-12 flex flex-col items-center gap-3 text-zinc-600">
            <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin" />
            <p className="text-xs">Fetching and classifying comments…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-start gap-3 bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3">
            <span className="text-red-500 text-sm leading-5">✕</span>
            <p className="text-sm text-red-400 leading-5">{error}</p>
          </div>
        )}

        {/* Results */}
        {data && stats && (
          <div className="mt-10 space-y-6">

            {/* Summary */}
            <div>
              <p className="text-[11px] text-zinc-600 uppercase tracking-widest font-semibold mb-3">
                Summary · {stats.total} comments
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
                {data.comments.map((comment, i) => (
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
  // Map confidence [0.33–1.0] to opacity [0.45–1.0]
  const opacity = Math.min(1, Math.max(0.45, 0.45 + 0.55 * ((comment.score - 0.33) / 0.67)));

  return (
    <div
      style={{ opacity }}
      className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl px-4 py-3 hover:border-[#2a2a2a] transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-zinc-300 leading-relaxed flex-1 min-w-0 break-words">
          {comment.text}
        </p>
        <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${cfg.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <span className="text-[11px] text-zinc-700 tabular-nums">
            {(comment.score * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

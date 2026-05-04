import { NextResponse } from "next/server";

const MODAL_BACKEND =
  "https://bsissa22--youtube-live-sentiment-sentimentapi-analyze.modal.run";
const VIDEO_ID = "HHEAW6sJ28w";

// Fallback mock data generators (used when Modal backend is unreachable or stream is offline)
const AUTHORS = [
  "CryptoKing99", "MariaTech", "JakeDev", "SarahCodes", "AlexTrader",
  "LunaStream", "MaxFinance", "ZoeAnalytics", "RyanBets", "EmmaData",
  "NoahCrypto", "OliviaAI", "LiamCharts", "AvaMining", "EthanDeFi",
  "MiaStonks", "BenBlockchain", "SophiaQuant", "DanielNFT", "ChloeDev",
];

const POSITIVE_MSGS = [
  "This is amazing! Great stream!", "Love this content, keep it up!",
  "Best explanation I've seen!", "So bullish right now!",
  "Incredible insights, thank you!", "This is the content we need!",
  "Absolutely fantastic stream!", "You're killing it today!",
  "Learning so much from this!", "Pure gold content right here!",
];

const NEGATIVE_MSGS = [
  "I don't agree with this take", "This doesn't make sense to me",
  "Not sure about this analysis", "Pretty bearish on this one",
  "I think this is wrong", "Disappointing stream today",
  "This advice could lose people money", "Way too optimistic imo",
];

const NEUTRAL_MSGS = [
  "Interesting perspective", "Can you elaborate on that?",
  "What about the macro outlook?", "How does this compare to last week?",
  "Anyone else watching from Europe?", "First time here, what did I miss?",
  "Is there a discord for this?", "When's the next stream?",
];

interface Message {
  text: string;
  author: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  confidence: number;
  time: string;
  type: string;
}

// In-memory fallback state
let fallbackHistory: Message[] = [];
let fallbackScores = { positive: 0, negative: 0, neutral: 0, total: 0 };
let fallbackTimeSeries: { time: string; positive: number; negative: number; neutral: number }[] = [];
let lastFallbackGen = 0;

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFallbackData() {
  const now = Date.now();
  if (now - lastFallbackGen < 3000 && fallbackHistory.length > 0) return;

  const count = 3 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    const positiveWeight = 0.50 + Math.sin(now / 30000) * 0.15;
    const negativeWeight = 0.25 + Math.cos(now / 20000) * 0.10;

    let sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    let text: string;

    if (rand < positiveWeight) {
      sentiment = "POSITIVE";
      text = randomItem(POSITIVE_MSGS);
    } else if (rand < positiveWeight + negativeWeight) {
      sentiment = "NEGATIVE";
      text = randomItem(NEGATIVE_MSGS);
    } else {
      sentiment = "NEUTRAL";
      text = randomItem(NEUTRAL_MSGS);
    }

    fallbackScores.total += 1;
    if (sentiment === "POSITIVE") fallbackScores.positive += 1;
    else if (sentiment === "NEGATIVE") fallbackScores.negative += 1;
    else fallbackScores.neutral += 1;

    fallbackHistory.push({
      text,
      author: randomItem(AUTHORS),
      sentiment,
      confidence: 0.75 + Math.random() * 0.24,
      time: new Date(now - (count - i) * 2000).toISOString(),
      type: Math.random() < 0.03 ? "superChat" : "textMessage",
    });
  }

  fallbackHistory = fallbackHistory.slice(-200);

  const recentMsgs = fallbackHistory.slice(-20);
  const timeStr = new Date().toISOString().slice(11, 19);
  fallbackTimeSeries.push({
    time: timeStr,
    positive: recentMsgs.filter((m) => m.sentiment === "POSITIVE").length,
    negative: recentMsgs.filter((m) => m.sentiment === "NEGATIVE").length,
    neutral: recentMsgs.filter((m) => m.sentiment === "NEUTRAL").length,
  });
  fallbackTimeSeries = fallbackTimeSeries.slice(-30);

  // Seed initial time series if empty
  if (fallbackTimeSeries.length < 10) {
    for (let i = 29; i >= fallbackTimeSeries.length; i--) {
      const t = new Date(now - i * 5000);
      fallbackTimeSeries.unshift({
        time: t.toISOString().slice(11, 19),
        positive: 5 + Math.floor(Math.random() * 8),
        negative: 2 + Math.floor(Math.random() * 5),
        neutral: 1 + Math.floor(Math.random() * 4),
      });
    }
  }

  lastFallbackGen = now;
}

function buildFallbackResponse() {
  generateFallbackData();
  const now = Date.now();
  const total = fallbackScores.total || 1;
  const posPct = Math.round((fallbackScores.positive / total) * 1000) / 10;
  const negPct = Math.round((fallbackScores.negative / total) * 1000) / 10;
  const neuPct = Math.round((fallbackScores.neutral / total) * 1000) / 10;

  let mood: string;
  if (posPct >= 70) mood = "VERY POSITIVE";
  else if (posPct >= 50) mood = "POSITIVE";
  else if (posPct >= 30) mood = "MIXED";
  else mood = "NEGATIVE";

  const hourlyData = [];
  for (let h = 0; h < 12; h++) {
    const hour = (new Date().getHours() - 11 + h + 24) % 24;
    hourlyData.push({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      positive: Math.floor(20 + Math.random() * 40 + Math.sin(h / 2) * 15),
      negative: Math.floor(8 + Math.random() * 20 + Math.cos(h / 3) * 8),
      neutral: Math.floor(5 + Math.random() * 15),
    });
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const heatmapData = days.map((day) => ({
    id: day,
    data: Array.from({ length: 12 }, (_, i) => ({
      x: `${(i * 2).toString().padStart(2, "0")}h`,
      y: Math.floor(Math.random() * 100),
    })),
  }));

  const radarData = [
    { metric: "Engagement", current: 70 + Math.floor(Math.random() * 20), average: 55 },
    { metric: "Positivity", current: Math.floor(posPct), average: 50 },
    { metric: "Activity", current: 60 + Math.floor(Math.random() * 30), average: 45 },
    { metric: "Retention", current: 50 + Math.floor(Math.random() * 35), average: 60 },
    { metric: "Growth", current: 40 + Math.floor(Math.random() * 40), average: 50 },
    { metric: "Virality", current: 30 + Math.floor(Math.random() * 50), average: 40 },
  ];

  const streamData = fallbackTimeSeries.slice(-20).map((d) => ({
    Positive: d.positive, Negative: d.negative, Neutral: d.neutral,
  }));

  const bumpData = [
    { id: "Positive", data: fallbackTimeSeries.slice(-10).map((d, i) => ({ x: i.toString(), y: d.positive >= d.negative ? 1 : 2 })) },
    { id: "Negative", data: fallbackTimeSeries.slice(-10).map((d, i) => ({ x: i.toString(), y: d.negative > d.positive ? 1 : 2 })) },
    { id: "Neutral", data: fallbackTimeSeries.slice(-10).map((_, i) => ({ x: i.toString(), y: 3 })) },
  ];

  const funnelData = [
    { id: "Total Messages", value: fallbackScores.total, label: "Total Messages" },
    { id: "Analyzed", value: Math.floor(fallbackScores.total * 0.95), label: "Analyzed" },
    { id: "High Confidence", value: Math.floor(fallbackScores.total * 0.78), label: "High Confidence" },
    { id: "Actionable", value: Math.floor(fallbackScores.total * 0.45), label: "Actionable" },
    { id: "Flagged", value: Math.floor(fallbackScores.total * 0.12), label: "Flagged" },
  ];

  const treemapData = {
    name: "sentiments",
    children: [
      { name: "Positive", children: [
        { name: "Excited", value: Math.max(1, Math.floor(fallbackScores.positive * 0.4)) },
        { name: "Happy", value: Math.max(1, Math.floor(fallbackScores.positive * 0.35)) },
        { name: "Grateful", value: Math.max(1, Math.floor(fallbackScores.positive * 0.25)) },
      ]},
      { name: "Negative", children: [
        { name: "Frustrated", value: Math.max(1, Math.floor(fallbackScores.negative * 0.5)) },
        { name: "Disappointed", value: Math.max(1, Math.floor(fallbackScores.negative * 0.3)) },
        { name: "Angry", value: Math.max(1, Math.floor(fallbackScores.negative * 0.2)) },
      ]},
      { name: "Neutral", children: [
        { name: "Curious", value: Math.max(1, Math.floor(fallbackScores.neutral * 0.6)) },
        { name: "Observing", value: Math.max(1, Math.floor(fallbackScores.neutral * 0.4)) },
      ]},
    ],
  };

  const calendarData = [];
  for (let i = 90; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    calendarData.push({ day: d.toISOString().split("T")[0], value: Math.floor(Math.random() * 100) });
  }

  const swarmData = fallbackHistory.slice(-60).map((m, i) => ({
    id: `msg-${i}`, group: m.sentiment, confidence: m.confidence, length: m.text.length,
  }));

  const superChats = fallbackHistory
    .filter((m) => m.type === "superChat")
    .slice(-10)
    .map((m) => ({ author: m.author, text: m.text, time: m.time, amount: "$" + (Math.floor(Math.random() * 10) * 5 + 5) + ".00" }));

  return {
    video_id: VIDEO_ID,
    url: `https://www.youtube.com/live/${VIDEO_ID}`,
    started_at: new Date(now - 3600000).toISOString(),
    is_live: false,
    data_source: "fallback",
    scores: fallbackScores,
    percentages: { positive: posPct, negative: negPct, neutral: neuPct },
    mood,
    messages: fallbackHistory.slice(-30).reverse(),
    super_chats: superChats,
    charts: {
      timeSeries: fallbackTimeSeries,
      hourly: hourlyData,
      pie: [
        { id: "Positive", label: "Positive", value: fallbackScores.positive || 25, color: "#2A7D4F" },
        { id: "Negative", label: "Negative", value: fallbackScores.negative || 10, color: "#C0392B" },
        { id: "Neutral", label: "Neutral", value: fallbackScores.neutral || 8, color: "#B8860B" },
      ],
      heatmap: heatmapData,
      radar: radarData,
      stream: streamData,
      bump: bumpData,
      funnel: funnelData,
      treemap: treemapData,
      calendar: calendarData,
      swarmplot: swarmData,
    },
  };
}

export async function GET() {
  try {
    // Try Modal backend first (real live data)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(
      `${MODAL_BACKEND}?video_id=${VIDEO_ID}&max_messages=30`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Modal returned ${res.status}`);
    }

    const modalData = await res.json();

    // If Modal returned an error or stream not live, add data_source tag
    if (modalData.error || !modalData.is_live) {
      // Use fallback data but indicate the Modal backend was reached
      const fallback = buildFallbackResponse();
      return NextResponse.json({
        ...fallback,
        data_source: "fallback (stream offline)",
        modal_error: modalData.error || "Stream not live",
      });
    }

    // Real data from Modal
    return NextResponse.json({
      ...modalData,
      data_source: "modal (live)",
    });
  } catch (err) {
    // Modal unreachable, use fallback
    const fallback = buildFallbackResponse();
    return NextResponse.json({
      ...fallback,
      data_source: "fallback (modal unreachable)",
      modal_error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

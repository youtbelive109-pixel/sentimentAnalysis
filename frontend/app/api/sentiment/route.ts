import { NextResponse } from "next/server";

const VIDEO_ID = "28quhLmJIdM";
const LIVE_URL = "https://www.youtube.com/live/28quhLmJIdM";

// Simulated authors
const AUTHORS = [
  "CryptoKing99", "MariaTech", "JakeDev", "SarahCodes", "AlexTrader",
  "LunaStream", "MaxFinance", "ZoeAnalytics", "RyanBets", "EmmaData",
  "NoahCrypto", "OliviaAI", "LiamCharts", "AvaMining", "EthanDeFi",
  "MiaStonks", "BenBlockchain", "SophiaQuant", "DanielNFT", "ChloeDev",
  "JamesHodl", "LilyVenture", "OscarYield", "RubyDAO", "SamuelWEB3",
  "GraceAlgo", "HenryStake", "VioletPool", "ArthurSwap", "PenelopeLend",
];

// Message templates for realistic chat
const POSITIVE_MSGS = [
  "This is amazing! Great stream!",
  "Love this content, keep it up!",
  "Best explanation I've seen!",
  "So bullish right now!",
  "Incredible insights, thank you!",
  "This is the content we need!",
  "Absolutely fantastic stream!",
  "You're killing it today!",
  "Learning so much from this!",
  "Pure gold content right here!",
  "This makes so much sense now!",
  "Finally someone explains it well!",
  "Top tier analysis as always!",
  "Can't stop watching, so good!",
  "This is exactly what I needed!",
  "Wow, that chart breakdown was perfect!",
  "Super helpful, subscribed!",
  "Been waiting for this stream all week!",
  "My portfolio thanks you!",
  "Genius level explanation!",
];

const NEGATIVE_MSGS = [
  "I don't agree with this take",
  "This doesn't make sense to me",
  "Not sure about this analysis",
  "Pretty bearish on this one",
  "I think this is wrong",
  "Disappointing stream today",
  "This advice could lose people money",
  "Way too optimistic imo",
  "I've seen better analysis elsewhere",
  "Not convinced by these numbers",
  "The data doesn't support this",
  "Too much speculation here",
  "This aged poorly already",
  "Hard disagree on this one",
  "Quality has gone down lately",
];

const NEUTRAL_MSGS = [
  "Interesting perspective",
  "Can you elaborate on that?",
  "What about the macro outlook?",
  "How does this compare to last week?",
  "Anyone else watching from Europe?",
  "First time here, what did I miss?",
  "Is there a discord for this?",
  "When's the next stream?",
  "Can you show that chart again?",
  "What platform do you use?",
  "How long have you been doing this?",
  "What's the ticker symbol?",
  "Drop a like if you're still watching",
  "Any thoughts on bonds?",
  "Is this recorded?",
];

interface Message {
  text: string;
  author: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  confidence: number;
  time: string;
  type: "textMessage" | "superChat";
}

// In-memory state (resets on cold start)
let messageHistory: Message[] = [];
let scores = { positive: 0, negative: 0, neutral: 0, total: 0 };
let superChats: { author: string; text: string; time: string; amount: string }[] = [];
let lastGenerated = 0;
let timeSeriesData: { time: string; positive: number; negative: number; neutral: number }[] = [];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMessages(count: number): Message[] {
  const now = Date.now();
  const msgs: Message[] = [];

  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    let sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    let text: string;

    // Weight: 55% positive, 25% negative, 20% neutral (with some variance)
    const positiveWeight = 0.50 + Math.sin(now / 30000) * 0.15;
    const negativeWeight = 0.25 + Math.cos(now / 20000) * 0.10;

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

    const isSuperChat = Math.random() < 0.03;
    const confidence = 0.75 + Math.random() * 0.24;
    const msgTime = new Date(now - (count - i) * 2000 + Math.random() * 1000);

    const msg: Message = {
      text,
      author: randomItem(AUTHORS),
      sentiment,
      confidence: Math.round(confidence * 1000) / 1000,
      time: msgTime.toISOString(),
      type: isSuperChat ? "superChat" : "textMessage",
    };

    msgs.push(msg);

    // Update scores
    scores.total += 1;
    if (sentiment === "POSITIVE") scores.positive += 1;
    else if (sentiment === "NEGATIVE") scores.negative += 1;
    else scores.neutral += 1;

    if (isSuperChat) {
      const amounts = ["$2.00", "$5.00", "$10.00", "$20.00", "$50.00", "$100.00"];
      superChats.push({
        author: msg.author,
        text: msg.text,
        time: msg.time,
        amount: randomItem(amounts),
      });
    }
  }

  return msgs;
}

function updateTimeSeries() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Count sentiment in last batch
  const recentMsgs = messageHistory.slice(-20);
  const pos = recentMsgs.filter((m) => m.sentiment === "POSITIVE").length;
  const neg = recentMsgs.filter((m) => m.sentiment === "NEGATIVE").length;
  const neu = recentMsgs.filter((m) => m.sentiment === "NEUTRAL").length;

  timeSeriesData.push({ time: timeStr, positive: pos, negative: neg, neutral: neu });

  // Keep last 30 data points
  if (timeSeriesData.length > 30) {
    timeSeriesData = timeSeriesData.slice(-30);
  }
}

export async function GET() {
  const now = Date.now();

  // Generate new messages every 3 seconds
  if (now - lastGenerated > 3000) {
    const newCount = 3 + Math.floor(Math.random() * 5);
    const newMsgs = generateMessages(newCount);
    messageHistory = [...messageHistory, ...newMsgs].slice(-200);
    updateTimeSeries();
    lastGenerated = now;
  }

  // Ensure we have initial time series data
  if (timeSeriesData.length === 0) {
    // Generate historical data points
    for (let i = 29; i >= 0; i--) {
      const t = new Date(now - i * 5000);
      const timeStr = t.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const pos = 5 + Math.floor(Math.random() * 8);
      const neg = 2 + Math.floor(Math.random() * 5);
      const neu = 1 + Math.floor(Math.random() * 4);
      timeSeriesData.push({ time: timeStr, positive: pos, negative: neg, neutral: neu });
    }
  }

  // Generate if empty
  if (messageHistory.length === 0) {
    const initialMsgs = generateMessages(50);
    messageHistory = initialMsgs;
    lastGenerated = now;
    updateTimeSeries();
  }

  const total = scores.total || 1;
  const posPct = Math.round((scores.positive / total) * 1000) / 10;
  const negPct = Math.round((scores.negative / total) * 1000) / 10;
  const neuPct = Math.round((scores.neutral / total) * 1000) / 10;

  // Mood calculation
  let mood: string;
  if (posPct >= 70) mood = "VERY POSITIVE";
  else if (posPct >= 50) mood = "POSITIVE";
  else if (posPct >= 30) mood = "MIXED";
  else mood = "NEGATIVE";

  // Hourly data for bar chart
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

  // Heatmap data (day x hour activity)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const heatmapData = days.map((day) => ({
    id: day,
    data: Array.from({ length: 12 }, (_, i) => ({
      x: `${(i * 2).toString().padStart(2, "0")}h`,
      y: Math.floor(Math.random() * 100),
    })),
  }));

  // Radar data
  const radarData = [
    { metric: "Engagement", current: 70 + Math.floor(Math.random() * 20), average: 55 },
    { metric: "Positivity", current: Math.floor(posPct), average: 50 },
    { metric: "Activity", current: 60 + Math.floor(Math.random() * 30), average: 45 },
    { metric: "Retention", current: 50 + Math.floor(Math.random() * 35), average: 60 },
    { metric: "Growth", current: 40 + Math.floor(Math.random() * 40), average: 50 },
    { metric: "Virality", current: 30 + Math.floor(Math.random() * 50), average: 40 },
  ];

  // Stream chart data
  const streamData = timeSeriesData.slice(-20).map((d) => ({
    Positive: d.positive,
    Negative: d.negative,
    Neutral: d.neutral,
  }));

  // Bump chart data
  const bumpData = [
    {
      id: "Positive",
      data: timeSeriesData.slice(-10).map((d, i) => ({
        x: i.toString(),
        y: d.positive > d.negative && d.positive > d.neutral ? 1 : d.positive > d.negative || d.positive > d.neutral ? 2 : 3,
      })),
    },
    {
      id: "Negative",
      data: timeSeriesData.slice(-10).map((d, i) => ({
        x: i.toString(),
        y: d.negative > d.positive && d.negative > d.neutral ? 1 : d.negative > d.positive || d.negative > d.neutral ? 2 : 3,
      })),
    },
    {
      id: "Neutral",
      data: timeSeriesData.slice(-10).map((d, i) => ({
        x: i.toString(),
        y: d.neutral > d.positive && d.neutral > d.negative ? 1 : d.neutral > d.positive || d.neutral > d.negative ? 2 : 3,
      })),
    },
  ];

  // Funnel data
  const funnelData = [
    { id: "Total Messages", value: scores.total, label: "Total Messages" },
    { id: "Analyzed", value: Math.floor(scores.total * 0.95), label: "Analyzed" },
    { id: "High Confidence", value: Math.floor(scores.total * 0.78), label: "High Confidence" },
    { id: "Actionable", value: Math.floor(scores.total * 0.45), label: "Actionable" },
    { id: "Flagged", value: Math.floor(scores.total * 0.12), label: "Flagged" },
  ];

  // Treemap data
  const treemapData = {
    name: "sentiments",
    children: [
      {
        name: "Positive",
        children: [
          { name: "Excited", value: Math.floor(scores.positive * 0.4) || 10 },
          { name: "Happy", value: Math.floor(scores.positive * 0.35) || 8 },
          { name: "Grateful", value: Math.floor(scores.positive * 0.25) || 5 },
        ],
      },
      {
        name: "Negative",
        children: [
          { name: "Frustrated", value: Math.floor(scores.negative * 0.5) || 6 },
          { name: "Disappointed", value: Math.floor(scores.negative * 0.3) || 4 },
          { name: "Angry", value: Math.floor(scores.negative * 0.2) || 2 },
        ],
      },
      {
        name: "Neutral",
        children: [
          { name: "Curious", value: Math.floor(scores.neutral * 0.6) || 5 },
          { name: "Observing", value: Math.floor(scores.neutral * 0.4) || 3 },
        ],
      },
    ],
  };

  // Calendar data (last 90 days)
  const calendarData = [];
  for (let i = 90; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    calendarData.push({
      day: d.toISOString().split("T")[0],
      value: Math.floor(Math.random() * 100),
    });
  }

  // Swarmplot data
  const swarmData = messageHistory.slice(-60).map((m, i) => ({
    id: `msg-${i}`,
    group: m.sentiment,
    confidence: m.confidence,
    length: m.text.length,
  }));

  return NextResponse.json({
    video_id: VIDEO_ID,
    url: LIVE_URL,
    started_at: new Date(now - 3600000).toISOString(),
    is_live: true,
    scores: {
      positive: scores.positive,
      negative: scores.negative,
      neutral: scores.neutral,
      total: scores.total,
    },
    percentages: { positive: posPct, negative: negPct, neutral: neuPct },
    mood,
    messages: messageHistory.slice(-30).reverse(),
    super_chats: superChats.slice(-10),
    charts: {
      timeSeries: timeSeriesData,
      hourly: hourlyData,
      pie: [
        { id: "Positive", label: "Positive", value: scores.positive || 25, color: "#2A7D4F" },
        { id: "Negative", label: "Negative", value: scores.negative || 10, color: "#C0392B" },
        { id: "Neutral", label: "Neutral", value: scores.neutral || 8, color: "#B8860B" },
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
  });
}

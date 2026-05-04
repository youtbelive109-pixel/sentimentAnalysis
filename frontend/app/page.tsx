"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamic imports for Nivo charts (SSR disabled)
const ResponsiveLine = dynamic(() => import("@nivo/line").then((m) => m.ResponsiveLine), { ssr: false });
const ResponsivePie = dynamic(() => import("@nivo/pie").then((m) => m.ResponsivePie), { ssr: false });
const ResponsiveBar = dynamic(() => import("@nivo/bar").then((m) => m.ResponsiveBar), { ssr: false });
const ResponsiveHeatMap = dynamic(() => import("@nivo/heatmap").then((m) => m.ResponsiveHeatMap), { ssr: false });
const ResponsiveRadar = dynamic(() => import("@nivo/radar").then((m) => m.ResponsiveRadar), { ssr: false });
const ResponsiveStream = dynamic(() => import("@nivo/stream").then((m) => m.ResponsiveStream), { ssr: false });
const ResponsiveBump = dynamic(() => import("@nivo/bump").then((m) => m.ResponsiveBump), { ssr: false });
const ResponsiveFunnel = dynamic(() => import("@nivo/funnel").then((m) => m.ResponsiveFunnel), { ssr: false });
const ResponsiveTreeMap = dynamic(() => import("@nivo/treemap").then((m) => m.ResponsiveTreeMap), { ssr: false });
const ResponsiveCalendar = dynamic(() => import("@nivo/calendar").then((m) => m.ResponsiveCalendar), { ssr: false });
const ResponsiveSwarmPlot = dynamic(() => import("@nivo/swarmplot").then((m) => m.ResponsiveSwarmPlot), { ssr: false });

// ─── Types ─────────────────────────────────────────────
interface Message {
  text: string;
  author: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  confidence: number;
  time: string;
  type: string;
}

interface SentimentData {
  video_id: string;
  url: string;
  is_live: boolean;
  scores: { positive: number; negative: number; neutral: number; total: number };
  percentages: { positive: number; negative: number; neutral: number };
  mood: string;
  messages: Message[];
  super_chats: { author: string; text: string; time: string; amount: string }[];
  charts: {
    timeSeries: { time: string; positive: number; negative: number; neutral: number }[];
    hourly: { hour: string; positive: number; negative: number; neutral: number }[];
    pie: { id: string; label: string; value: number; color: string }[];
    heatmap: { id: string; data: { x: string; y: number }[] }[];
    radar: { metric: string; current: number; average: number }[];
    stream: Record<string, number>[];
    bump: { id: string; data: { x: string; y: number }[] }[];
    funnel: { id: string; value: number; label: string }[];
    treemap: { name: string; children: unknown[] };
    calendar: { day: string; value: number }[];
    swarmplot: { id: string; group: string; confidence: number; length: number }[];
  };
}

// ─── Theme colors ──────────────────────────────────────
const COLORS = {
  positive: "#2A7D4F",
  negative: "#C0392B",
  neutral: "#B8860B",
  bg: "#F2F0EB",
  dark: "#1C1C1B",
  green: "#2A382E",
  accent: "#C9A690",
  lime: "#D4E157",
  muted: "#6B6B6B",
  border: "rgba(0,0,0,0.1)",
};

const NIVO_THEME = {
  background: "transparent",
  text: { fontSize: 11, fill: "#6B6B6B", fontFamily: "'JetBrains Mono', monospace" },
  axis: {
    domain: { line: { stroke: "rgba(0,0,0,0.15)", strokeWidth: 1 } },
    ticks: {
      line: { stroke: "rgba(0,0,0,0.1)", strokeWidth: 1 },
      text: { fontSize: 10, fill: "#6B6B6B", fontFamily: "'JetBrains Mono', monospace" },
    },
    legend: { text: { fontSize: 11, fill: "#1C1C1B", fontFamily: "'Inter', sans-serif" } },
  },
  grid: { line: { stroke: "rgba(0,0,0,0.06)", strokeWidth: 1 } },
  tooltip: {
    container: {
      background: "#F2F0EB",
      color: "#1C1C1B",
      fontSize: 12,
      borderRadius: 0,
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      border: "1px solid rgba(0,0,0,0.1)",
      fontFamily: "'JetBrains Mono', monospace",
    },
  },
  labels: { text: { fontSize: 11, fill: "#1C1C1B", fontFamily: "'JetBrains Mono', monospace" } },
  legends: { text: { fontSize: 10, fill: "#6B6B6B", fontFamily: "'JetBrains Mono', monospace" } },
};

// ─── Component ─────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "charts" | "feed">("overview");

  useEffect(() => {
    let cancelled = false;
    const doFetch = async () => {
      try {
        const res = await fetch("/api/sentiment");
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        // ignore
      }
    };
    doFetch();
    const interval = setInterval(() => {
      doFetch();
      setTick((t) => t + 1);
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <div className="text-center animate-entry">
          <div className="serif text-4xl font-light mb-4" style={{ color: COLORS.dark }}>
            ZENITH.
          </div>
          <div className="mono text-xs" style={{ color: COLORS.muted }}>
            INITIALIZING SENTIMENT ENGINE...
          </div>
        </div>
      </div>
    );
  }

  const lineData = [
    {
      id: "Positive",
      color: COLORS.positive,
      data: data.charts.timeSeries.map((d) => ({ x: d.time, y: d.positive })),
    },
    {
      id: "Negative",
      color: COLORS.negative,
      data: data.charts.timeSeries.map((d) => ({ x: d.time, y: d.negative })),
    },
    {
      id: "Neutral",
      color: COLORS.neutral,
      data: data.charts.timeSeries.map((d) => ({ x: d.time, y: d.neutral })),
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.dark }}>
      {/* ─── Header ─── */}
      <header
        className="w-full border-b px-6 py-5 flex justify-between items-center"
        style={{ borderColor: COLORS.border }}
      >
        <div className="flex items-center gap-6">
          <div className="serif text-2xl font-semibold tracking-tighter">ZENITH.</div>
          <div className="hidden md:flex items-center gap-1 mono text-[10px]" style={{ color: COLORS.muted }}>
            <span
              className="inline-block w-2 h-2 rounded-full pulse-live mr-1"
              style={{ background: data.is_live ? "#2A7D4F" : "#C0392B" }}
            />
            {data.is_live ? "STREAM_LIVE" : "STREAM_OFFLINE"}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="mono text-[10px] px-3 py-1" style={{ background: `${COLORS.lime}40`, color: COLORS.green }}>
            TICK_{tick}
          </div>
          <div
            className="mono text-[10px] border px-4 py-2 hover:bg-black hover:text-white transition-colors duration-300 cursor-pointer"
            style={{ borderColor: COLORS.dark }}
          >
            SYSTEM_LIVE
          </div>
        </div>
      </header>

      {/* ─── Sub-header ─── */}
      <div className="w-full border-b px-6 py-3 flex flex-wrap items-center gap-4 justify-between" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-4">
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mono text-[10px] underline"
            style={{ color: COLORS.accent }}
          >
            {data.url}
          </a>
          <span className="mono text-[10px]" style={{ color: COLORS.muted }}>
            ID: {data.video_id}
          </span>
        </div>
        <div className="flex gap-2">
          {(["overview", "charts", "feed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="mono text-[10px] px-4 py-1.5 transition-all duration-200"
              style={{
                background: activeTab === tab ? COLORS.dark : "transparent",
                color: activeTab === tab ? COLORS.bg : COLORS.muted,
                border: `1px solid ${activeTab === tab ? COLORS.dark : COLORS.border}`,
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* ─── Stats Cards ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="TOTAL MSGS" value={data.scores.total.toLocaleString()} />
          <StatCard label="POSITIVE" value={`${data.percentages.positive}%`} accent={COLORS.positive} />
          <StatCard label="NEGATIVE" value={`${data.percentages.negative}%`} accent={COLORS.negative} />
          <StatCard label="NEUTRAL" value={`${data.percentages.neutral}%`} accent={COLORS.neutral} />
          <StatCard label="SUPER CHATS" value={data.super_chats.length.toString()} accent={COLORS.accent} />
          <StatCard label="MOOD" value={data.mood} mood />
        </div>

        {/* ─── Ledger Card ─── */}
        <div className="zenith-card p-6 mb-8 animate-entry">
          <div className="flex justify-between border-b-2 border-dashed pb-4 mb-6" style={{ borderColor: "rgba(0,0,0,0.15)" }}>
            <div className="mono text-[10px]" style={{ color: COLORS.muted }}>
              LEDGER ID: {data.video_id.slice(0, 8).toUpperCase()}
            </div>
            <div className="mono text-[10px] px-2 py-0.5" style={{ background: COLORS.lime }}>
              {data.is_live ? "LIVE" : "OFFLINE"}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="mono text-[10px] mb-1" style={{ color: COLORS.muted }}>Sentiment Delta</div>
              <div className="mono text-sm font-bold" style={{ color: COLORS.positive }}>
                +{data.percentages.positive}%
              </div>
            </div>
            <div>
              <div className="mono text-[10px] mb-1" style={{ color: COLORS.muted }}>Negative Load</div>
              <div className="mono text-sm" style={{ color: COLORS.negative }}>
                {data.percentages.negative}%
              </div>
            </div>
            <div>
              <div className="mono text-[10px] mb-1" style={{ color: COLORS.muted }}>Confidence Avg</div>
              <div className="mono text-sm font-bold">
                {(data.messages.reduce((a, m) => a + m.confidence, 0) / Math.max(data.messages.length, 1) * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="mono text-[10px] mb-1" style={{ color: COLORS.muted }}>Strategy</div>
              <div className="mono text-sm font-bold" style={{ background: `${COLORS.lime}30`, display: "inline-block", padding: "0 4px" }}>
                LIVE_ANALYSIS
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t flex justify-center" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
            <div className="mono text-[9px]" style={{ color: COLORS.muted }}>
              ENCRYPTED VIA RSA-4096 &mdash; SENTIMENT SHIELD ACTIVE
            </div>
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="animate-entry">
            {/* ─── Row 1: Line + Pie ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <ChartCard title="SENTIMENT TIMELINE" subtitle="Real-time sentiment flow" span="lg:col-span-2">
                <div className="h-[300px]">
                  <ResponsiveLine
                    data={lineData}
                    theme={NIVO_THEME}
                    margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: 0, max: "auto" }}
                    curve="monotoneX"
                    enableArea
                    areaOpacity={0.08}
                    colors={[COLORS.positive, COLORS.negative, COLORS.neutral]}
                    lineWidth={2}
                    pointSize={4}
                    pointColor={COLORS.bg}
                    pointBorderWidth={2}
                    pointBorderColor={{ from: "serieColor" }}
                    enableGridX={false}
                    axisBottom={{
                      tickSize: 0,
                      tickPadding: 10,
                      tickRotation: -45,
                      tickValues: lineData[0].data.filter((_, i) => i % 5 === 0).map((d) => d.x),
                    }}
                    axisLeft={{ tickSize: 0, tickPadding: 10 }}
                    useMesh
                    legends={[
                      {
                        anchor: "top-right",
                        direction: "row",
                        translateY: -20,
                        itemWidth: 80,
                        itemHeight: 12,
                        symbolSize: 8,
                        symbolShape: "square",
                      },
                    ]}
                  />
                </div>
              </ChartCard>

              <ChartCard title="DISTRIBUTION" subtitle="Sentiment breakdown">
                <div className="h-[300px]">
                  <ResponsivePie
                    data={data.charts.pie}
                    theme={NIVO_THEME}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    innerRadius={0.6}
                    padAngle={2}
                    cornerRadius={2}
                    colors={{ datum: "data.color" }}
                    borderWidth={1}
                    borderColor="rgba(0,0,0,0.1)"
                    arcLabelsSkipAngle={10}
                    arcLabelsTextColor="#1C1C1B"
                    arcLabel={(d) => `${d.value}`}
                    arcLinkLabelsSkipAngle={10}
                    arcLinkLabelsTextColor={COLORS.muted}
                    arcLinkLabelsThickness={1}
                    arcLinkLabelsColor="rgba(0,0,0,0.2)"
                    enableArcLinkLabels
                  />
                </div>
              </ChartCard>
            </div>

            {/* ─── Row 2: Bar + Radar ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ChartCard title="HOURLY ACTIVITY" subtitle="Messages by hour">
                <div className="h-[280px]">
                  <ResponsiveBar
                    data={data.charts.hourly}
                    theme={NIVO_THEME}
                    keys={["positive", "negative", "neutral"]}
                    indexBy="hour"
                    margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                    padding={0.3}
                    groupMode="stacked"
                    colors={[COLORS.positive, COLORS.negative, COLORS.neutral]}
                    borderWidth={0}
                    axisBottom={{ tickSize: 0, tickPadding: 10, tickRotation: -45 }}
                    axisLeft={{ tickSize: 0, tickPadding: 10 }}
                    enableGridX={false}
                    enableLabel={false}
                    legends={[
                      {
                        dataFrom: "keys",
                        anchor: "top-right",
                        direction: "row",
                        translateY: -20,
                        itemWidth: 70,
                        itemHeight: 12,
                        symbolSize: 8,
                        symbolShape: "square",
                      },
                    ]}
                  />
                </div>
              </ChartCard>

              <ChartCard title="ENGAGEMENT RADAR" subtitle="Stream metrics">
                <div className="h-[280px]">
                  <ResponsiveRadar
                    data={data.charts.radar}
                    theme={NIVO_THEME}
                    keys={["current", "average"]}
                    indexBy="metric"
                    maxValue={100}
                    margin={{ top: 30, right: 60, bottom: 30, left: 60 }}
                    curve="linearClosed"
                    borderWidth={2}
                    borderColor={{ from: "color" }}
                    gridLevels={4}
                    gridShape="circular"
                    gridLabelOffset={16}
                    colors={[COLORS.green, COLORS.accent]}
                    fillOpacity={0.15}
                    blendMode="normal"
                    dotSize={6}
                    dotColor={COLORS.bg}
                    dotBorderWidth={2}
                    dotBorderColor={{ from: "color" }}
                    legends={[
                      {
                        anchor: "top-left",
                        direction: "column",
                        translateX: -50,
                        translateY: -20,
                        itemWidth: 60,
                        itemHeight: 14,
                        symbolSize: 8,
                        symbolShape: "square",
                      },
                    ]}
                  />
                </div>
              </ChartCard>
            </div>

            {/* ─── Row 3: Stream + Heatmap ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ChartCard title="SENTIMENT STREAM" subtitle="Stacked area flow">
                <div className="h-[260px]">
                  <ResponsiveStream
                    data={data.charts.stream}
                    theme={NIVO_THEME}
                    keys={["Positive", "Negative", "Neutral"]}
                    margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                    axisBottom={{
                      tickSize: 0,
                      tickPadding: 10,
                      tickValues: 5,
                    }}
                    axisLeft={{ tickSize: 0, tickPadding: 10 }}
                    curve="monotoneX"
                    offsetType="diverging"
                    colors={[COLORS.positive, COLORS.negative, COLORS.neutral]}
                    fillOpacity={0.7}
                    borderWidth={1}
                    borderColor={{ from: "color", modifiers: [["darker", 0.3]] }}
                    enableGridX={false}
                  />
                </div>
              </ChartCard>

              <ChartCard title="ACTIVITY HEATMAP" subtitle="Day x hour intensity">
                <div className="h-[260px]">
                  <ResponsiveHeatMap
                    data={data.charts.heatmap}
                    theme={NIVO_THEME}
                    margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                    axisTop={null}
                    axisBottom={{ tickSize: 0, tickPadding: 8 }}
                    axisLeft={{ tickSize: 0, tickPadding: 8 }}
                    colors={{
                      type: "sequential",
                      scheme: "greens",
                    }}
                    emptyColor={COLORS.bg}
                    borderWidth={1}
                    borderColor="rgba(0,0,0,0.05)"
                    labelTextColor={{ from: "color", modifiers: [["darker", 2]] }}
                    legends={[
                      {
                        anchor: "right",
                        translateX: 30,
                        length: 160,
                        thickness: 8,
                        direction: "column",
                        tickPosition: "after",
                        tickSize: 3,
                        tickSpacing: 4,
                      },
                    ]}
                  />
                </div>
              </ChartCard>
            </div>
          </div>
        )}

        {activeTab === "charts" && (
          <div className="animate-entry">
            {/* ─── Row 1: Bump + Funnel ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ChartCard title="SENTIMENT RANKING" subtitle="Bump chart - position over time">
                <div className="h-[300px]">
                  <ResponsiveBump
                    data={data.charts.bump}
                    theme={NIVO_THEME}
                    margin={{ top: 20, right: 80, bottom: 40, left: 60 }}
                    colors={[COLORS.positive, COLORS.negative, COLORS.neutral]}
                    lineWidth={3}
                    activeLineWidth={5}
                    inactiveLineWidth={2}
                    pointSize={8}
                    activePointSize={12}
                    pointColor={COLORS.bg}
                    pointBorderWidth={2}
                    pointBorderColor={{ from: "serie.color" }}
                    axisBottom={{ tickSize: 0, tickPadding: 10 }}
                    axisLeft={{ tickSize: 0, tickPadding: 10 }}
                  />
                </div>
              </ChartCard>

              <ChartCard title="ANALYSIS FUNNEL" subtitle="Message processing pipeline">
                <div className="h-[300px]">
                  <ResponsiveFunnel
                    data={data.charts.funnel}
                    theme={NIVO_THEME}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    colors={[COLORS.green, COLORS.positive, COLORS.accent, COLORS.neutral, COLORS.negative]}
                    borderWidth={1}
                    borderColor="rgba(0,0,0,0.1)"
                    labelColor="#1C1C1B"
                    enableBeforeSeparators={false}
                    enableAfterSeparators={false}
                    currentPartSizeExtension={10}
                    currentBorderWidth={2}
                    motionConfig="gentle"
                  />
                </div>
              </ChartCard>
            </div>

            {/* ─── Row 2: TreeMap + Calendar ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ChartCard title="SENTIMENT TREEMAP" subtitle="Emotion breakdown hierarchy">
                <div className="h-[300px]">
                  <ResponsiveTreeMap
                    data={data.charts.treemap}
                    theme={NIVO_THEME}
                    identity="name"
                    value="value"
                    margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    labelSkipSize={20}
                    labelTextColor="#1C1C1B"
                    parentLabelTextColor="#F2F0EB"
                    colors={[COLORS.positive, COLORS.negative, COLORS.neutral, COLORS.accent, COLORS.green]}
                    borderWidth={2}
                    borderColor="rgba(0,0,0,0.1)"
                    nodeOpacity={0.85}
                    parentLabelPosition="top"
                    parentLabelSize={18}
                  />
                </div>
              </ChartCard>

              <ChartCard title="ACTIVITY CALENDAR" subtitle="90-day activity heatmap">
                <div className="h-[300px]">
                  <ResponsiveCalendar
                    data={data.charts.calendar}
                    theme={NIVO_THEME}
                    from={data.charts.calendar[0]?.day || "2026-02-01"}
                    to={data.charts.calendar[data.charts.calendar.length - 1]?.day || "2026-05-04"}
                    emptyColor="#EDEAE4"
                    colors={["#d4e157", "#8bc34a", "#4caf50", "#2A7D4F"]}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    yearSpacing={40}
                    monthBorderColor="rgba(0,0,0,0.1)"
                    dayBorderWidth={1}
                    dayBorderColor="rgba(0,0,0,0.05)"
                  />
                </div>
              </ChartCard>
            </div>

            {/* ─── Row 3: Swarmplot + Extra Bar ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ChartCard title="CONFIDENCE SCATTER" subtitle="Message confidence by sentiment">
                <div className="h-[300px]">
                  <ResponsiveSwarmPlot
                    data={data.charts.swarmplot}
                    theme={NIVO_THEME}
                    groups={["POSITIVE", "NEGATIVE", "NEUTRAL"]}
                    id="id"
                    value="confidence"
                    valueScale={{ type: "linear", min: 0.7, max: 1 }}
                    size={{ key: "length", values: [5, 80], sizes: [4, 16] }}
                    spacing={2}
                    margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
                    colors={[COLORS.positive, COLORS.negative, COLORS.neutral]}
                    borderWidth={1}
                    borderColor="rgba(0,0,0,0.1)"
                    axisBottom={{ tickSize: 0, tickPadding: 10 }}
                    axisLeft={{ tickSize: 0, tickPadding: 10 }}
                  />
                </div>
              </ChartCard>

              <ChartCard title="SENTIMENT COMPARISON" subtitle="Grouped bar analysis">
                <div className="h-[300px]">
                  <ResponsiveBar
                    data={data.charts.hourly.slice(0, 6)}
                    theme={NIVO_THEME}
                    keys={["positive", "negative", "neutral"]}
                    indexBy="hour"
                    margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                    padding={0.2}
                    groupMode="grouped"
                    colors={[COLORS.positive, COLORS.negative, COLORS.neutral]}
                    borderWidth={0}
                    axisBottom={{ tickSize: 0, tickPadding: 10 }}
                    axisLeft={{ tickSize: 0, tickPadding: 10 }}
                    enableGridX={false}
                    enableLabel={false}
                    legends={[
                      {
                        dataFrom: "keys",
                        anchor: "top-right",
                        direction: "row",
                        translateY: -15,
                        itemWidth: 70,
                        itemHeight: 12,
                        symbolSize: 8,
                        symbolShape: "square",
                      },
                    ]}
                  />
                </div>
              </ChartCard>
            </div>
          </div>
        )}

        {activeTab === "feed" && (
          <div className="animate-entry">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ─── Live Feed ─── */}
              <div className="lg:col-span-2">
                <ChartCard title="LIVE MESSAGE FEED" subtitle={`${data.messages.length} recent messages`}>
                  <div className="max-h-[600px] overflow-y-auto space-y-2 pr-2">
                    {data.messages.map((msg, i) => (
                      <div
                        key={`${msg.time}-${i}`}
                        className="flex items-start gap-3 p-3 animate-slide"
                        style={{
                          background: "rgba(0,0,0,0.02)",
                          border: "1px solid rgba(0,0,0,0.05)",
                          animationDelay: `${i * 30}ms`,
                        }}
                      >
                        <span
                          className="inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{
                            background:
                              msg.sentiment === "POSITIVE"
                                ? COLORS.positive
                                : msg.sentiment === "NEGATIVE"
                                ? COLORS.negative
                                : COLORS.neutral,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="mono text-[10px] font-bold truncate" style={{ maxWidth: 120 }}>
                              {msg.author}
                            </span>
                            <span
                              className="mono text-[9px] px-1.5 py-0.5"
                              style={{
                                background:
                                  msg.sentiment === "POSITIVE"
                                    ? `${COLORS.positive}15`
                                    : msg.sentiment === "NEGATIVE"
                                    ? `${COLORS.negative}15`
                                    : `${COLORS.neutral}15`,
                                color:
                                  msg.sentiment === "POSITIVE"
                                    ? COLORS.positive
                                    : msg.sentiment === "NEGATIVE"
                                    ? COLORS.negative
                                    : COLORS.neutral,
                              }}
                            >
                              {msg.sentiment}
                            </span>
                            <span className="mono text-[9px]" style={{ color: COLORS.muted }}>
                              {(msg.confidence * 100).toFixed(0)}%
                            </span>
                            {msg.type === "superChat" && (
                              <span className="mono text-[9px] px-1.5 py-0.5" style={{ background: COLORS.lime }}>
                                SUPER
                              </span>
                            )}
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: COLORS.dark }}>
                            {msg.text}
                          </p>
                        </div>
                        <span className="mono text-[9px] flex-shrink-0" style={{ color: COLORS.muted }}>
                          {new Date(msg.time).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              </div>

              {/* ─── Sidebar ─── */}
              <div className="space-y-6">
                {/* Super Chats */}
                <ChartCard title="SUPER CHATS" subtitle={`${data.super_chats.length} donations`}>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto">
                    {data.super_chats.length === 0 ? (
                      <div className="mono text-[10px] text-center py-4" style={{ color: COLORS.muted }}>
                        AWAITING SUPER CHATS...
                      </div>
                    ) : (
                      data.super_chats.map((sc, i) => (
                        <div
                          key={`sc-${i}`}
                          className="p-3"
                          style={{ background: `${COLORS.lime}15`, border: `1px solid ${COLORS.lime}40` }}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="mono text-[10px] font-bold">{sc.author}</span>
                            <span className="mono text-[10px] font-bold" style={{ color: COLORS.positive }}>
                              {sc.amount}
                            </span>
                          </div>
                          <p className="text-[11px]" style={{ color: COLORS.muted }}>
                            {sc.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </ChartCard>

                {/* Mini Pie */}
                <ChartCard title="RATIO" subtitle="Current split">
                  <div className="h-[200px]">
                    <ResponsivePie
                      data={data.charts.pie}
                      theme={NIVO_THEME}
                      margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      innerRadius={0.7}
                      padAngle={3}
                      cornerRadius={2}
                      colors={{ datum: "data.color" }}
                      enableArcLabels={false}
                      enableArcLinkLabels={false}
                      borderWidth={1}
                      borderColor="rgba(0,0,0,0.1)"
                    />
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    {data.charts.pie.map((p) => (
                      <div key={p.id} className="flex items-center gap-1.5">
                        <span className="w-2 h-2" style={{ background: p.color }} />
                        <span className="mono text-[9px]">{p.label}</span>
                      </div>
                    ))}
                  </div>
                </ChartCard>

                {/* YouTube Embed */}
                <ChartCard title="LIVE STREAM" subtitle="YouTube embed">
                  <div className="aspect-video w-full">
                    <iframe
                      src={`https://www.youtube.com/embed/${data.video_id}?autoplay=0`}
                      className="w-full h-full"
                      style={{ border: "1px solid rgba(0,0,0,0.1)" }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="YouTube Live Stream"
                    />
                  </div>
                </ChartCard>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t px-6 py-4 mt-auto" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="mono text-[9px]" style={{ color: COLORS.muted }}>
            ZENITH SENTIMENT ENGINE v2.0 &mdash; PYTCHAT + DISTILBERT PIPELINE
          </div>
          <div className="mono text-[9px]" style={{ color: COLORS.muted }}>
            ENCRYPTED VIA RSA-4096 &mdash; ASSET SHIELD ACTIVE
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
  mood,
}: {
  label: string;
  value: string;
  accent?: string;
  mood?: boolean;
}) {
  return (
    <div className="zenith-card p-4">
      <div className="mono text-[9px] mb-2" style={{ color: COLORS.muted }}>
        {label}
      </div>
      <div
        className={`mono text-lg font-bold ${mood ? "text-sm" : ""}`}
        style={{ color: accent || COLORS.dark }}
      >
        {value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  span,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  span?: string;
}) {
  return (
    <div className={`zenith-card p-5 ${span || ""}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="mono text-[11px] font-bold tracking-wider">{title}</h3>
          {subtitle && (
            <p className="text-[11px] mt-0.5" style={{ color: COLORS.muted }}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="mono text-[9px] px-2 py-0.5" style={{ background: `${COLORS.lime}30`, color: COLORS.green }}>
          LIVE
        </div>
      </div>
      {children}
    </div>
  );
}

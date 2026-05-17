"use client";

import type { HotEvent } from "@/lib/hot-events";
import { motion } from "framer-motion";
import { Sparkline, computeSparklineData } from "./Sparkline";

const lifecycleMeta: Record<
  string,
  { label: string; color: string }
> = {
  emerging: { label: "萌芽", color: "bg-blue-50 text-blue-700 border-blue-200" },
  burst: { label: "爆发", color: "bg-red-50 text-red-700 border-red-200" },
  mature: { label: "成熟", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  decline: { label: "衰退", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

const riskMeta: Record<string, string> = {
  low: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const sourceBadge: Record<string, string> = {
  "Hacker News": "bg-purple-50 text-purple-700 border-purple-200",
  "微博热搜": "bg-red-50 text-red-700 border-red-200",
  "抖音站内": "bg-blue-50 text-blue-700 border-blue-200",
  "新闻网站": "bg-slate-100 text-slate-700 border-slate-200",
};

function RingProgress({ value, size = 40 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = Math.PI * r * 2;
  const pct = Math.min(1, value / 100);
  const offset = c * (1 - pct);
  const color = value >= 85 ? "#22c55e" : value >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e8e5dd"
        strokeWidth="3"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[10px] font-bold"
        fill="#111"
      >
        {value}
      </text>
    </svg>
  );
}

function confidenceColor(score: number) {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  return "text-red-500";
}

export function HotEventCard({
  event,
  active,
  onSelect,
}: {
  event: HotEvent;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const lifecycle = lifecycleMeta[event.lifecycleStage] ?? lifecycleMeta.emerging;
  const sparklineData = computeSparklineData(event.heatScore, event.lifecycleStage);
  const isP0 = event.heatLevel === "S" && event.lifecycleStage !== "decline";
  const sourceStyle =
    sourceBadge[event.sourceName] ??
    "bg-slate-50 text-slate-600 border-slate-200";

  // 用 heatScore 作为置信度的代理指标
  const confidence = Math.min(98, Math.round(event.heatScore * 0.85 + 10));

  return (
    <motion.button
      layout
      className={`relative w-full rounded-lg border p-3 text-left transition-colors ${
        isP0 ? "border-l-4 border-l-red-500" : "border-l-4 border-l-transparent"
      } ${
        active
          ? "border-[#e8752a] bg-[#fff7ed] ring-1 ring-[#e8752a]/30"
          : "border-[#e8e5dd] bg-white hover:border-[#ccc]"
      }`}
      onClick={() => onSelect(event.id)}
    >
      <div className="flex items-start gap-2.5">
        <RingProgress value={event.heatScore} />
        <div className="min-w-0 flex-1">
          {/* Title */}
          <p className="font-semibold text-sm leading-5 line-clamp-2">
            {event.title}
          </p>

          {/* Source + Type + Lifecycle + Risk badges */}
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${sourceStyle}`}
            >
              {event.sourceName}
            </span>
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${lifecycle.color}`}
            >
              {lifecycle.label}
            </span>
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${riskMeta[event.riskLevel]}`}
            >
              {event.riskLabel}风险
            </span>
            <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {event.eventTypeLabel}
            </span>
          </div>

          {/* Agent judgment summary */}
          <p className="mt-1.5 text-[11px] text-[#888] italic leading-4 line-clamp-1">
            {event.reason}
          </p>
        </div>

        {/* Right: Sparkline + Confidence */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Sparkline data={sparklineData} />
          <span className={`text-[10px] font-semibold ${confidenceColor(confidence)}`}>
            {confidence}%
          </span>
        </div>
      </div>
    </motion.button>
  );
}

export function HotEventCardPopover({ event }: { event: HotEvent }) {
  return (
    <div className="absolute left-full top-0 z-50 ml-2 w-64 rounded-lg border border-[#dcd8cf] bg-white p-3 shadow-lg pointer-events-none">
      <p className="text-sm font-semibold">{event.title}</p>
      <p className="mt-1 text-xs leading-5 text-[#555]">{event.summary}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {event.scoreFactors.slice(0, 3).map((f) => (
          <span
            key={f.label}
            className="rounded bg-[#f2f0ea] px-1.5 py-0.5 text-[10px] font-semibold"
          >
            {f.label} {f.value}
          </span>
        ))}
      </div>
    </div>
  );
}

"use client";

import type { HotEvent } from "@/lib/hot-events";
import { motion } from "framer-motion";

const lifecycleMeta: Record<
  string,
  { emoji: string; label: string; color: string }
> = {
  emerging: { emoji: "🔵", label: "萌芽", color: "bg-blue-100 text-blue-700" },
  burst: { emoji: "🟠", label: "爆发", color: "bg-orange-100 text-orange-700" },
  mature: { emoji: "🔴", label: "成熟", color: "bg-red-100 text-red-700" },
  decline: { emoji: "⚫", label: "衰退", color: "bg-gray-200 text-gray-600" },
};

const riskDot: Record<string, string> = {
  low: "bg-green-400",
  medium: "bg-yellow-400",
  high: "bg-red-500",
};

function RingProgress({
  value,
  size = 40,
}: {
  value: number;
  size?: number;
}) {
  const r = (size - 6) / 2;
  const c = Math.PI * r * 2;
  const pct = Math.min(1, value / 100);
  const offset = c * (1 - pct);
  const color = value >= 85 ? "#e8752a" : value >= 70 ? "#f0a060" : "#8ba888";

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

  return (
    <motion.button
      layout
      className={`rounded-lg border p-3 text-left transition-colors w-full ${
        active
          ? "border-[#e8752a] bg-[#fff7ed] ring-1 ring-[#e8752a]/30"
          : "border-[#e8e5dd] bg-white hover:border-[#ccc]"
      }`}
      onClick={() => onSelect(event.id)}
    >
      <div className="flex items-start gap-2.5">
        <RingProgress value={event.heatScore} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 font-semibold text-sm leading-5">
            {event.title}
          </p>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${lifecycle.color}`}
            >
              {lifecycle.emoji} {lifecycle.label}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#666]">
              <span
                className={`inline-block size-2 rounded-full ${riskDot[event.riskLevel]}`}
              />
              {event.riskLabel}风险
            </span>
            <span className="text-[11px] text-[#666]">{event.eventTypeLabel}</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export function HotEventCardPopover({ event }: { event: HotEvent }) {
  return (
    <div className="absolute left-full top-0 z-50 ml-2 w-64 rounded-lg border border-[#dcd8cf] bg-white p-3 shadow-lg pointer-events-none">
      <p className="text-sm font-semibold">{event.title}</p>
      <p className="mt-1 text-xs leading-5 text-[#555] line-clamp-3">
        {event.summary}
      </p>
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

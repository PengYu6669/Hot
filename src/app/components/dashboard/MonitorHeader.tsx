"use client";

import type { HotEvent } from "@/lib/hot-events";
import { AlertTriangle, X } from "lucide-react";
import { useState, useMemo } from "react";

type MonitorHeaderProps = {
  events: HotEvent[];
};

const lifecycleColors: Record<string, string> = {
  emerging: "bg-blue-100 text-blue-700 border-blue-300",
  burst: "bg-red-100 text-red-700 border-red-300",
  mature: "bg-yellow-100 text-yellow-700 border-yellow-300",
  decline: "bg-gray-100 text-gray-500 border-gray-300",
};

const lifecycleLabels: Record<string, string> = {
  emerging: "萌芽期",
  burst: "爆发期",
  mature: "成熟期",
  decline: "衰退期",
};

export function MonitorHeader({ events }: MonitorHeaderProps) {
  const [dismissBanner, setDismissBanner] = useState(false);

  const counts = useMemo(() => {
    const result: Record<string, number> = {
      emerging: 0,
      burst: 0,
      mature: 0,
      decline: 0,
    };
    events.forEach((e) => {
      result[e.lifecycleStage] = (result[e.lifecycleStage] ?? 0) + 1;
    });
    return result;
  }, [events]);

  const pendingCount = events.filter(
    (e) => e.heatScore >= 70 && e.lifecycleStage !== "decline",
  ).length;

  const topEvent = useMemo(() => {
    return events.find((e) => e.heatLevel === "S" && e.lifecycleStage !== "decline");
  }, [events]);

  const hasP0 = topEvent && topEvent.heatScore >= 90;

  return (
    <div className="space-y-2">
      {/* Alert banner */}
      {hasP0 && !dismissBanner && (
        <div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="size-4 text-red-500 shrink-0" />
            <span className="text-sm font-semibold text-red-700 truncate">
              P0 事件到达：{topEvent.title}，热度 {topEvent.heatScore}，建议立即介入
            </span>
          </div>
          <button
            className="shrink-0 ml-2 text-red-400 hover:text-red-600"
            onClick={() => setDismissBanner(true)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {/* Lifecycle blocks */}
        {Object.entries(lifecycleLabels).map(([key, label]) => (
          <div
            key={key}
            className={`rounded-lg border px-3 py-2 text-center ${lifecycleColors[key]}`}
          >
            <p className="text-[10px] font-semibold uppercase">{label}</p>
            <p className="text-xl font-bold">{counts[key] ?? 0}</p>
          </div>
        ))}

        {/* Pending */}
        <div className="rounded-lg border border-[#f0a060] bg-[#fff7ed] px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase text-[#b85b12]">
            待处理
          </p>
          <p className="text-xl font-bold text-[#e8752a]">{pendingCount}</p>
        </div>

        {/* Total */}
        <div className="rounded-lg border border-[#e8e5dd] bg-white px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase text-[#999]">
            总计
          </p>
          <p className="text-xl font-bold text-[#111]">{events.length}</p>
        </div>
      </div>

      {/* Agent status indicators */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-[11px] font-semibold text-[#666]">Agent 状态：</span>
        <AgentDot label="感知Agent" active pulse />
        <AgentDot label="挖掘Agent" active={false} />
        <AgentDot label="运营Agent" active={false} />
      </div>
    </div>
  );
}

function AgentDot({
  label,
  active,
  pulse,
}: {
  label: string;
  active: boolean;
  pulse?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex size-2">
        {active && pulse && (
          <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
        )}
        <span
          className={`relative size-2 rounded-full ${
            active ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      </span>
      <span className={active ? "text-[#111] font-medium" : "text-[#999]"}>
        {label}
      </span>
      {active && (
        <span className="text-[10px] text-green-600 font-medium">监听中</span>
      )}
      {!active && (
        <span className="text-[10px] text-[#999]">待命</span>
      )}
    </span>
  );
}

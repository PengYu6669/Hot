"use client";

import { useRef } from "react";
import ReactECharts from "echarts-for-react";
import type { ScoreFactor } from "@/lib/hot-events";

const dimLabels: Record<string, string> = {
  "时效信号": "时效窗口",
  "事件类型": "内容供给价值",
  "语义强度": "关注度压强",
  "可信来源": "信源可靠度",
};

export function RadarChart({
  factors,
  className = "",
}: {
  factors: ScoreFactor[];
  className?: string;
}) {
  const chartRef = useRef<ReactECharts>(null);

  const indicators = factors.map((f) => ({
    name: dimLabels[f.label] ?? f.label,
    max: 28,
  }));
  const data = factors.map((f) => f.value);

  const option = {
    radar: {
      center: ["50%", "52%"],
      radius: "65%",
      indicator: indicators,
      axisName: {
        color: "#666",
        fontSize: 11,
        fontWeight: 600,
      },
      shape: "polygon",
      splitNumber: 4,
      axisLine: { lineStyle: { color: "#e8e5dd" } },
      splitLine: { lineStyle: { color: "#e8e5dd" } },
      splitArea: {
        areaStyle: {
          color: ["#fbfaf7", "#f7f7f4", "#f2f0ea", "#fbfaf7"],
        },
      },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: data,
            name: "当前事件",
            areaStyle: { color: "rgba(240, 160, 96, 0.18)" },
            lineStyle: { color: "#e8752a", width: 2 },
            itemStyle: { color: "#e8752a" },
            symbol: "circle",
            symbolSize: 5,
          },
        ],
      },
    ],
  };

  return (
    <div className={className}>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: 260, width: "100%" }}
        notMerge
      />
      <p className="-mt-2 text-center text-[11px] text-[#999]">
        数据维度基于 AI HOT 条目元信息，非全量舆情数据
      </p>
    </div>
  );
}

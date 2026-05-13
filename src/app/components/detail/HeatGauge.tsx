"use client";

import ReactECharts from "echarts-for-react";

export function HeatGauge({
  value,
  level,
  className = "",
}: {
  value: number;
  level: "S" | "A" | "B";
  className?: string;
}) {
  const colorStops = level === "S" ? "#e8752a" : level === "A" ? "#f0a060" : "#8ba888";

  const option = {
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        center: ["50%", "55%"],
        radius: "85%",
        min: 0,
        max: 100,
        splitNumber: 5,
        axisLine: {
          show: true,
          lineStyle: {
            width: 18,
            color: [
              [0.6, "#ddd"],
              [0.7, "#e8e5dd"],
              [0.85, colorStops],
              [1, "#e8752a"],
            ],
          },
        },
        pointer: { icon: "circle", length: "60%", width: 8, itemStyle: { color: "#111" } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          formatter: "{value}",
          color: "#111",
          fontSize: 48,
          fontWeight: "bold",
          offsetCenter: [0, "70%"],
        },
        data: [{ value, name: level }],
      },
    ],
  };

  return (
    <div className={className}>
      <ReactECharts option={option} style={{ height: 240 }} notMerge />
      <p className="-mt-6 text-center text-xs font-semibold text-[#666]">
        {level} 级热度
      </p>
    </div>
  );
}

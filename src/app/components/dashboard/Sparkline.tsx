"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

type SparklineProps = {
  data: Array<{ value: number }>;
  width?: number;
  height?: number;
  color?: string;
};

export function Sparkline({
  data,
  width = 60,
  height = 30,
  color = "#3b82f6",
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-[10px] text-[#999]"
      >
        --
      </div>
    );
  }

  const trend = data[data.length - 1].value - data[0].value;
  const lineColor = trend >= 0 ? color : "#ef4444";

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function computeSparklineData(
  heatScore: number,
  lifecycle: string,
): Array<{ value: number }> {
  const points = 6;
  const data: Array<{ value: number }> = [];

  const trend =
    lifecycle === "emerging"
      ? "up"
      : lifecycle === "burst"
        ? "peak"
        : lifecycle === "mature"
          ? "flat"
          : "down";

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    let base: number;
    if (trend === "up") {
      base = heatScore - 15 + progress * 15;
    } else if (trend === "peak") {
      base = heatScore - 5 + Math.sin(progress * Math.PI) * 8;
    } else if (trend === "flat") {
      base = heatScore - 3 + (Math.random() - 0.5) * 4;
    } else {
      base = heatScore + 5 - progress * 10;
    }
    data.push({ value: Math.round(Math.max(0, base)) });
  }
  return data;
}

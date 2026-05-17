"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import type { TrendPoint } from "@/lib/trend-utils";

type HeatTrendChartProps = {
  data: TrendPoint[];
  currentValue: number;
  heatLevel: string;
  predictedPeak?: number;
  predictedPeakTime?: string;
  accuracy?: number;
};

export function HeatTrendChart({
  data,
  currentValue,
  heatLevel,
  predictedPeak,
  predictedPeakTime,
  accuracy = 85,
}: HeatTrendChartProps) {
  const historicalData = data.filter((d) => !d.predicted);
  const predictedData = data.filter((d) => d.predicted);
  const nowIndex = historicalData.length > 0 ? historicalData.length - 1 : 0;

  const allData = data.map((d, i) => ({
    ...d,
    index: i,
    isPredicted: d.predicted ?? false,
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={allData}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "#999" }}
                tickLine={false}
                axisLine={{ stroke: "#e8e5dd" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#999" }}
                tickLine={false}
                axisLine={false}
                domain={["dataMin - 10", "dataMax + 10"]}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #dcd8cf",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [value, "热度值"]}
                labelFormatter={(label) => `时间: ${label}`}
              />

              {/* 历史线 */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#3b82f6" }}
                activeDot={{ r: 5 }}
                connectNulls
                data={allData.filter((d) => !d.isPredicted)}
              />

              {/* 预测线 */}
              {predictedData.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={{ r: 3, fill: "#93c5fd", stroke: "#3b82f6" }}
                  connectNulls
                  data={allData.filter((d) => d.isPredicted)}
                />
              )}

              {/* NOW参考线 */}
              {historicalData.length > 0 && (
                <ReferenceLine
                  x={historicalData[historicalData.length - 1].time}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  label={{
                    value: "NOW",
                    position: "top",
                    fill: "#94a3b8",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* 置信区间阴影 */}
              {predictedData.length > 0 && (
                <ReferenceArea
                  x1={historicalData[historicalData.length - 1]?.time}
                  x2={predictedData[predictedData.length - 1]?.time}
                  y1={0}
                  y2={200}
                  fill="#3b82f6"
                  fillOpacity={0.04}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Right mini panel */}
        <div className="hidden xl:flex shrink-0 w-[120px] flex-col gap-2 rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3 text-center">
          <div>
            <p className="text-[10px] text-[#999] uppercase">热度</p>
            <p className="text-2xl font-bold text-[#111]">{currentValue}</p>
            <p className="text-[11px] font-semibold text-[#e8752a]">{heatLevel} 级</p>
          </div>
          {predictedPeak && (
            <div className="border-t border-[#e8e5dd] pt-2">
              <p className="text-[10px] text-[#999]">预测峰值</p>
              <p className="text-lg font-bold text-[#3b82f6]">{predictedPeak}</p>
              {predictedPeakTime && (
                <p className="text-[10px] text-[#666]">{predictedPeakTime}</p>
              )}
            </div>
          )}
          {accuracy && (
            <div className="border-t border-[#e8e5dd] pt-2">
              <p className="text-[10px] text-[#999]">预测准确率</p>
              <p className="text-sm font-semibold text-[#10b981]">{accuracy}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

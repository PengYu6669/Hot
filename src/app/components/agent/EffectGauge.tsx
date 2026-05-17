"use client";

import { motion } from "framer-motion";

type EffectMetric = {
  label: string;
  value: string;
  baseline: string;
  color?: string;
};

type EffectGaugeProps = {
  metrics: EffectMetric[];
  confidence: number;
  sampleSize: number;
  bestCase?: string;
  worstCase?: string;
};

export function EffectGauge({
  metrics,
  confidence,
  sampleSize,
  bestCase,
  worstCase,
}: EffectGaugeProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase text-[#707070]">
          效果预测
        </p>
        <p className="text-xs text-[#999]">
          基于 {sampleSize} 个相似案例，置信度 {confidence}%
        </p>
      </div>

      {/* Gauge metrics */}
      <div className="grid gap-3">
        {metrics.map((metric, i) => {
          const cleanValue = parseFloat(metric.value.replace(/[+%]/g, ""));
          const pct = Math.min(100, Math.max(0, (cleanValue / 200) * 100));
          const color = metric.color ?? "#3b82f6";

          return (
            <motion.div
              key={metric.label}
              className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#333]">
                  {metric.label}
                </span>
                <span className="text-sm font-bold" style={{ color }}>
                  {metric.value}
                </span>
              </div>

              {/* Mini bar */}
              <div className="relative h-3 rounded-full bg-[#e8e5dd] overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, delay: i * 0.15, ease: "easeOut" }}
                />
              </div>
              <p className="mt-1 text-[10px] text-[#999]">{metric.baseline}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Best/worst case */}
      {(bestCase || worstCase) && (
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          {bestCase && (
            <div className="rounded border border-green-200 bg-green-50 px-2 py-1.5 text-center">
              <span className="text-[#999]">最佳：</span>
              <span className="font-semibold text-green-700">{bestCase}</span>
            </div>
          )}
          {worstCase && (
            <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-center">
              <span className="text-[#999]">最差：</span>
              <span className="font-semibold text-red-600">{worstCase}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

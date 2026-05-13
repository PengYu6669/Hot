"use client";

import { motion } from "framer-motion";
import type { ScoreFactor } from "@/lib/hot-events";
import { CountUp } from "../shared/CountUp";

const factorColors: Record<string, string> = {
  "时效信号": "bg-blue-400",
  "事件类型": "bg-purple-400",
  "语义强度": "bg-orange-400",
  "可信来源": "bg-green-400",
};

export function FactorWaterfall({
  factors,
  className = "",
}: {
  factors: ScoreFactor[];
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-[#666] mb-3">热度因子拆解</p>
      <div className="space-y-3">
        {factors.map((factor, i) => {
          const pct = Math.min(100, (factor.value / 28) * 100);
          const barColor =
            factorColors[factor.label] ?? "bg-[#f0a060]";

          return (
            <motion.div
              key={factor.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{factor.label}</span>
                <span className="text-xs font-bold">
                  <CountUp value={factor.value} /> / 28
                </span>
              </div>
              <div className="h-6 rounded-full bg-[#f2f0ea] relative overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${barColor}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                />
              </div>
              <p className="mt-1 text-[10px] text-[#999] leading-4">
                {factor.evidence}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

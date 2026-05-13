"use client";

import { motion } from "framer-motion";
import type { LifecycleStage } from "@/lib/hot-events";

const steps: Array<{ id: LifecycleStage; label: string; emoji: string }> = [
  { id: "emerging", label: "萌芽期", emoji: "🔵" },
  { id: "burst", label: "爆发期", emoji: "🟠" },
  { id: "mature", label: "成熟期", emoji: "🔴" },
  { id: "decline", label: "衰退期", emoji: "⚫" },
];

const windowText: Record<LifecycleStage, string> = {
  emerging: "预计还有 6-12 小时介入窗口",
  burst: "介入窗口正在收窄，建议 4 小时内行动",
  mature: "窗口趋窄，二次传播机会为主",
  decline: "介入窗口已关闭，建议仅监控",
};

export function LifecycleTimeline({
  current,
  className = "",
}: {
  current: LifecycleStage;
  className?: string;
}) {
  const activeIndex = steps.findIndex((s) => s.id === current);

  return (
    <div className={className}>
      <p className="text-xs font-semibold text-[#666] mb-4">生命周期</p>
      <div className="relative">
        {/* Track */}
        <div className="absolute top-4 left-0 right-0 h-1.5 rounded-full bg-[#e8e5dd]" />
        {/* Fill */}
        <div
          className="absolute top-4 left-0 h-1.5 rounded-full bg-[#f0a060] transition-all duration-700"
          style={{
            width: `${((activeIndex + 1) / steps.length) * 100}%`,
          }}
        />
        {/* Nodes */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const active = step.id === current;
            const passed = index < activeIndex;

            return (
              <div key={step.id} className="flex flex-col items-center">
                {active ? (
                  <motion.div
                    className="relative size-8 rounded-full bg-[#e8752a] flex items-center justify-center"
                    animate={{ boxShadow: ["0 0 0 0 rgba(232,117,42,0.4)", "0 0 0 8px rgba(232,117,42,0)", "0 0 0 0 rgba(232,117,42,0.4)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-white text-xs">{step.emoji}</span>
                  </motion.div>
                ) : passed ? (
                  <div className="size-8 rounded-full bg-green-400 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                ) : (
                  <div className="size-8 rounded-full bg-[#e8e5dd] flex items-center justify-center">
                    <span className="text-xs opacity-30">{step.emoji}</span>
                  </div>
                )}
                <p
                  className={`mt-2 text-xs font-semibold ${
                    active ? "text-[#e8752a]" : passed ? "text-green-600" : "text-[#999]"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-4 text-xs text-[#e8752a] font-semibold text-center">
        {windowText[current]}
      </p>
    </div>
  );
}

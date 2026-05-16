"use client";

import { motion } from "framer-motion";
import type { AgentStepId } from "./types";

export type { AgentStepId } from "./types";

const stepOrder: AgentStepId[] = [
  "perceive",
  "mine",
  "plan",
  "guard",
  "confirm",
];

const stepMeta: Record<
  AgentStepId,
  { name: string; agent: string; output: string }
> = {
  perceive: {
    name: "线索感知",
    agent: "Perception Agent",
    output: "标准化热点事件",
  },
  mine: {
    name: "事件挖掘",
    agent: "Insight Agent",
    output: "热度、价值、生命周期",
  },
  plan: {
    name: "运营策略",
    agent: "Operation Agent",
    output: "内容策略包",
  },
  guard: {
    name: "管控判断",
    agent: "Risk Agent",
    output: "风险边界和人工断点",
  },
  confirm: {
    name: "人工确认",
    agent: "HITL",
    output: "确认、修改或否决",
  },
};

export function AgentPipeline({
  activeStep,
  onStepClick,
  className = "",
}: {
  activeStep: AgentStepId;
  onStepClick: (step: AgentStepId) => void;
  className?: string;
}) {
  const activeIndex = stepOrder.indexOf(activeStep);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase text-[#6b6b6b]">
          Agent 推理流水线
        </p>
        <span className="text-[11px] text-[#999]">
          当前：{stepMeta[activeStep].agent}
        </span>
      </div>

      <div className="flex items-stretch gap-1.5">
        {stepOrder.map((step, index) => {
          const active = step === activeStep;
          const done = index < activeIndex;

          return (
            <div key={step} className="flex-1">
              <button
                className={`w-full rounded-lg border py-2.5 px-2 text-center transition-colors relative overflow-hidden ${
                  active
                    ? "border-[#f0a060] bg-[#fff7ed]"
                    : done
                      ? "border-green-300 bg-green-50/60"
                      : "border-[#e8e5dd] bg-white"
                }`}
                onClick={() => onStepClick(step)}
              >
                {active && (
                  <motion.div
                    className="absolute inset-0 rounded-lg border-2 border-[#f0a060]"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
                <div className="relative z-10">
                  <span className="text-[10px] text-[#999]">
                    {done ? "完成" : `0${index + 1}`}
                  </span>
                  <p
                    className={`text-[11px] font-semibold mt-0.5 ${
                      active ? "text-[#e8752a]" : done ? "text-green-700" : ""
                    }`}
                  >
                    {stepMeta[step].name}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-[#999] text-center">
        点击任一环节查看当前输出和交接结果
      </p>
    </div>
  );
}

export function getStepMeta(step: AgentStepId) {
  return stepMeta[step];
}

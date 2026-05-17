"use client";

import { motion } from "framer-motion";
import { TrendingUp, AlertOctagon, Play } from "lucide-react";

export type DouyinAction = {
  id: string;
  actionType: string;
  description: string;
  estimatedCost: string;
  expectedEffect: string;
  timeWindow: string;
};

export type ScalingRule = {
  id: string;
  conditions: string[];
  action: string;
  levels: string[];
};

export type StopLossRule = {
  id: string;
  conditions: string[];
  maxLoss: string;
};

type ActionCardsProps = {
  douyinActions: DouyinAction[];
  scalingRules: ScalingRule[];
  stopLossRules: StopLossRule[];
};

export function ActionCards({
  douyinActions,
  scalingRules,
  stopLossRules,
}: ActionCardsProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase text-[#707070]">
          运营动作
        </p>
        <p className="text-xs text-[#999]">抖音动作 · 放量规则 · 停投规则</p>
      </div>

      {/* Douyin action cards */}
      {douyinActions.map((action, i) => (
        <motion.div
          key={action.id}
          className="rounded-lg border border-[#e8e5dd] bg-white p-3 shadow-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Play className="size-4 text-blue-500" />
            <span className="rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-semibold">
              {action.actionType}
            </span>
          </div>
          <p className="text-sm leading-5 text-[#333]">{action.description}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <span className="text-[#999]">预估成本</span>
              <p className="font-semibold text-[#111]">{action.estimatedCost}</p>
            </div>
            <div>
              <span className="text-[#999]">预期效果</span>
              <p className="font-semibold text-green-600">{action.expectedEffect}</p>
            </div>
            <div>
              <span className="text-[#999]">执行窗口</span>
              <p className="font-semibold text-[#111]">{action.timeWindow}</p>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Scaling rule card */}
      {scalingRules.map((rule, i) => (
        <motion.div
          key={rule.id}
          className="rounded-lg border border-[#e8e5dd] bg-gradient-to-r from-green-50/50 to-white p-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="size-4 text-green-600" />
            <span className="text-xs font-semibold text-green-700">放量规则</span>
          </div>

          {/* Conditions */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {rule.conditions.map((cond, ci) => (
              <span
                key={ci}
                className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] text-green-700"
              >
                {cond}
              </span>
            ))}
            <span className="text-[10px] font-semibold text-[#666]">THEN</span>
            <span className="rounded bg-green-600 text-white px-2 py-0.5 text-[10px] font-semibold">
              {rule.action}
            </span>
          </div>

          {/* Levels */}
          <div className="flex items-center gap-1.5 text-[10px]">
            {rule.levels.map((level, li) => (
              <span key={li} className="flex items-center gap-1">
                <span className="text-[#999]">{level}</span>
                {li < rule.levels.length - 1 && (
                  <span className="text-green-400">→</span>
                )}
              </span>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Stop-loss rule card */}
      {stopLossRules.map((rule, i) => (
        <motion.div
          key={rule.id}
          className="rounded-lg border border-[#e8e5dd] bg-gradient-to-r from-red-50/50 to-white p-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.05 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertOctagon className="size-4 text-red-500" />
            <span className="text-xs font-semibold text-red-600">停投规则</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {rule.conditions.map((cond, ci) => (
              <span
                key={ci}
                className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] text-red-700"
              >
                {cond}
              </span>
            ))}
          </div>
          <p className="text-xs text-[#666]">
            预估最大亏损线：<span className="font-semibold text-red-600">{rule.maxLoss}</span>
          </p>
        </motion.div>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Typewriter } from "../shared/Typewriter";
import type { DecisionStatus, RejectReason } from "./types";

type AgentMessage = {
  conclusion: string;
  tags: Array<{ label: string; value: string }>;
  why: string;
  agentReasoning?: string;
  heatAnalysis?: string;
  riskAssessment?: string;
  llmGenerated?: boolean;
};

export function AgentDialogue({
  message,
  decision,
  onDecision,
  onReject,
  className = "",
}: {
  message: AgentMessage;
  decision: DecisionStatus;
  onDecision: (status: "confirmed" | "modified") => void;
  onReject: (reason: RejectReason) => void;
  className?: string;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [typedComplete, setTypedComplete] = useState(false);

  const rejectReasons: Array<{
    id: RejectReason;
    label: string;
    desc: string;
  }> = [
    { id: "tone", label: "不符合平台调性", desc: "内容风格或角度与平台不匹配" },
    { id: "risk", label: "风险过高", desc: "存在内容安全或合规风险" },
    { id: "stale", label: "已过时效", desc: "热点已降温，介入窗口已关闭" },
    { id: "other", label: "其他原因", desc: "运营判断需要更灵活的处理方式" },
  ];

  return (
    <div className={className}>
      {/* Agent header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <div className="size-10 rounded-full bg-[#f0a060] flex items-center justify-center text-white font-bold text-sm">
            AI
          </div>
          {decision === "pending" && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[#0a0]"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>
        <div>
          <p className="font-semibold text-sm flex items-center gap-2">
            热点 Agent
            {message.llmGenerated && (
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                LLM
              </span>
            )}
          </p>
          <p className="text-[11px] text-[#999]">
            {decision === "pending"
              ? "分析完成，等待确认"
              : decision === "confirmed"
                ? "已确认，进入执行"
                : decision === "modified"
                  ? "等待二次确认"
                  : "已否决"}
          </p>
        </div>
      </div>

      {/* Conclusion */}
      <div className="rounded-lg bg-[#fbfaf7] border border-[#e8e5dd] p-3">
        <p className="text-[11px] font-bold uppercase text-[#6b6b6b] mb-1">
          结论
        </p>
        <Typewriter
          text={message.conclusion}
          speed={35}
          onComplete={() => setTypedComplete(true)}
          className="text-sm leading-6 text-[#333]"
        />
      </div>

      {/* Tags */}
      {typedComplete && (
        <motion.div
          className="mt-2 flex flex-wrap gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message.tags.map((tag) => (
            <span
              key={tag.label}
              className="inline-flex items-center gap-1 rounded-full bg-[#fff7ed] border border-[#f0a060]/30 px-2 py-0.5 text-[11px] font-semibold"
            >
              {tag.label}
              <span className="text-[#e8752a]">{tag.value}</span>
            </span>
          ))}
        </motion.div>
      )}

      {/* Why expandable */}
      {typedComplete && (
        <motion.div
          className="mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <button
            className="text-[11px] font-semibold text-[#e8752a] hover:underline"
            onClick={() => setShowWhy(!showWhy)}
          >
            {showWhy ? "收起依据 ↑" : "为什么这样判断 →"}
          </button>
          <AnimatePresence>
            {showWhy && (
              <motion.div
                className="mt-2 text-xs leading-5 text-[#666] bg-[#fbfaf7] rounded-lg p-3 border border-[#e8e5dd]"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <p className="whitespace-pre-wrap">{message.why}</p>
                {message.heatAnalysis && (
                  <div className="mt-3 pt-3 border-t border-[#e8e5dd]">
                    <p className="text-[11px] font-bold text-[#6b6b6b] mb-1">热度分析</p>
                    <p className="whitespace-pre-wrap">{message.heatAnalysis}</p>
                  </div>
                )}
                {message.riskAssessment && (
                  <div className="mt-3 pt-3 border-t border-[#e8e5dd]">
                    <p className="text-[11px] font-bold text-[#6b6b6b] mb-1">风险评估</p>
                    <p className="whitespace-pre-wrap">{message.riskAssessment}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Floating action bar */}
      {typedComplete && (
        <motion.div
          className="mt-4 flex gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              decision === "confirmed"
                ? "bg-green-600 text-white"
                : "bg-[#111] text-white hover:bg-[#333]"
            }`}
            onClick={() => onDecision("confirmed")}
          >
            ✅ 同意
          </button>
          <button
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold border transition-colors ${
              decision === "modified"
                ? "bg-[#e9e1ff] border-[#4b328f] text-[#4b328f]"
                : "border-[#111] bg-white hover:bg-[#f7f7f4]"
            }`}
            onClick={() => onDecision("modified")}
          >
            ✏️ 修改
          </button>
          <button
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold border transition-colors ${
              decision === "rejected"
                ? "bg-red-100 border-red-400 text-red-700"
                : "border-[#111] bg-white hover:bg-[#f7f7f4]"
            }`}
            onClick={() => setShowRejectPanel(!showRejectPanel)}
          >
            ❌ 否决
          </button>
        </motion.div>
      )}

      {/* Reject reason panel */}
      <AnimatePresence>
        {showRejectPanel && (
          <motion.div
            className="mt-2 grid gap-1.5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {rejectReasons.map((r) => (
              <button
                key={r.id}
                className="w-full rounded-lg border border-[#e8e5dd] bg-white p-2 text-left hover:bg-[#f7f7f4] transition-colors"
                onClick={() => {
                  onReject(r.id);
                  setShowRejectPanel(false);
                }}
              >
                <span className="text-xs font-semibold">{r.label}</span>
                <span className="text-[11px] text-[#999] ml-2">{r.desc}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic feedback */}
      {decision === "rejected" && (
        <motion.p
          className="mt-3 text-[11px] text-[#999] italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {message.llmGenerated
            ? "Agent 学到了：你对这类内容更谨慎，该判断将作为负样本回流给评分和风控规则。"
            : "Agent 学到了：你对这类内容更谨慎，下次会调整置信度阈值。"}
        </motion.p>
      )}
      {decision === "confirmed" && typedComplete && (
        <motion.p
          className="mt-3 text-[11px] text-[#999] italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {message.llmGenerated
            ? "Agent 学到了：该策略模式已确认为有效模板，可复用至同类事件。"
            : "Agent 学到了：这类策略模式可以复用为模板。"}
        </motion.p>
      )}
    </div>
  );
}

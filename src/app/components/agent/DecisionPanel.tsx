"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle2, Edit3, XCircle } from "lucide-react";

type DecisionPanelProps = {
  slaMinutes?: number;
  riskSummary: string[];
  agentRecommendation: string;
  recommendationReason: string;
  onConfirm: () => void;
  onModify: () => void;
  onReject: (reason: string) => void;
};

export function DecisionPanel({
  slaMinutes = 10,
  riskSummary,
  agentRecommendation,
  recommendationReason,
  onConfirm,
  onModify,
  onReject,
}: DecisionPanelProps) {
  const [timeLeft, setTimeLeft] = useState(slaMinutes * 60);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 180; // < 3 min

  return (
    <div className="space-y-4">
      {/* SLA countdown */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase text-[#707070]">
          决策面板
        </p>
        <div
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
            isUrgent
              ? "border-red-300 bg-red-50 text-red-600 animate-pulse"
              : "border-[#dcd8cf] bg-white text-[#666]"
          }`}
        >
          <Clock className="size-3" />
          <span>
            SLA: {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="text-center py-2 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm font-semibold text-blue-700">待人工确认</p>
      </div>

      {/* Risk summary */}
      {riskSummary.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-yellow-600" />
            <p className="text-[11px] font-semibold text-[#666]">风险摘要</p>
          </div>
          <ul className="space-y-1">
            {riskSummary.map((risk, i) => (
              <li key={i} className="text-xs text-[#666] flex items-start gap-1.5">
                <span className="text-yellow-500 mt-0.5">•</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Agent recommendation */}
      <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
        <p className="text-[11px] font-semibold text-[#777]">Agent 建议</p>
        <p className="mt-1 text-sm font-semibold text-[#111]">
          {agentRecommendation}
        </p>
        <p className="mt-1 text-xs text-[#666] leading-5">
          {recommendationReason}
        </p>
      </div>

      {/* Action buttons */}
      <div className="grid gap-2">
        <button
          className="flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white py-2.5 text-sm font-semibold transition-colors"
          onClick={onConfirm}
        >
          <CheckCircle2 className="size-4" />
          确认执行
        </button>
        <button
          className="flex items-center justify-center gap-2 rounded-lg border border-[#3b82f6] text-[#3b82f6] hover:bg-blue-50 py-2.5 text-sm font-semibold transition-colors"
          onClick={onModify}
        >
          <Edit3 className="size-4" />
          改写策略
        </button>
        <button
          className="flex items-center justify-center gap-2 rounded-lg border border-[#ef4444] text-[#ef4444] hover:bg-red-50 py-2.5 text-sm font-semibold transition-colors"
          onClick={() => setShowRejectModal(true)}
        >
          <XCircle className="size-4" />
          否决
        </button>
      </div>

      {/* Reject modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              className="bg-white rounded-xl border border-[#dcd8cf] shadow-xl p-6 w-[400px] max-w-[90vw]"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-[#111] mb-3">
                确认否决此策略？
              </h3>
              <p className="text-sm text-[#666] mb-4">
                否决后该事件将回退到待处理状态，Agent 会根据反馈调整后续策略。
              </p>
              <textarea
                className="w-full rounded-lg border border-[#dcd8cf] p-3 text-sm resize-none h-24 outline-none focus:border-[#ef4444]"
                placeholder="请填写否决原因（必填）"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  className="rounded-lg border border-[#dcd8cf] px-4 py-2 text-sm font-semibold hover:bg-[#f7f7f4]"
                  onClick={() => setShowRejectModal(false)}
                >
                  取消
                </button>
                <button
                  className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                  disabled={!rejectReason.trim()}
                  onClick={() => {
                    onReject(rejectReason);
                    setShowRejectModal(false);
                  }}
                >
                  确认否决
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

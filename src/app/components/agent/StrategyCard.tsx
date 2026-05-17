"use client";

import { motion } from "framer-motion";
import { FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { SOPMatch, RiskWarning } from "@/lib/agent-helpers";

type StrategyCardProps = {
  sopMatch: SOPMatch;
  riskWarnings: RiskWarning[];
  hasStrategy: boolean;
  isAdopting: boolean;
  onAdopt: () => void;
};

export function StrategyCard({
  sopMatch,
  riskWarnings,
  hasStrategy,
  isAdopting,
  onAdopt,
}: StrategyCardProps) {
  return (
    <motion.div
      className="bg-white rounded-xl border-2 border-blue-200 shadow-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">推荐策略</h3>
          <div
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              sopMatch.confidence >= 85
                ? "bg-green-100 text-green-700"
                : sopMatch.confidence >= 70
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            置信度 {sopMatch.confidence}%
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* SOP匹配 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">匹配 {sopMatch.id}</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{sopMatch.content}</p>
          <p className="text-xs text-slate-500 italic">匹配原因：{sopMatch.reason}</p>
        </div>

        {/* 风险提示 */}
        {riskWarnings.length > 0 && (
          <div className="space-y-2">
            {riskWarnings.map((warning, index) => (
              <div
                key={index}
                className={`rounded-lg p-3 border ${
                  warning.level === "high"
                    ? "bg-red-50 border-red-200"
                    : warning.level === "medium"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      warning.level === "high"
                        ? "text-red-600"
                        : warning.level === "medium"
                          ? "text-yellow-600"
                          : "text-blue-600"
                    }`}
                  />
                  <div className="flex-1 space-y-1">
                    <p
                      className={`text-sm font-medium ${
                        warning.level === "high"
                          ? "text-red-900"
                          : warning.level === "medium"
                            ? "text-yellow-900"
                            : "text-blue-900"
                      }`}
                    >
                      {warning.message}
                    </p>
                    <p
                      className={`text-xs ${
                        warning.level === "high"
                          ? "text-red-700"
                          : warning.level === "medium"
                            ? "text-yellow-700"
                            : "text-blue-700"
                      }`}
                    >
                      {warning.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="pt-2">
          {hasStrategy ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-sm font-semibold text-green-700">方案已生成</p>
              <p className="text-xs text-green-600 mt-1">策略方案已生成，请查看下方详情</p>
            </div>
          ) : (
            <button
              onClick={onAdopt}
              disabled={isAdopting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isAdopting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Agent 生成中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  采纳并生成方案
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

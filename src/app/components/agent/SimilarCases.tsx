"use client";

import { motion } from "framer-motion";
import { TrendingUp, ArrowRight } from "lucide-react";
import type { SimilarCase } from "@/lib/agent-helpers";

type SimilarCasesProps = {
  cases: SimilarCase[];
};

export function SimilarCases({ cases }: SimilarCasesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900">相似历史事件</h3>
        </div>
        <span className="text-xs text-slate-500">基于知识图谱+向量召回</span>
      </div>

      <div className="space-y-3">
        {cases.map((case_, index) => (
          <motion.div
            key={case_.id}
            className="bg-white rounded-lg border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                {/* 标题和相似度 */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-slate-900 flex-1">
                    {case_.title}
                  </h4>
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      case_.similarity >= 80
                        ? "bg-green-100 text-green-700"
                        : case_.similarity >= 60
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span>相似</span>
                    <span>{case_.similarity}%</span>
                  </div>
                </div>

                {/* 生命周期 */}
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-medium">当时：</span>
                  <span className="flex items-center gap-1">
                    {case_.lifecycle}
                  </span>
                </div>

                {/* 策略 */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-slate-600">策略：</span>
                  <span className="text-blue-600">{case_.strategy}</span>
                </div>

                {/* 效果 */}
                <div className="flex items-center gap-4 text-xs">
                  <span className="font-medium text-slate-600">效果：</span>
                  <div className="flex items-center gap-3">
                    <span className="text-green-600 font-medium">
                      播放量 {case_.effect.playback}
                    </span>
                    <span className="text-blue-600 font-medium">
                      互动率 {case_.effect.engagement}
                    </span>
                  </div>
                </div>

                {/* 日期 */}
                <div className="text-xs text-slate-400">{case_.date}</div>
              </div>

              {/* 查看详情按钮 */}
              <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap">
                查看复盘
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 底部总结 */}
      {cases.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">基于 {cases.length} 个相似案例，</span>
            推荐采用「{cases[0].strategy}」组合策略
          </p>
        </div>
      )}
    </div>
  );
}

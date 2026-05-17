"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";

type PipelineStep = {
  id: string;
  name: string;
  status: "pending" | "active" | "completed" | "error";
  type: "human" | "agent";
  sla?: string;
  actualTime?: string;
};

type PipelineProps = {
  steps: PipelineStep[];
};

export function Pipeline({ steps }: PipelineProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <h3 className="font-semibold text-slate-900">执行流水线</h3>
        <span className="text-xs text-slate-500">人机协同流程</span>
      </div>

      <div className="relative">
        {/* 连接线 */}
        <div className="absolute left-0 right-0 top-[40px] flex items-center justify-between px-[80px]">
          {steps.slice(0, -1).map((step, index) => {
            const nextStep = steps[index + 1];
            const isCompleted = step.status === "completed";
            return (
              <div key={index} className="flex-1 relative h-0.5">
                <div
                  className={`absolute inset-0 ${
                    isCompleted ? "bg-green-500" : "bg-slate-300"
                  }`}
                />
                {/* 流动动画 */}
                {isCompleted && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "loop",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Pipeline节点 */}
        <div className="relative flex items-start justify-between">
          {steps.map((step, index) => {
            const isActive = step.status === "active";
            const isCompleted = step.status === "completed";
            const isError = step.status === "error";
            const isPending = step.status === "pending";

            return (
              <motion.div
                key={step.id}
                className="flex flex-col items-center w-[140px]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.15 }}
              >
                {/* 节点 */}
                <div className="relative">
                  <motion.div
                    className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center border-2 ${
                      isActive
                        ? "bg-blue-500 border-blue-600 shadow-lg shadow-blue-500/50"
                        : isCompleted
                          ? "bg-green-500 border-green-600"
                          : isError
                            ? "bg-red-500 border-red-600"
                            : "bg-white border-slate-300"
                    }`}
                    animate={
                      isActive
                        ? {
                            boxShadow: [
                              "0 4px 20px rgba(59, 130, 246, 0.4)",
                              "0 4px 30px rgba(59, 130, 246, 0.6)",
                              "0 4px 20px rgba(59, 130, 246, 0.4)",
                            ],
                          }
                        : {}
                    }
                    transition={{
                      duration: 2,
                      repeat: isActive ? Infinity : 0,
                      repeatType: "loop",
                    }}
                  >
                    {/* 状态图标 */}
                    <div
                      className={`text-2xl ${
                        isActive || isCompleted
                          ? "text-white"
                          : isError
                            ? "text-white"
                            : "text-slate-400"
                      }`}
                    >
                      {isCompleted ? "✓" : isError ? "✗" : isActive ? "●" : "○"}
                    </div>
                  </motion.div>

                  {/* 脉冲边框 */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl border-2 border-blue-500"
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 1.2, opacity: 0 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "loop",
                      }}
                    />
                  )}
                </div>

                {/* 节点信息 */}
                <div className="mt-3 text-center space-y-1">
                  <div
                    className={`text-sm font-semibold ${
                      isActive
                        ? "text-blue-600"
                        : isCompleted
                          ? "text-green-600"
                          : isError
                            ? "text-red-600"
                            : "text-slate-900"
                    }`}
                  >
                    {step.name}
                  </div>

                  {/* 状态标签 */}
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : isCompleted
                          ? "bg-green-100 text-green-700"
                          : isError
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isActive
                      ? "● 进行中"
                      : isCompleted
                        ? "✓ 已完成"
                        : isError
                          ? "✗ 失败"
                          : "○ 待启动"}
                  </div>

                  {/* 类型标签 */}
                  <div className="text-xs text-slate-500">
                    {step.type === "human" ? "人工卡点" : "Agent自动"}
                  </div>

                  {/* SLA时间 */}
                  {step.sla && (
                    <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>SLA: {step.sla}</span>
                    </div>
                  )}

                  {/* 实际耗时 */}
                  {step.actualTime && isCompleted && (
                    <div className="text-xs text-green-600">
                      实际: {step.actualTime}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

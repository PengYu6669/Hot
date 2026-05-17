"use client";

import { motion } from "framer-motion";
import type { AgentChainStep } from "@/lib/agent-helpers";

type AgentChainProps = {
  steps: AgentChainStep[];
  activeStep?: string;
};

export function AgentChain({ steps, activeStep }: AgentChainProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <h3 className="font-semibold text-slate-900">Agent推理链路</h3>
        <span className="text-xs text-slate-500">基于多Agent协作</span>
      </div>

      <div className="relative">
        {/* 连接线 */}
        <div className="absolute left-0 right-0 top-[28px] flex items-center justify-between px-[60px]">
          {steps.slice(0, -1).map((_, index) => (
            <div key={index} className="flex-1 relative">
              <svg
                className="w-full h-2"
                viewBox="0 0 100 8"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <line
                  x1="0"
                  y1="4"
                  x2="100"
                  y2="4"
                  stroke={`url(#gradient-${index})`}
                  strokeWidth="2"
                  strokeDasharray="4 2"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="6"
                    to="0"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </line>
                {/* 箭头 */}
                <polygon
                  points="95,1 100,4 95,7"
                  fill="#3b82f6"
                  opacity="0.6"
                />
              </svg>
            </div>
          ))}
        </div>

        {/* Agent节点 */}
        <div className="relative flex items-start justify-between">
          {steps.map((step, index) => {
            const isActive = activeStep === step.id;
            return (
              <motion.div
                key={step.id}
                className="flex flex-col items-center w-[120px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
              >
                {/* 节点圆圈 */}
                <div className="relative">
                  <motion.div
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${
                      isActive
                        ? "bg-blue-500 border-blue-600 shadow-lg shadow-blue-500/50"
                        : "bg-white border-slate-300"
                    }`}
                    animate={
                      isActive
                        ? {
                            boxShadow: [
                              "0 0 0 0 rgba(59, 130, 246, 0.4)",
                              "0 0 0 10px rgba(59, 130, 246, 0)",
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
                    <span
                      className={`text-lg font-semibold ${
                        isActive ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </motion.div>

                  {/* 脉冲动画 */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-blue-500"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "loop",
                      }}
                    />
                  )}
                </div>

                {/* Agent信息 */}
                <div className="mt-3 text-center space-y-1">
                  <div
                    className={`text-sm font-semibold ${
                      isActive ? "text-blue-600" : "text-slate-900"
                    }`}
                  >
                    {step.name}
                  </div>
                  <div className="text-xs text-slate-500">[{step.action}]</div>
                  <div className="text-xs text-slate-400">{step.timestamp}</div>
                  <div
                    className={`text-xs font-medium ${
                      step.confidence >= 85
                        ? "text-green-600"
                        : step.confidence >= 70
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    置信{step.confidence}%
                  </div>
                </div>

                {/* Hover详情 */}
                <div className="group relative">
                  <button className="mt-2 text-xs text-blue-600 hover:text-blue-700 hover:underline">
                    详情
                  </button>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-slate-700">输入：</span>
                        <p className="text-slate-600 mt-1">{step.input}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">输出：</span>
                        <p className="text-slate-600 mt-1">{step.output}</p>
                      </div>
                      {step.dataSource && (
                        <div>
                          <span className="font-semibold text-slate-700">数据源：</span>
                          <p className="text-slate-600 mt-1">{step.dataSource}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

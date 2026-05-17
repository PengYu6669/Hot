"use client";

import { motion } from "framer-motion";

type AgentStatusItem = {
  id: string;
  name: string;
  status: "active" | "idle" | "error";
};

type AgentStatusProps = {
  agents: AgentStatusItem[];
};

export function AgentStatus({ agents }: AgentStatusProps) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
      <span className="text-sm font-semibold text-slate-700">Agent状态：</span>
      <div className="flex items-center gap-6">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center gap-2">
            {/* 状态指示器 */}
            <div className="relative">
              <motion.div
                className={`w-2.5 h-2.5 rounded-full ${
                  agent.status === "active"
                    ? "bg-green-500"
                    : agent.status === "error"
                      ? "bg-red-500"
                      : "bg-slate-400"
                }`}
                animate={
                  agent.status === "active"
                    ? {
                        opacity: [1, 0.5, 1],
                      }
                    : {}
                }
                transition={{
                  duration: 2,
                  repeat: agent.status === "active" ? Infinity : 0,
                  repeatType: "loop",
                }}
              />
              {/* 脉冲效果 */}
              {agent.status === "active" && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-green-500"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "loop",
                  }}
                />
              )}
            </div>

            {/* Agent名称 */}
            <span
              className={`text-sm ${
                agent.status === "active"
                  ? "text-green-700 font-medium"
                  : agent.status === "error"
                    ? "text-red-700"
                    : "text-slate-500"
              }`}
            >
              {agent.name}
            </span>

            {/* 状态文字 */}
            <span className="text-xs text-slate-400">
              {agent.status === "active"
                ? "工作中"
                : agent.status === "error"
                  ? "异常"
                  : "待命"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

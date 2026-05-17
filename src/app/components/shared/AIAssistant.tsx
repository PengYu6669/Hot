"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot } from "lucide-react";

const quickQuestions = [
  "为什么推荐这个策略？",
  "热度分数怎么算的？",
  "这个SOP是什么？",
  "当前事件的置信度如何？",
];

const presetAnswers: Record<string, string> = {
  "为什么推荐这个策略？":
    "该策略基于 3 个高度相似的历史案例（相似度 > 80%）推荐。这些案例在相似生命周期采用了同样的策略组合，平均播放量提升 130%，互动率提升 22%。",
  "热度分数怎么算的？":
    "热度由 4 个原子指标加权计算：时效信号（满分28）、事件类型（满分28）、语义强度（满分28）、可信来源（满分28）。当前事件的各因子得分可以在「事件详情 → 热度因子拆解」中查看。",
  "这个SOP是什么？":
    "SOP（Standard Operating Procedure）是预定义的标准化运营流程。每个 SOP 包含：适用条件、内容策略、执行步骤、风险边界和预期效果。可在「事件详情 → 推荐策略」中查看原文。",
  "当前事件的置信度如何？":
    "置信度由 Agent 推理链路的多个环节综合评估：感知 Agent（90%+）、挖掘 Agent（85%+）、运营 Agent（80%+）。综合置信度低于 70% 时会建议人工优先复核。",
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "你好！我是 HotAgent 助手。可以问我关于策略推荐、热度评分、SOP 匹配等问题。",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(1);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(text?: string) {
    const question = (text ?? input).trim();
    if (!question) return;

    const userMsg: Message = {
      id: `user-${counterRef.current++}`,
      role: "user",
      text: question,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const answer =
        presetAnswers[question] ??
        "这是一个好问题。当前 Demo 阶段的 AI 助手可以回答策略推荐、热度评分、SOP 匹配等相关问题。如需更深入的运营分析，请在「Agent 编排」页面输入运营指令。";

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${counterRef.current++}`,
          role: "assistant",
          text: answer,
        },
      ]);
      setTyping(false);
    }, 800 + Math.random() * 500);
  }

  return (
    <>
      {/* Floating button */}
      <button
        className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-[#3b82f6] text-white shadow-lg hover:bg-[#2563eb] hover:shadow-xl transition-all flex items-center justify-center"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </button>

      {/* Chat drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-24 right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#dcd8cf] bg-white shadow-2xl flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-[#e8e5dd] bg-[#fbfaf7] px-4 py-3">
              <Bot className="size-5 text-[#3b82f6]" />
              <span className="font-semibold text-sm text-[#111]">HotAgent 助手</span>
              <span className="ml-auto rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700 font-semibold">
                在线
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 max-h-[320px] overflow-y-auto px-4 py-3 space-y-3 bg-white">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-5 ${
                      msg.role === "user"
                        ? "bg-[#3b82f6] text-white"
                        : "bg-[#f2f0ea] text-[#333]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="rounded-xl bg-[#f2f0ea] px-3 py-2 flex gap-1">
                    <span className="size-1.5 rounded-full bg-[#999] animate-pulse" />
                    <span className="size-1.5 rounded-full bg-[#999] animate-pulse [animation-delay:0.2s]" />
                    <span className="size-1.5 rounded-full bg-[#999] animate-pulse [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick questions */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 border-t border-[#e8e5dd] flex flex-wrap gap-1.5">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    className="rounded-full border border-[#dcd8cf] bg-white px-2.5 py-1 text-[10px] font-semibold hover:border-[#999] hover:bg-[#f7f7f4] transition-colors"
                    onClick={() => handleSend(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-[#e8e5dd] p-3">
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-[#dcd8cf] bg-[#fbfaf7] px-3 py-2 text-sm outline-none focus:border-[#3b82f6]"
                  placeholder="输入问题..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                />
                <button
                  className="shrink-0 size-9 rounded-lg bg-[#3b82f6] text-white flex items-center justify-center hover:bg-[#2563eb] disabled:opacity-50 transition-colors"
                  disabled={!input.trim() || typing}
                  onClick={() => handleSend()}
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

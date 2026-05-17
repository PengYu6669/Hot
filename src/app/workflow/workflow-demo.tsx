"use client";

import type { HotEvent, HotEventDashboard, Strategy } from "@/lib/hot-events";
import { useMemo, useReducer, useRef, useEffect, useCallback, useState } from "react";
import { AppShell } from "../app-shell";
import { useOperationReviews } from "../hooks/use-operation-reviews";
import { useOperationTasks } from "../hooks/use-operation-tasks";
import type { DecisionStatus } from "../components/dashboard/types";
import {
  CheckCircle2,
  Edit3,
  XCircle,
  AlertTriangle,
  Brain,
  Loader2,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Save,
  Zap,
} from "lucide-react";

/* ── Chat types ── */

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  strategy?: Strategy;
  timestamp: number;
};

type ChatState = {
  eventId: string | null;
  messages: ChatMessage[];
  isRunning: boolean;
  currentAgentStep: string;
  /** Rolling agent node messages shown while running */
  agentLogs: string[];
  error: string | null;
};

type ChatAction =
  | { type: "select_event"; eventId: string; eventTitle: string }
  | { type: "add_message"; message: ChatMessage }
  | { type: "start_run" }
  | { type: "agent_step"; name: string }
  | { type: "agent_log"; text: string }
  | { type: "set_strategy"; messageId: string; strategy: Strategy }
  | { type: "run_error"; error: string }
  | { type: "run_complete" };

let msgSeq = 0;
function nextMsgId() {
  return `msg-${Date.now()}-${++msgSeq}`;
}

const initialChatState: ChatState = {
  eventId: null,
  messages: [],
  isRunning: false,
  currentAgentStep: "",
  agentLogs: [],
  error: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "select_event":
      return {
        eventId: action.eventId,
        messages: [
          {
            id: nextMsgId(),
            role: "system",
            content: `已选择热点：${action.eventTitle}`,
            timestamp: Date.now(),
          },
        ],
        isRunning: false,
        currentAgentStep: "",
        agentLogs: [],
        error: null,
      };
    case "add_message":
      return { ...state, messages: [...state.messages, action.message] };
    case "start_run":
      return { ...state, isRunning: true, error: null, agentLogs: [], currentAgentStep: "" };
    case "agent_step":
      return { ...state, currentAgentStep: action.name };
    case "agent_log":
      return { ...state, agentLogs: [...state.agentLogs, action.text].slice(-4) };
    case "set_strategy":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, strategy: action.strategy } : m,
        ),
      };
    case "run_error":
      return { ...state, isRunning: false, error: action.error };
    case "run_complete":
      return { ...state, isRunning: false, currentAgentStep: "", agentLogs: [] };
    default:
      return state;
  }
}

export function WorkflowDemo({ dashboard }: { dashboard: HotEventDashboard }) {
  const [currentDashboard, setCurrentDashboard] = useState(dashboard);
  const [chat, dispatch] = useReducer(chatReducer, initialChatState);
  const [inputValue, setInputValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [decision, setDecision] = useState<DecisionStatus>("pending");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { recordDecision } = useOperationReviews();
  const { tasks, summary, upsertTask } = useOperationTasks();

  const event = useMemo(() => {
    const id = chat.eventId;
    if (!id) return null;
    return (
      currentDashboard.events.find((item) => item.id === id) ??
      currentDashboard.selectedEvent ??
      null
    );
  }, [currentDashboard, chat.eventId]);

  /* Derive latest strategy from the most recent assistant message */
  const latestStrategy = useMemo(() => {
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      if (chat.messages[i].strategy) return chat.messages[i].strategy;
    }
    return null;
  }, [chat.messages]);

  const task = event ? tasks.find((t) => t.eventId === event.id) ?? null : null;

  /* ── Auto-scroll ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, chat.agentLogs]);

  /* ── Event selection ── */
  function selectEvent(id: string) {
    const ev = currentDashboard.events.find((e) => e.id === id);
    if (!ev) return;
    dispatch({ type: "select_event", eventId: id, eventTitle: ev.title });
    setDecision("pending");
    setFeedbackMessage(null);
  }

  /* ── Run agent for a user message ── */
  async function sendMessage(content?: string) {
    const text = (content ?? inputValue).trim();
    if (!text || !event || chat.isRunning) return;

    setInputValue("");
    const userMsg: ChatMessage = {
      id: nextMsgId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    dispatch({ type: "add_message", message: userMsg });

    const assistantMsgId = nextMsgId();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "Agent 运行中...",
      timestamp: Date.now(),
    };
    dispatch({ type: "add_message", message: assistantMsg });
    dispatch({ type: "start_run" });

    try {
      const prev = latestStrategy;
      const response = await fetch("/api/hot-events/agent-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          instruction: text,
          mode: "standard",
          previousStrategy: prev ?? undefined,
        }),
      });

      if (!response.ok) throw new Error("Agent 启动失败");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const data = chunk
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, ""))
            .join("");
          if (!data) continue;
          try {
            const parsed = JSON.parse(data) as {
              type: string;
              strategy?: Strategy;
              agent?: { name: string };
              content?: string;
            };
            if (parsed.type === "agent_started" && parsed.agent) {
              dispatch({ type: "agent_step", name: parsed.agent.name });
            } else if (parsed.type === "agent_message" && parsed.content) {
              dispatch({ type: "agent_log", text: parsed.content });
            } else if (parsed.type === "strategy_ready" && parsed.strategy) {
              dispatch({ type: "set_strategy", messageId: assistantMsgId, strategy: parsed.strategy });
              setCurrentDashboard((prev) => ({
                ...prev,
                strategies: { ...prev.strategies, [parsed.strategy!.eventId]: parsed.strategy! },
              }));
            }
          } catch {
            // skip individual parse errors
          }
        }
      }
    } catch (err) {
      dispatch({ type: "run_error", error: err instanceof Error ? err.message : "运行失败" });
    } finally {
      dispatch({ type: "run_complete" });
    }
  }

  /* ── Decision actions ── */
  function applyDecision(nextDecision: DecisionStatus) {
    setDecision(nextDecision);
    if (!event || nextDecision === "pending") return;
    const strategy = latestStrategy;

    recordDecision({
      event,
      strategy,
      decision: nextDecision,
      rejectReason: nextDecision === "rejected" ? "other" : undefined,
    });

    if (nextDecision === "confirmed") {
      upsertTask({ event, strategy, status: "confirmed" });
      setFeedbackMessage("已确认执行 — 策略已记录到本地复盘数据，可在「复盘指标」页查看");
    } else if (nextDecision === "modified") {
      setFeedbackMessage("已标记为需改写 — 请在下方输入框中输入修改意见");
      inputRef.current?.focus();
    } else if (nextDecision === "rejected") {
      setFeedbackMessage("已否决 — 事件回退至待处理状态，否决记录可在「复盘指标」页查看");
    }
  }

  /* ── Save session ── */
  const saveSession = useCallback(() => {
    if (!event || !latestStrategy) return;
    recordDecision({ event, strategy: latestStrategy, decision: "confirmed" });
    upsertTask({ event, strategy: latestStrategy, status: "confirmed" });
    setFeedbackMessage("会话已保存 — 策略和对话已记录到复盘系统");
    setDecision("confirmed");
  }, [event, latestStrategy, recordDecision, upsertTask]);

  /* ── Derived: last assistant message with strategy ── */
  const lastAssistantMsg = useMemo(() => {
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      if (chat.messages[i].role === "assistant" && chat.messages[i].strategy) {
        return chat.messages[i];
      }
    }
    return null;
  }, [chat.messages]);

  return (
    <AppShell
      eyebrow="Agent Orchestration"
      title="Agent 协同编排"
      description="多轮对话式热点运营 Agent，可迭代优化策略方案。"
    >
      <div className="flex h-[calc(100vh-180px)] gap-0 overflow-hidden rounded-xl border border-[#dcd8cf] bg-white shadow-sm">
        {/* ── LEFT: Event pool ── */}
        <div
          className={`shrink-0 border-r border-[#e8e5dd] bg-[#fbfaf7] transition-all duration-300 overflow-hidden flex flex-col ${
            sidebarOpen ? "w-60" : "w-0 border-r-0"
          }`}
        >
          <div className="p-3 min-w-[240px] flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase text-[#707070]">事件池</p>
              <span className="text-[10px] text-[#999]">{summary.total} 个任务</span>
            </div>
            <div className="grid gap-1.5">
              {currentDashboard.events.slice(0, 15).map((item) => (
                <button
                  key={item.id}
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    item.id === chat.eventId
                      ? "border-[#f0a060] bg-[#fff7ed]"
                      : "border-transparent bg-white hover:border-[#ddd] hover:bg-[#f7f7f4]"
                  }`}
                  onClick={() => selectEvent(item.id)}
                >
                  <p className="line-clamp-2 text-xs font-semibold leading-5 text-[#333]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[10px] text-[#888]">
                    {item.heatLevel}级 · {item.lifecycleLabel} · {item.riskLabel}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Toggle sidebar ── */}
        <button
          className="shrink-0 flex items-center justify-center w-6 hover:bg-[#f0f0ec] transition-colors text-[#999] hover:text-[#555]"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <PanelLeftClose className="size-3.5" /> : <PanelLeft className="size-3.5" />}
        </button>

        {/* ── MAIN: Chat area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="shrink-0 border-b border-[#e8e5dd] px-4 py-2.5 flex items-center gap-3">
            {event ? (
              <>
                <span className="text-sm font-semibold text-[#111] truncate">{event.title}</span>
                <span className="rounded bg-orange-50 text-orange-700 px-2 py-0.5 text-[10px] font-semibold shrink-0">
                  {event.heatLevel}级 · {event.lifecycleLabel}
                </span>
                {latestStrategy && (
                  <span className="text-[10px] text-[#999] shrink-0 ml-auto">
                    {latestStrategy.llmGenerated ? "LLM 生成" : "规则生成"}
                  </span>
                )}
              </>
            ) : (
              <p className="text-sm text-[#999]">请从左侧事件池选择一个热点事件</p>
            )}
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chat.messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm">
                  <Brain className="size-10 text-[#ccc] mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[#888]">选择事件开始对话</p>
                  <p className="mt-1 text-xs text-[#aaa]">
                    Agent 支持多轮迭代 — 生成策略后可以继续提出修改意见
                  </p>
                </div>
              </div>
            )}

            {chat.messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                event={event}
              />
            ))}

            {/* Agent running indicator */}
            {chat.isRunning && (
              <div className="flex gap-3">
                <div className="w-8 shrink-0 flex items-start justify-center pt-0.5">
                  <div className="size-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <Loader2 className="size-3 animate-spin text-blue-600" />
                  </div>
                </div>
                <div className="min-w-0 max-w-[85%]">
                  <div className="rounded-2xl rounded-tl-md border border-blue-200 bg-blue-50/60 px-4 py-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">
                      {chat.currentAgentStep || "Agent 运行中..."}
                    </p>
                    {chat.agentLogs.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {chat.agentLogs.map((log, i) => (
                          <p
                            key={i}
                            className="text-[11px] text-[#555] leading-relaxed border-l-2 border-blue-200 pl-2"
                          >
                            {log}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {chat.error && (
              <div className="flex justify-center">
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                  {chat.error}
                </div>
              </div>
            )}

            {/* Decision bar — after last assistant message with strategy */}
            {lastAssistantMsg && !chat.isRunning && decision === "pending" && (
              <div className="flex items-center gap-2 justify-center py-1">
                <button
                  className="flex items-center gap-1.5 rounded-full border border-green-300 bg-green-50 hover:bg-green-100 px-4 py-1.5 text-xs font-semibold text-green-700 transition-colors"
                  onClick={() => applyDecision("confirmed")}
                >
                  <CheckCircle2 className="size-3.5" /> 确认执行
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-full border border-[#3b82f6]/30 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 text-xs font-semibold text-[#3b82f6] transition-colors"
                  onClick={() => applyDecision("modified")}
                >
                  <Edit3 className="size-3.5" /> 改写
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 hover:bg-red-100 px-4 py-1.5 text-xs font-semibold text-red-600 transition-colors"
                  onClick={() => applyDecision("rejected")}
                >
                  <XCircle className="size-3.5" /> 否决
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-full border border-[#dcd8cf] bg-white hover:bg-[#f7f7f4] px-4 py-1.5 text-xs font-semibold text-[#555] transition-colors"
                  onClick={saveSession}
                >
                  <Save className="size-3.5" /> 保存会话
                </button>
              </div>
            )}

            {/* Feedback */}
            {feedbackMessage && (
              <div className="flex justify-center">
                <div
                  className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                    decision === "confirmed"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : decision === "rejected"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  {feedbackMessage}
                </div>
              </div>
            )}

            {/* Task status */}
            {task && decision !== "pending" && (
              <div className="flex justify-center">
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                    decision === "confirmed"
                      ? "bg-green-100 text-green-700"
                      : decision === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {decision === "confirmed" ? "已确认" : decision === "rejected" ? "已否决" : "已改写"}
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div className="shrink-0 border-t border-[#e8e5dd] p-3">
            {!event ? (
              <div className="rounded-xl border border-dashed border-[#dcd8cf] bg-[#fbfaf7] px-4 py-3 text-center text-xs text-[#999]">
                请先从左侧选择一个热点事件
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  className="flex-1 min-h-[44px] max-h-32 resize-none rounded-xl border border-[#dcd8cf] bg-[#fbfaf7] px-4 py-2.5 text-sm leading-6 outline-none focus:border-[#f0a060] placeholder:text-[#bbb]"
                  placeholder={
                    latestStrategy
                      ? "输入修改意见，如：脚本缩短到15秒、语气更轻松..."
                      : "输入运营指令，如：生成一条30秒快反脚本..."
                  }
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                />
                <button
                  className="shrink-0 h-11 w-11 rounded-xl bg-[#111] flex items-center justify-center hover:bg-[#333] disabled:opacity-40 transition-colors"
                  disabled={chat.isRunning || !inputValue.trim()}
                  onClick={() => sendMessage()}
                >
                  {chat.isRunning ? (
                    <Loader2 className="size-4 animate-spin text-white" />
                  ) : (
                    <ChevronRight className="size-5 text-white" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ── ChatBubble component ── */

function ChatBubble({ message, event }: { message: ChatMessage; event: HotEvent | null }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";
  const strategy = message.strategy;

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-[#f0f0ec] px-4 py-1.5 text-[11px] font-medium text-[#777]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div className="w-8 shrink-0 flex items-start justify-center pt-0.5">
        {isUser ? (
          <div className="size-6 rounded-full bg-[#111] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">运</span>
          </div>
        ) : (
          <div className="size-6 rounded-full bg-[#fff7ed] border border-[#f0a060]/40 flex items-center justify-center">
            <Zap className="size-3 text-[#f0a060]" />
          </div>
        )}
      </div>

      {/* Bubble */}
      <div
        className={`min-w-0 max-w-[85%] ${
          isUser
            ? "rounded-2xl rounded-tr-md bg-[#111] text-white px-4 py-2.5"
            : strategy
              ? "rounded-2xl rounded-tl-md border border-[#dcd8cf] bg-white px-4 py-3 shadow-sm"
              : "rounded-2xl rounded-tl-md border border-[#e8e5dd] bg-[#fbfaf7] px-4 py-2.5"
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : strategy ? (
          <StrategyContent strategy={strategy} event={event} />
        ) : (
          <p className="text-sm text-[#555] leading-relaxed">{message.content}</p>
        )}
      </div>
    </div>
  );
}

/* ── Strategy content rendered inside agent bubble ── */

function StrategyContent({ strategy, event }: { strategy: Strategy; event: HotEvent | null }) {
  return (
    <div className="space-y-3">
      {/* Status row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[#111]">运营方案</span>
        {strategy.llmGenerated ? (
          <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-bold">LLM</span>
        ) : (
          <span className="rounded-full bg-[#f0f0ec] text-[#777] px-2 py-0.5 text-[10px] font-bold">规则</span>
        )}
      </div>

      {/* Titles */}
      <div className="flex flex-wrap gap-1.5">
        {strategy.campaignBrief.titles.map((t, i) => (
          <span
            key={i}
            className="rounded-full border border-[#e8e6df] bg-[#fbfaf7] px-2.5 py-1 text-[11px] text-[#333]"
          >
            #{i + 1} {t}
          </span>
        ))}
      </div>

      {/* Script */}
      <div>
        <p className="text-[10px] font-semibold text-[#999] uppercase mb-1">短视频脚本</p>
        <p className="text-[11px] text-[#555] leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
          {strategy.campaignBrief.shortVideoScript}
        </p>
      </div>

      {/* Risk + distribution */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold text-[#999] uppercase mb-0.5">风险管控</p>
          <p className="text-[11px] text-[#666] leading-relaxed line-clamp-3">
            {strategy.campaignBrief.riskGuardrail}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[#999] uppercase mb-0.5">分发节奏</p>
          <p className="text-[11px] text-[#666] leading-relaxed line-clamp-3">
            {strategy.campaignBrief.distributionPlan}
          </p>
        </div>
      </div>

      {/* Douyin ops quick view */}
      <div className="flex flex-wrap gap-2 text-[10px] text-[#888]">
        <span>达人：{strategy.douyinOperationPlan.creatorArchetypes.slice(0, 2).join("、")}</span>
        <span>形式：{strategy.douyinOperationPlan.contentFormats.slice(0, 2).join("、")}</span>
        <span>放量：{strategy.douyinOperationPlan.trafficRule}</span>
      </div>

      {/* Risk warnings from event */}
      {event && event.riskLevel === "high" && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-2.5 flex items-start gap-2">
          <AlertTriangle className="size-3.5 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-yellow-700 leading-relaxed">
            高风险事件，请确认来源可靠性和表述边界后再确认执行
          </p>
        </div>
      )}
    </div>
  );
}

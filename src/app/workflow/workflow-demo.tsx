"use client";

import type { HotEvent, HotEventDashboard, Strategy } from "@/lib/hot-events";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "../app-shell";
import { HotEventCard } from "../components/dashboard/HotEventCard";
import { ThinkingAnimation } from "../components/shared/ThinkingAnimation";
import { StaggerList } from "../components/shared/StaggerList";
import type { AgentStepId, DecisionStatus } from "../components/dashboard/types";

type RunMode = "normal" | "risk-first" | "angle-change";

const agentMeta: Record<AgentStepId, { name: string; role: string; color: string; shortName: string }> = {
  perceive: { name: "感知 Agent", role: "把公开热点源清洗成标准事件", color: "bg-[#d8e8f7]", shortName: "感知" },
  mine: { name: "挖掘 Agent", role: "判断热度、价值、生命周期", color: "bg-[#dceeb1]", shortName: "挖掘" },
  plan: { name: "运营 Agent", role: "生成内容角度、脚本和分发节奏", color: "bg-[#ffcf9f]", shortName: "策略" },
  guard: { name: "管控 Agent", role: "识别风险、设置人工断点", color: "bg-[#f1d3d3]", shortName: "管控" },
  confirm: { name: "人工运营", role: "确认、改写、否决，反馈给系统", color: "bg-[#e8ddff]", shortName: "人工" },
};

const modes: Record<RunMode, { label: string; note: string }> = {
  normal: { label: "标准快反", note: "按热度和价值优先，先产出解释型内容，再由人工确认。" },
  "risk-first": { label: "风险优先", note: "先让管控 Agent 前置复核，适合争议、监管类热点。" },
  "angle-change": { label: "人工改角度", note: "运营插入新要求，策略 Agent 重新组织内容切角。" },
};

export function WorkflowDemo({ dashboard }: { dashboard: HotEventDashboard }) {
  const [selectedId, setSelectedId] = useState(dashboard.selectedEvent?.id ?? dashboard.events[0]?.id);
  const [mode, setMode] = useState<RunMode>("normal");
  const [activeAgent, setActiveAgent] = useState<AgentStepId>("mine");
  const [decision, setDecision] = useState<DecisionStatus>("pending");
  const [thinking, setThinking] = useState(false);
  const [humanInstruction, setHumanInstruction] = useState("把这个热点改成面向普通用户的解释型内容，避免夸张结论。");
  const [mobilePanel, setMobilePanel] = useState<"pool" | "handoff" | "hitl">("handoff");

  const event = useMemo(() => {
    return dashboard.events.find((item) => item.id === selectedId) ?? dashboard.selectedEvent ?? dashboard.events[0] ?? null;
  }, [dashboard.events, dashboard.selectedEvent, selectedId]);

  const strategy = event ? dashboard.strategies[event.id] : null;
  const valueScore = event ? getOperationValueScore(event) : 0;
  const run = event ? createRun(event, strategy, mode, humanInstruction) : [];
  const handoffPairs = createHandoffPairs(run);

  function changeEvent(id: string) {
    setSelectedId(id);
    setDecision("pending");
    setActiveAgent("mine");
    setThinking(true);
    setTimeout(() => setThinking(false), 2000);
  }

  function changeMode(nextMode: RunMode) {
    setMode(nextMode);
    setDecision(nextMode === "angle-change" ? "modified" : "pending");
    setActiveAgent(nextMode === "risk-first" ? "guard" : "plan");
  }

  function applyHumanInstruction() {
    setMode("angle-change");
    setDecision("modified");
    setThinking(true);
    setTimeout(() => { setActiveAgent("plan"); setThinking(false); }, 2000);
  }

  const decisionTone: Record<DecisionStatus, string> = {
    pending: "bg-[#fff6df] text-[#6f4a00]",
    confirmed: "bg-[#dff5df] text-[#1f6f35]",
    modified: "bg-[#e9e1ff] text-[#4b328f]",
    rejected: "bg-[#ffe0df] text-[#8a2a22]",
  };

  const decisionCopy: Record<DecisionStatus, string> = {
    pending: "等待运营确认",
    confirmed: "已确认，可进入执行队列",
    modified: "人工要求改写，策略 Agent 已重跑",
    rejected: "已否决，作为误判样本回流",
  };

  return (
    <AppShell
      eyebrow="Agent Orchestration"
      title="可解释的人机协同编排"
      description="这个页面演示 Agent 如何互相交接，以及人如何改变系统下一步。所有数据来自 AI HOT API + 本地规则。"
    >
      {event ? (
        <>
          {/* Mobile panel switcher */}
          <div className="flex gap-2 mb-4 xl:hidden">
            {(["pool", "handoff", "hitl"] as const).map((panel) => (
              <button
                key={panel}
                className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                  mobilePanel === panel ? "border-[#f0a060] bg-[#fff7ed] text-[#e8752a]" : "border-[#dcd8cf] bg-white"
                }`}
                onClick={() => setMobilePanel(panel)}
              >
                {panel === "pool" ? "事件池" : panel === "handoff" ? "Agent 交接" : "人工干预"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.82fr_1.28fr_0.9fr]">
            {/* LEFT: event pool + mode */}
            <aside className={`grid gap-4 ${mobilePanel === "pool" ? "" : "hidden"} xl:grid`}>
              <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-[#707070]">Live event source</p>
                    <h2 className="mt-1 text-lg font-semibold">AI HOT 事件池</h2>
                  </div>
                  <span className="rounded-lg bg-[#111] px-3 py-1 text-xs font-bold text-white">{dashboard.events.length} 条</span>
                </div>
                <div className="grid gap-2 max-h-[40vh] xl:max-h-[50vh] overflow-y-auto">
                  {dashboard.events.slice(0, 8).map((item) => (
                    <HotEventCard
                      key={item.id}
                      event={item}
                      active={item.id === event.id}
                      onSelect={(id) => { changeEvent(id); setMobilePanel("handoff"); }}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase text-[#707070]">Orchestration mode</p>
                <div className="mt-3 grid gap-2">
                  {(Object.keys(modes) as RunMode[]).map((item) => (
                    <button
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        mode === item ? "border-[#111] bg-[#111] text-white" : "border-[#e8e5dd] bg-white hover:border-[#ccc]"
                      }`}
                      key={item}
                      onClick={() => changeMode(item)}
                    >
                      <strong className="text-sm">{modes[item].label}</strong>
                      <p className={`mt-1 text-xs leading-5 ${mode === item ? "text-white/70" : "text-[#555]"}`}>
                        {modes[item].note}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            </aside>

            {/* MIDDLE: event detail + handoff */}
            <section className={`grid gap-4 ${mobilePanel === "handoff" ? "" : "hidden"} xl:grid`}>
              <motion.section
                className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm"
                key={selectedId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-[#707070]">Selected hot event</p>
                    <h2 className="mt-2 text-xl md:text-2xl font-semibold leading-tight">{event.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-[#555] line-clamp-3">{event.summary}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#fbfaf7] p-3 border border-[#e8e5dd] shrink-0">
                    <Metric label="热度" value={String(event.heatScore)} />
                    <Metric label="价值" value={String(valueScore)} />
                    <Metric label="生命周期" value={event.lifecycleLabel} />
                    <Metric label="风险" value={event.riskLabel} />
                  </div>
                </div>

                {thinking && (
                  <div className="mt-4 p-4 rounded-lg bg-[#fff7ed] border border-[#f0a060]/30">
                    <ThinkingAnimation label={mode === "angle-change" ? "Agent 正在根据你的指令重新思考..." : "Agent 正在分析事件..."} />
                  </div>
                )}
              </motion.section>

              {/* Agent handoff */}
              <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-[#707070]">Multi-agent handoff</p>
                    <h2 className="mt-1 text-lg md:text-xl font-semibold">Agent 协同不是流程图，是交接证据</h2>
                  </div>
                  <span className="rounded-lg bg-[#f0a060] px-3 py-2 text-xs font-bold text-white shrink-0">
                    当前：{agentMeta[activeAgent].name}
                  </span>
                </div>

                {/* Agent buttons - responsive grid */}
                <div className="grid gap-1.5 grid-cols-5">
                  {(Object.keys(agentMeta) as AgentStepId[]).map((agent) => (
                    <button
                      className={`rounded-lg border p-2 text-left transition-colors ${
                        activeAgent === agent ? "border-[#f0a060] bg-[#fff7ed]" : "border-[#e8e5dd] bg-white hover:border-[#ccc]"
                      }`}
                      key={agent}
                      onClick={() => setActiveAgent(agent)}
                    >
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold text-[#111] ${agentMeta[agent].color}`}>
                        {agentMeta[agent].shortName}
                      </span>
                      <strong className="mt-1.5 block text-[11px] md:text-xs">{agentMeta[agent].name}</strong>
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {run.filter((m) => m.agent === activeAgent).map((m) => (
                    <motion.div
                      key={m.agent}
                      className="mt-4 rounded-lg bg-[#fff7ed] border border-[#f0a060]/30 p-4"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <strong className="text-sm">{m.title}</strong>
                        <span className="rounded-full bg-[#f2f0ea] px-2 py-1 text-xs font-bold">置信度 {m.confidence}%</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#444]">{m.message}</p>
                      <p className="mt-2 text-xs font-semibold text-[#e8752a]">交给下一步：{m.handoff}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </section>

              {/* Handoff log */}
              <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-[#707070]">Handoff log</p>
                <StaggerList className="mt-4 grid gap-3" staggerMs={60}>
                  {handoffPairs.map((pair, index) => (
                    <div
                      className="grid gap-2 md:gap-3 rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3 md:p-4 md:grid-cols-[110px_1fr] items-center"
                      key={pair.from + pair.to}
                    >
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span>{pair.from}</span>
                        <span className="text-[#f0a060]">→</span>
                        <span>{pair.to}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs md:text-sm leading-5 text-[#555]">{pair.payload}</p>
                        {index === handoffPairs.length - 1 && (
                          <motion.span
                            className="shrink-0 size-2 rounded-full bg-[#0a0]"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </StaggerList>
              </section>
            </section>

            {/* RIGHT: HITL */}
            <aside className={`grid gap-4 ${mobilePanel === "hitl" ? "" : "hidden"} xl:grid`}>
              <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase text-[#707070]">Human in the loop</p>
                <h2 className="mt-1 text-lg font-semibold">人可以改变 Agent 下一步</h2>
                <textarea
                  className="mt-4 min-h-24 w-full resize-none rounded-lg border border-[#dcd8cf] bg-[#fbfaf7] p-3 text-sm leading-6 outline-none focus:border-[#f0a060]"
                  value={humanInstruction}
                  onChange={(e) => setHumanInstruction(e.target.value)}
                  placeholder="输入你的运营指令..."
                />
                <button
                  className="mt-3 w-full rounded-lg bg-[#111] px-4 py-3 text-sm font-semibold text-white hover:bg-[#333] transition-colors"
                  onClick={applyHumanInstruction}
                >
                  与 Agent 对话
                </button>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <DecisionButton active={decision === "confirmed"} label="确认" onClick={() => setDecision("confirmed")} />
                  <DecisionButton active={decision === "modified"} label="改写" onClick={() => setDecision("modified")} />
                  <DecisionButton active={decision === "rejected"} label="否决" onClick={() => setDecision("rejected")} />
                </div>
                <p className="mt-3 rounded-lg bg-[#fbfaf7] p-3 text-xs leading-5 border border-[#e8e5dd]">
                  <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold mr-2 ${decisionTone[decision]}`}>
                    {decision === "pending" ? "等待中" : decision === "confirmed" ? "已确认" : decision === "modified" ? "已改写" : "已否决"}
                  </span>
                  {decisionCopy[decision]}
                </p>
              </section>

              {strategy ? (
                <section className="rounded-lg border border-[#dcd8cf] bg-[#fff7ed] p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold uppercase text-[#707070]">Strategy output</p>
                    {strategy.llmGenerated && (
                      <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                        LLM
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 text-lg font-semibold">策略 Agent 输出</h2>
                  {strategy.llmGenerated && strategy.agentReasoning && (
                    <p className="mt-2 rounded-lg bg-white p-3 text-xs leading-5 border border-[#e8e5dd] whitespace-pre-wrap">
                      {strategy.agentReasoning}
                    </p>
                  )}
                  <div className="mt-3 grid gap-2">
                    {strategy.campaignBrief.titles.map((title) => (
                      <strong className="rounded-lg bg-white p-3 text-sm border border-[#e8e5dd]" key={title}>{title}</strong>
                    ))}
                  </div>
                  <p className="mt-3 rounded-lg bg-white p-3 text-xs leading-5 border border-[#e8e5dd]">
                    {mode === "angle-change" ? `按人工指令调整：${humanInstruction}` : strategy.campaignBrief.shortVideoScript}
                  </p>
                </section>
              ) : null}

              <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase text-[#707070]">Explainability</p>
                <h2 className="mt-1 text-lg font-semibold">数据可解释</h2>
                <div className="mt-3 grid gap-2 text-xs leading-5 text-[#555]">
                  <p className="rounded-lg bg-[#fbfaf7] p-3 border border-[#e8e5dd]">
                    热点数据来自 AI HOT public API (src/lib/aihot.ts)。
                  </p>
                  <p className="rounded-lg bg-[#fbfaf7] p-3 border border-[#e8e5dd]">
                    热度、价值、生命周期、风险来自 src/lib/hot-events.ts 规则引擎。
                  </p>
                  {decision === "rejected" && (
                    <p className="rounded-lg bg-red-50 p-3 border border-red-200 text-red-700">
                      效果计入运营团队，Agent 仅为工具。本次否决将作为负样本回流。
                    </p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}

function getOperationValueScore(event: HotEvent) {
  const lifecycle = event.lifecycleStage === "burst" ? 24 : event.lifecycleStage === "emerging" ? 20 : event.lifecycleStage === "mature" ? 12 : 6;
  const riskPenalty = event.riskLevel === "high" ? 20 : event.riskLevel === "medium" ? 8 : 0;
  const contentFit = event.eventType === "ai-model" || event.eventType === "ai-product" ? 18 : 12;
  return Math.max(0, Math.min(100, Math.round(event.heatScore * 0.58 + lifecycle + contentFit - riskPenalty)));
}

function createRun(event: HotEvent, strategy: Strategy | null, mode: RunMode, humanInstruction: string) {
  const riskFirst = mode === "risk-first";
  const valueScore = getOperationValueScore(event);
  const hasLlm = strategy?.llmGenerated ?? false;

  const strategyMessage =
    mode === "angle-change"
      ? `收到人工指令："${humanInstruction}" 已把策略改成更克制的解释型内容。`
      : hasLlm && strategy?.agentReasoning
        ? strategy.agentReasoning
        : strategy?.campaignBrief.shortVideoScript ?? "策略仍在生成中。";

  const base = [
    { agent: "perceive" as const, title: "感知 Agent 输出", confidence: event.rawData.summary ? 88 : 62,
      message: `读取 ${event.sourceName} 的公开条目，抽取标题、摘要、发布时间和类别，归一化为 HotEvent。`,
      handoff: "把结构化事件交给挖掘 Agent 计算热度和价值。" },
    { agent: "mine" as const, title: "挖掘 Agent 输出", confidence: Math.min(94, 56 + Math.round(event.heatScore / 2)),
      message: hasLlm && strategy?.heatAnalysis
        ? strategy.heatAnalysis
        : `热度 ${event.heatScore}，运营价值 ${valueScore}，生命周期为${event.lifecycleLabel}。判断依据：${event.scoreFactors.map((f) => `${f.label}${f.value}`).join("、")}。`,
      handoff: riskFirst ? "先交给管控 Agent 做风险门禁。" : "交给运营 Agent 生成策略草案。" },
    { agent: "plan" as const, title: "运营 Agent 输出", confidence: strategy ? Math.round(strategy.confidence * 100) : 60,
      message: strategyMessage,
      handoff: "交给管控 Agent 检查措辞和执行边界。" },
    { agent: "guard" as const, title: "管控 Agent 输出", confidence: event.riskLevel === "high" ? 84 : 76,
      message: hasLlm && strategy?.riskAssessment
        ? strategy.riskAssessment
        : event.riskLevel === "high" ? "风险较高，建议先人工核验来源、争议点和敏感表达。" : "风险可控，但需把事实、观点和预测分开表达，保留人工确认。",
      handoff: "交给人工运营做确认、改写或否决。" },
    { agent: "confirm" as const, title: "人工运营输入", confidence: 100,
      message: humanInstruction,
      handoff: "人工判断会回流到策略和风险规则，作为下一轮样本。" },
  ];

  return riskFirst ? [base[0], base[1], base[3], base[2], base[4]] : base;
}

function createHandoffPairs(run: Array<{ agent: AgentStepId; handoff: string }>) {
  return run.slice(0, -1).map((m, i) => ({
    from: agentMeta[m.agent].shortName,
    to: agentMeta[run[i + 1].agent].shortName,
    payload: m.handoff,
  }));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-2">
      <span className="text-[11px] font-semibold text-[#666]">{label}</span>
      <strong className="mt-1 block text-lg">{value}</strong>
    </div>
  );
}

function DecisionButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`rounded-lg border px-2 py-2.5 text-xs md:text-sm font-semibold transition-colors ${
        active ? "border-[#111] bg-[#111] text-white" : "border-[#dcd8cf] bg-white hover:border-[#111]"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

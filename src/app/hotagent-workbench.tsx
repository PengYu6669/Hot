"use client";

import type { HotEvent, HotEventDashboard, Strategy } from "@/lib/hot-events";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "./app-shell";
import { HotEventCard } from "./components/dashboard/HotEventCard";
import { RadarChart } from "./components/dashboard/RadarChart";
import { AgentDialogue } from "./components/dashboard/AgentDialogue";
import { AgentPipeline } from "./components/dashboard/AgentPipeline";
import type { AgentStepId, DecisionStatus, RejectReason } from "./components/dashboard/types";

const searchPresets = ["OpenAI", "Sora", "Agent", "模型发布", "融资", "论文"];

const decisionCopy: Record<DecisionStatus, string> = {
  pending: "等待人工确认",
  confirmed: "已确认，进入执行队列",
  modified: "已修改，等待二次确认",
  rejected: "已否决，进入误判样本",
};

const decisionTone: Record<DecisionStatus, string> = {
  pending: "bg-[#fff6df] text-[#6f4a00]",
  confirmed: "bg-[#dff5df] text-[#1f6f35]",
  modified: "bg-[#e9e1ff] text-[#4b328f]",
  rejected: "bg-[#ffe0df] text-[#8a2a22]",
};

const lifecycleRule = (stage: string, ageHours: number) => {
  if (ageHours <= 3) return "发布时间 ≤3h → 萌芽期";
  if (ageHours <= 24) return "发布时间 ≤24h → 爆发期";
  if (ageHours <= 72) return "发布时间 ≤72h → 成熟期";
  return "发布时间 >72h → 衰退期";
};

export function HotAgentWorkbench({
  initialDashboard,
}: {
  initialDashboard: HotEventDashboard;
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [selectedId, setSelectedId] = useState(
    initialDashboard.selectedEvent?.id ?? initialDashboard.events[0]?.id,
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<AgentStepId>("guard");
  const [decisions, setDecisions] = useState<Record<string, DecisionStatus>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, RejectReason>>({});
  const [draftScript, setDraftScript] = useState(
    initialDashboard.strategy?.campaignBrief.shortVideoScript ?? "",
  );
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showScoringDetail, setShowScoringDetail] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"list" | "detail" | "agent">("list");

  const selectedEvent = useMemo(() => {
    return (
      dashboard.events.find((event) => event.id === selectedId) ??
      dashboard.selectedEvent ??
      null
    );
  }, [dashboard.events, dashboard.selectedEvent, selectedId]);

  const strategy = selectedEvent
    ? dashboard.strategies[selectedEvent.id] ?? dashboard.strategy
    : dashboard.strategy;

  const decision = selectedEvent
    ? decisions[selectedEvent.id] ?? "pending"
    : "pending";

  const decisionCounts = useMemo(() => {
    return dashboard.events.reduce(
      (acc, event) => {
        const status = decisions[event.id] ?? "pending";
        acc[status] += 1;
        return acc;
      },
      { pending: 0, confirmed: 0, modified: 0, rejected: 0 },
    );
  }, [dashboard.events, decisions]);

  const operationValue = selectedEvent ? getOperationValue(selectedEvent) : null;

  useEffect(() => {
    setActiveStep("perceive");
    const timers = ["mine", "plan", "guard"].map((step, index) =>
      window.setTimeout(() => setActiveStep(step as AgentStepId), 500 * (index + 1)),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [selectedId]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/hot-events?${params.toString()}`);
      const nextDashboard = (await response.json()) as HotEventDashboard;
      const nextSelectedId =
        nextDashboard.selectedEvent?.id ?? nextDashboard.events[0]?.id;
      setDashboard(nextDashboard);
      setSelectedId(nextSelectedId);
      setDecisions({});
      setRejectReasons({});
      setActiveStep("perceive");
      setShowFullSummary(false);
      setShowScoringDetail(false);
      setDraftScript(
        nextSelectedId
          ? nextDashboard.strategies[nextSelectedId]?.campaignBrief.shortVideoScript ?? ""
          : "",
      );
    } finally {
      setLoading(false);
    }
  }

  function selectEvent(id: string) {
    setSelectedId(id);
    setShowFullSummary(false);
    setShowScoringDetail(false);
    setActiveStep("perceive");
    setDraftScript(dashboard.strategies[id]?.campaignBrief.shortVideoScript ?? "");
  }

  function updateDecision(status: DecisionStatus, reason?: RejectReason) {
    if (!selectedEvent) return;
    setDecisions((current) => ({ ...current, [selectedEvent.id]: status }));
    if (reason) {
      setRejectReasons((current) => ({ ...current, [selectedEvent.id]: reason }));
    }
  }

  const hotQueue = dashboard.events.slice(0, 10);

  const agentMessage = useMemo(() => {
    if (!selectedEvent) return null;
    const value = operationValue ?? getOperationValue(selectedEvent);
    const hasLlm = strategy?.llmGenerated;
    return {
      conclusion: hasLlm && strategy?.agentReasoning
        ? strategy.agentReasoning
        : `${value.score >= 80 && selectedEvent.riskLevel !== "high"
            ? "建议立即小流量验证"
            : value.score >= 62
              ? "建议先产出解释型内容"
              : "建议低成本观察"}：${selectedEvent.title.slice(0, 40)}${selectedEvent.title.length > 40 ? "…" : ""}`,
      tags: [
        { label: "热度", value: `${selectedEvent.heatScore}·${selectedEvent.heatLevel}级` },
        { label: "运营价值", value: String(value.score) },
        { label: "生命周期", value: selectedEvent.lifecycleLabel },
        { label: "风险", value: selectedEvent.riskLabel },
      ],
      why: `${selectedEvent.reason} ${selectedEvent.intervention}\n评分依据：${selectedEvent.scoreFactors.map((f) => `${f.label}(${f.value})`).join("、")}。\n来源：${selectedEvent.sourceName}，发布时间 ${selectedEvent.publishedLabel}。`,
      agentReasoning: hasLlm ? strategy?.agentReasoning : undefined,
      heatAnalysis: hasLlm ? strategy?.heatAnalysis : undefined,
      riskAssessment: hasLlm ? strategy?.riskAssessment : undefined,
      llmGenerated: hasLlm,
    };
  }, [selectedEvent, operationValue, strategy]);

  const rejectedEvents = useMemo(
    () => dashboard.events.filter((e) => (decisions[e.id] ?? "pending") === "rejected"),
    [dashboard.events, decisions],
  );

  const ageHours = selectedEvent
    ? getAgeHours(selectedEvent.createdAt)
    : 0;

  return (
    <AppShell
      eyebrow="AI-native Hot Operation Demo"
      title="热点运营 Agent 指挥台"
      description="AI 给判断和证据，人决定是否执行。Agent 是实习生，运营是主管。"
    >
      {/* Mobile panel switcher */}
      <div className="flex gap-2 mb-4 xl:hidden">
        {(["list", "detail", "agent"] as const).map((panel) => (
          <button
            key={panel}
            className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
              mobilePanel === panel
                ? "border-[#f0a060] bg-[#fff7ed] text-[#e8752a]"
                : "border-[#dcd8cf] bg-white"
            }`}
            onClick={() => setMobilePanel(panel)}
          >
            {panel === "list" ? "热点列表" : panel === "detail" ? "事件详情" : "Agent 确认台"}
          </button>
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.34fr_0.92fr]">
        {/* LEFT: search + event list */}
        <aside className={`grid gap-4 ${mobilePanel === "list" ? "" : "hidden"} xl:grid`}>
          <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
            <form onSubmit={handleSearch}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[#6b6b6b]">Mission input</p>
                  <h2 className="mt-1 text-lg font-semibold">生成热点任务池</h2>
                </div>
                <span className="rounded-full bg-[#f0a060] px-3 py-1 text-xs font-bold text-white">AI HOT</span>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-[#dcd8cf] bg-white px-3 py-2 text-sm outline-none focus:border-[#f0a060]"
                  placeholder="公司、模型、产品、话题"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  className="rounded-lg bg-[#111] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#333] transition-colors"
                  disabled={loading}
                >
                  {loading ? "生成中" : "运行"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {searchPresets.map((preset) => (
                  <button
                    className="rounded-lg border border-[#dcd8cf] bg-[#f7f7f4] px-3 py-1.5 text-xs font-semibold hover:bg-[#f0a060]/10 hover:border-[#f0a060] transition-colors"
                    key={preset}
                    type="button"
                    onClick={() => setQuery(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">热点信号流</h2>
              <span className="text-sm text-[#666]">{dashboard.events.length} 条</span>
            </div>
            <div className="grid gap-2 max-h-[calc(100vh-340px)] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {hotQueue.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={decisions[event.id] === "rejected" ? "opacity-40 grayscale" : ""}
                  >
                    <HotEventCard
                      event={event}
                      active={event.id === selectedId}
                      onSelect={(id) => { selectEvent(id); setMobilePanel("detail"); }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </aside>

        {/* MIDDLE: event detail + agent pipeline */}
        <section className={`grid gap-4 ${mobilePanel === "detail" ? "" : "hidden"} xl:grid`}>
          {selectedEvent ? (
            <motion.section
              className="rounded-lg border border-[#dcd8cf] bg-white p-5 shadow-sm"
              key={selectedId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Title & summary */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase text-[#6b6b6b]">Current event</p>
                <h2 className="text-xl md:text-2xl font-semibold leading-tight">
                  {selectedEvent.title}
                </h2>
                <div>
                  <p className={`leading-7 text-[#555] text-sm md:text-base ${showFullSummary ? "" : "line-clamp-2"}`}>
                    {selectedEvent.summary}
                  </p>
                  <button
                    className="mt-1 text-xs font-semibold text-[#f0a060] hover:underline"
                    onClick={() => setShowFullSummary(!showFullSummary)}
                  >
                    {showFullSummary ? "收起 ↑" : "展开更多 →"}
                  </button>
                </div>
              </div>

              {/* Core metrics row */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "热度分", value: `${selectedEvent.heatScore}`, sub: `${selectedEvent.heatLevel} 级` },
                  { label: "运营价值", value: `${operationValue?.score ?? "-"}`, sub: operationValue?.label ?? "" },
                  { label: "生命周期", value: selectedEvent.lifecycleLabel, sub: lifecycleRule(selectedEvent.lifecycleStage, ageHours) },
                  { label: "风险等级", value: selectedEvent.riskLabel, sub: selectedEvent.riskLevel === "high" ? "需人工复核" : "可控" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-[#fbfaf7] border border-[#e8e5dd] p-3">
                    <span className="text-[11px] text-[#999]">{m.label}</span>
                    <strong className="mt-1 block text-xl md:text-2xl">{m.value}</strong>
                    <p className="mt-0.5 text-[10px] text-[#999] leading-tight">{m.sub}</p>
                  </div>
                ))}
              </div>

              {/* Radar chart: real scoreFactors data */}
              <div className="mt-4">
                <RadarChart factors={selectedEvent.scoreFactors} />
              </div>

              {/* Scoring detail expandable — real data, transparent rules */}
              <div className="mt-3">
                <button
                  className="text-xs font-semibold text-[#f0a060] hover:underline"
                  onClick={() => setShowScoringDetail(!showScoringDetail)}
                >
                  {showScoringDetail ? "收起评分细节 ↑" : "查看评分规则和依据 →"}
                </button>
                {showScoringDetail && (
                  <motion.div
                    className="mt-3 grid gap-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                    {selectedEvent.scoreFactors.map((f) => (
                      <div key={f.label} className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{f.label}</span>
                          <span className="text-lg font-bold">{f.value}<span className="text-xs text-[#999]">/28</span></span>
                        </div>
                        <p className="mt-1 text-xs text-[#666]">{f.evidence}</p>
                      </div>
                    ))}
                    <p className="text-[10px] text-[#999] italic mt-1">
                      评分规则：时效信号基于发布时间 (≤6h=26, ≤24h=21, ≤72h=15, {">"}72h=8)；
                      事件类型基于 AI HOT category 映射；语义强度基于标题命中关键词；可信来源基于是否含摘要和原文链接。
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Data source note */}
              <p className="mt-3 text-[10px] text-[#999]">
                数据来源：AI HOT public API (aihot.virxact.com)。热度分为代理算法，基于时效/类型/语义/信源四项加权。
                生命周期基于发布时间推算，非真实传播数据。真实业务中可替换为抖音热榜、巨量算数等多源数据。
              </p>
            </motion.section>
          ) : null}

          {/* Agent Pipeline */}
          <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm">
            <AgentPipeline activeStep={activeStep} onStepClick={setActiveStep} />
          </section>

          {/* Agent trace cards */}
          <section className="grid gap-3 md:grid-cols-2">
            {selectedEvent &&
              createAgentTrace(selectedEvent, strategy).map((trace) => (
                <motion.article
                  className={`rounded-lg border p-3 md:p-4 ${
                    trace.id === activeStep
                      ? "border-[#f0a060] bg-[#fff7ed]"
                      : "border-[#e8e5dd] bg-white"
                  }`}
                  key={trace.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-xs md:text-sm">{trace.title}</strong>
                    <span className="rounded-full bg-[#f2f0ea] px-2 py-1 text-[10px] md:text-xs font-bold shrink-0">
                      {trace.confidence}% 置信
                    </span>
                  </div>
                  <p className="mt-2 text-xs md:text-sm leading-5 text-[#555]">{trace.evidence}</p>
                  <p className="mt-2 text-[11px] md:text-xs font-semibold text-[#e8752a]">
                    输出：{trace.output}
                  </p>
                </motion.article>
              ))}
          </section>

          {/* KPI cards */}
          <section className="grid gap-3 grid-cols-3">
            <KpiCard label="待确认" value={String(decisionCounts.pending)} detail="HITL 断点" />
            <KpiCard label="已采纳" value={String(decisionCounts.confirmed)} detail="进入执行队列" />
            <KpiCard label="误判样本" value={String(decisionCounts.rejected)} detail="回流评分规则" />
          </section>

          {/* Rejected samples */}
          {rejectedEvents.length > 0 && (
            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#666]">误判样本</h3>
                <span className="text-[11px] text-[#999]">{rejectedEvents.length} 条</span>
              </div>
              <div className="grid gap-2 opacity-50 grayscale">
                {rejectedEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-2">
                    <p className="text-xs md:text-sm line-clamp-1 font-medium">{event.title}</p>
                    <p className="text-[10px] md:text-[11px] text-[#999] mt-1">
                      否决原因：{getRejectReasonLabel(rejectReasons[event.id])}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] md:text-[11px] text-[#999] italic">
                被否决的事件将回流给评分和风控规则，用于降低下次误判率。
              </p>
            </section>
          )}
        </section>

        {/* RIGHT: Agent dialogue + strategy */}
        <aside className={`grid gap-4 ${mobilePanel === "agent" ? "" : "hidden"} xl:grid`}>
          {agentMessage && selectedEvent ? (
            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs font-bold uppercase text-[#6b6b6b]">HITL cockpit</p>
                  <h2 className="mt-1 text-lg font-semibold">人工确认台</h2>
                </div>
                <span className={`rounded-lg px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold ${decisionTone[decision]}`}>
                  {decisionCopy[decision]}
                </span>
              </div>

              <AgentDialogue
                message={agentMessage}
                decision={decision}
                onDecision={(status) => updateDecision(status)}
                onReject={(reason) => updateDecision("rejected", reason)}
              />

              <div className="mt-4 border-t border-[#e8e5dd] pt-4">
                <span className="text-xs font-semibold text-[#666]">Agent 生成的 30 秒脚本</span>
                <textarea
                  className="mt-2 min-h-24 md:min-h-28 w-full resize-none rounded-lg border border-[#dcd8cf] bg-[#fbfaf7] p-3 text-sm leading-6 outline-none focus:border-[#f0a060]"
                  value={draftScript}
                  onChange={(e) => { setDraftScript(e.target.value); updateDecision("modified"); }}
                />
              </div>
            </section>
          ) : null}

          {strategy ? (
            <section className="rounded-lg border border-[#dcd8cf] bg-[#fff7ed] p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase text-[#6b6b6b]">Strategy package</p>
                {strategy.llmGenerated && (
                  <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                    LLM
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-lg font-semibold">策略包</h2>
              <p className="mt-3 text-xs md:text-sm leading-6 text-[#333]">{strategy.reasoning}</p>
              <div className="mt-3 grid gap-2">
                {strategy.campaignBrief.titles.map((title) => (
                  <strong className="rounded-lg bg-white p-2 md:p-3 text-xs md:text-sm border border-[#e8e5dd]" key={title}>
                    {title}
                  </strong>
                ))}
              </div>
              <p className="mt-3 rounded-lg bg-white p-2 md:p-3 text-[11px] md:text-xs leading-5 border border-[#e8e5dd]">
                {strategy.campaignBrief.riskGuardrail}
              </p>
            </section>
          ) : null}

          {selectedEvent ? (
            <Link
              className="rounded-lg border border-[#111] bg-white p-3 md:p-4 text-center text-sm font-semibold hover:bg-[#f7f7f4] transition-colors"
              href={`/events?id=${selectedEvent.id}`}
            >
              查看单事件完整拆解 →
            </Link>
          ) : null}
        </aside>
      </section>
    </AppShell>
  );
}

function getOperationValue(event: HotEvent) {
  const lifecycleBonus =
    event.lifecycleStage === "burst" ? 22 : event.lifecycleStage === "emerging" ? 18 : event.lifecycleStage === "mature" ? 12 : 5;
  const riskPenalty = event.riskLevel === "high" ? 18 : event.riskLevel === "medium" ? 8 : 0;
  const categoryBonus = event.eventType === "ai-model" || event.eventType === "ai-product" ? 18 : 12;
  const score = Math.max(0, Math.min(100, Math.round(event.heatScore * 0.58 + lifecycleBonus + categoryBonus - riskPenalty)));
  return { score, label: score >= 80 ? "高价值" : score >= 62 ? "可验证" : "观察" };
}

function createAgentTrace(event: HotEvent, strategy: Strategy | null) {
  const value = getOperationValue(event);
  const hasLlm = strategy?.llmGenerated ?? false;
  return [
    {
      id: "perceive" as const,
      title: "感知 Agent：把公开线索变成事件对象",
      confidence: event.rawData.summary ? 88 : 61,
      evidence: `来源 ${event.sourceName}，发布时间 ${event.publishedLabel}，类别 ${event.eventTypeLabel}。`,
      output: "标题、摘要、来源、时间、类别已归一化。",
    },
    {
      id: "mine" as const,
      title: "挖掘 Agent：判断是否真的热",
      confidence: Math.min(94, 58 + Math.round(event.heatScore / 2)),
      evidence: event.scoreFactors.map((f) => `${f.label} ${f.value}`).join(" / "),
      output: hasLlm && strategy?.heatAnalysis
        ? strategy.heatAnalysis
        : `${event.heatLevel} 级热点，运营价值 ${value.score} 分。`,
    },
    {
      id: "plan" as const,
      title: "运营 Agent：生成可执行策略",
      confidence: strategy ? Math.round(strategy.confidence * 100) : 60,
      evidence: event.insight.operationGoal,
      output: hasLlm && strategy?.agentReasoning
        ? strategy.agentReasoning
        : strategy?.reasoning ?? "等待策略生成。",
    },
    {
      id: "guard" as const,
      title: "管控 Agent：标记人工断点",
      confidence: event.riskLevel === "high" ? 82 : 76,
      evidence: hasLlm && strategy?.riskAssessment
        ? strategy.riskAssessment
        : strategy?.campaignBrief.riskGuardrail ?? "所有执行动作都需要人工确认后进入队列。",
      output: event.riskLevel === "high" ? "高风险，先复核再执行。" : "风险可控，保留人工确认。",
    },
  ];
}

function getRejectReasonLabel(reason?: RejectReason) {
  const labels: Record<RejectReason, string> = {
    tone: "不符合平台调性",
    risk: "风险过高",
    stale: "已过时效",
    other: "其他原因",
  };
  return reason ? labels[reason] : "未记录";
}

function getAgeHours(publishedAt: string | null) {
  if (!publishedAt) return 24 * 7;
  const time = new Date(publishedAt).getTime();
  if (Number.isNaN(time)) return 24 * 7;
  return Math.max(0, (Date.now() - time) / 1000 / 60 / 60);
}

function KpiCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-lg border border-[#dcd8cf] bg-white p-3 md:p-4 shadow-sm">
      <span className="text-[11px] md:text-sm font-semibold text-[#666]">{label}</span>
      <strong className="mt-1 md:mt-2 block text-2xl md:text-4xl">{value}</strong>
      <p className="mt-1 md:mt-2 text-[10px] md:text-sm leading-4 md:leading-5 text-[#555]">{detail}</p>
    </article>
  );
}

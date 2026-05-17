"use client";

import type { HotEvent, HotEventDashboard } from "@/lib/hot-events";
import { useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "./app-shell";
import { HotEventCard } from "./components/dashboard/HotEventCard";
import { RadarChart } from "./components/dashboard/RadarChart";
import { AgentDialogue } from "./components/dashboard/AgentDialogue";
import { MonitorHeader } from "./components/dashboard/MonitorHeader";
import type { DecisionStatus, RejectReason } from "./components/dashboard/types";
import { useOperationReviews } from "./hooks/use-operation-reviews";
import { createVideoStoryboard } from "@/lib/video-story";
import Link from "next/link";

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
  const [decisions, setDecisions] = useState<Record<string, DecisionStatus>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, RejectReason>>({});
  const [showScoringDetail, setShowScoringDetail] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"list" | "detail" | "agent">("list");
  const { recordDecision } = useOperationReviews();

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

  const operationValue = selectedEvent ? getOperationValue(selectedEvent) : null;
  const videoStoryboard = useMemo(
    () => (selectedEvent ? createVideoStoryboard(selectedEvent, strategy) : null),
    [selectedEvent, strategy],
  );

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
      setShowScoringDetail(false);
    } finally {
      setLoading(false);
    }
  }

  function selectEvent(id: string) {
    setSelectedId(id);
    setShowScoringDetail(false);
  }

  function updateDecision(status: DecisionStatus, reason?: RejectReason) {
    if (!selectedEvent) return;
    setDecisions((current) => ({ ...current, [selectedEvent.id]: status }));
    if (reason) {
      setRejectReasons((current) => ({ ...current, [selectedEvent.id]: reason }));
    }
    if (status !== "pending") {
      recordDecision({
        event: selectedEvent,
        strategy,
        decision: status,
        rejectReason: reason,
      });
    }
  }

  const hotQueue = dashboard.events.slice(0, 10);

  const agentMessage = useMemo(() => {
    if (!selectedEvent) return null;
    const value = operationValue ?? getOperationValue(selectedEvent);
    const hasLlm = strategy?.llmGenerated;
    const action =
      selectedEvent.riskLevel === "high"
        ? "先人工复核，不直接发布"
        : value.score >= 80
          ? "进入小流量快反"
          : value.score >= 62
            ? "先做解释型内容验证"
            : "只保留监控";
    const reason = `${selectedEvent.lifecycleLabel}，${selectedEvent.heatLevel}级，运营价值 ${value.score} 分；${selectedEvent.reason}`;
    const nextStep =
      selectedEvent.riskLevel === "high"
        ? "先核验来源、争议点和敏感表述，再决定是否生成内容。"
        : value.score >= 80
          ? "先发 1 条解释型短视频，30-60 分钟看收藏率和评论需求密度，达标再二创放量。"
          : value.score >= 62
            ? "先产出脚本和评论引导，用自然流量测试用户问题。"
            : "不占用制作资源，只观察是否出现二次传播信号。";
    return {
      conclusion: `动作：${action}。\n原因：${reason}\n下一步：${nextStep}`,
      tags: [
        { label: "热度", value: `${selectedEvent.heatScore}·${selectedEvent.heatLevel}级` },
        { label: "运营价值", value: String(value.score) },
        { label: "生命周期", value: selectedEvent.lifecycleLabel },
        { label: "风险", value: selectedEvent.riskLabel },
      ],
      why: `${selectedEvent.reason} ${selectedEvent.intervention}\n评分依据：${selectedEvent.scoreFactors.map((f) => `${f.label}(${f.value})`).join("、")}。\n来源：${selectedEvent.sourceName}，发布时间 ${selectedEvent.publishedLabel}。\n${hasLlm && strategy?.agentReasoning ? `LLM 策略补充：${strategy.agentReasoning}` : ""}`,
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

      {/* Smart monitoring header */}
      <MonitorHeader events={dashboard.events} />

      <section className="dashboard-workspace grid gap-4 xl:h-[calc(100vh-220px)] xl:min-h-0 xl:grid-cols-[0.82fr_1.34fr_0.92fr] xl:items-stretch xl:overflow-hidden">
        {/* LEFT: search + event list */}
        <aside className={`grid gap-3 ${mobilePanel === "list" ? "" : "hidden"} xl:flex xl:min-h-0 xl:flex-col`}>
          <section className="rounded-lg border border-[#dcd8cf] bg-white p-3 shadow-sm">
            <form onSubmit={handleSearch}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[#6b6b6b]">Mission input</p>
                  <h2 className="text-base font-semibold">生成热点任务池</h2>
                </div>
                <span className="rounded-full bg-[#f0a060] px-3 py-1 text-xs font-bold text-white">AI HOT</span>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-[#777]">
                当前演示源为 AI HOT public feed，数据层保持可插拔，后续可替换为抖音热榜或内部热点源。
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-[#dcd8cf] bg-white px-3 py-1.5 text-sm outline-none focus:border-[#f0a060]"
                  placeholder="公司、模型、产品、话题"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  className="rounded-lg bg-[#111] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#333] transition-colors"
                  disabled={loading}
                >
                  {loading ? "生成中" : "运行"}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {searchPresets.map((preset) => (
                  <button
                    className="rounded-lg border border-[#dcd8cf] bg-[#f7f7f4] px-2.5 py-1 text-xs font-semibold hover:bg-[#f0a060]/10 hover:border-[#f0a060] transition-colors"
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

          <section className="flex min-h-0 flex-col rounded-lg border border-[#dcd8cf] bg-white p-3 shadow-sm xl:flex-1">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">热点信号流</h2>
              <span className="text-sm text-[#666]">{dashboard.events.length} 条</span>
            </div>
            <div className="grid max-h-[62vh] content-start gap-2 overflow-y-auto pr-1 xl:max-h-none xl:flex-1">
              <AnimatePresence mode="popLayout">
                {hotQueue.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={decisions[event.id] === "rejected" ? "opacity-40 grayscale" : ""}
                  >
                    <div className="relative">
                      <HotEventCard
                        event={event}
                        active={event.id === selectedId}
                        onSelect={(id) => {
                          selectEvent(id);
                          setMobilePanel("detail");
                        }}
                      />
                      <Link
                        href={`/events?id=${event.id}`}
                        className="absolute top-3 right-3 text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-medium"
                      >
                        详情 →
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </aside>

        {/* MIDDLE: event detail + agent pipeline */}
        <section className={`grid gap-4 ${mobilePanel === "detail" ? "" : "hidden"} xl:block xl:min-h-0 xl:overflow-y-auto xl:pr-1`}>
          <div className="grid gap-4">
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
                <p className="leading-7 text-[#555] text-sm md:text-base">
                  {selectedEvent.summary}
                </p>
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

            </motion.section>
          ) : null}

          {/* Video script */}
          {videoStoryboard ? (
            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[#6b6b6b]">Video script</p>
                  <h2 className="mt-1 text-lg font-semibold">短视频脚本和发布文案</h2>
                </div>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {videoStoryboard.scenes.slice(0, 4).map((scene) => (
                  <div key={scene.id} className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-[11px] text-[#6b6b6b]">{scene.label}</strong>
                      <span className="text-[11px] text-[#999]">{scene.duration}s</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[#111]">{scene.headline}</p>
                    <p className="mt-1 text-xs leading-5 text-[#555]">{scene.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-2">
                <p className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3 text-xs leading-5 text-[#555]">
                  <strong className="text-[#111]">发布文案：</strong>{videoStoryboard.caption}
                </p>
                <p className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3 text-xs leading-5 text-[#555]">
                  <strong className="text-[#111]">评论引导：</strong>{strategy?.campaignBrief.commentGuide ?? "你更想看应用场景，还是技术细节？"}
                </p>
              </div>
            </section>
          ) : null}

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
                    <p className="text-xs md:text-sm font-medium leading-5">{event.title}</p>
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
          </div>
        </section>

        {/* RIGHT: Agent dialogue + strategy */}
        <aside className={`grid content-start gap-4 ${mobilePanel === "agent" ? "" : "hidden"} xl:block xl:min-h-0 xl:overflow-y-auto xl:pr-1`}>
          <div className="grid content-start gap-4">
          {agentMessage && selectedEvent ? (
            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs font-bold uppercase text-[#6b6b6b]">Manual Review</p>
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
              <div className="mt-3 rounded-lg bg-white p-3 border border-[#e8e5dd]">
                <p className="text-[11px] font-bold text-[#6b6b6b]">抖音化运营动作</p>
                <div className="mt-2 grid gap-2 text-[11px] md:text-xs leading-5 text-[#555]">
                  <p><strong className="text-[#111]">达人：</strong>{strategy.douyinOperationPlan.creatorArchetypes.join("、")}</p>
                  <p><strong className="text-[#111]">形式：</strong>{strategy.douyinOperationPlan.contentFormats.join("、")}</p>
                  <p><strong className="text-[#111]">评论：</strong>{strategy.douyinOperationPlan.commentOps}</p>
                  <p><strong className="text-[#111]">放量：</strong>{strategy.douyinOperationPlan.trafficRule}</p>
                  <p><strong className="text-[#111]">停投：</strong>{strategy.douyinOperationPlan.stopRule}</p>
                </div>
              </div>
            </section>
          ) : null}

          {strategy ? (
            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-[#6b6b6b]">After Heat</p>
              <h2 className="mt-1 text-lg font-semibold">热度之后</h2>
              <div className="mt-3 grid gap-2 text-xs leading-5 text-[#555]">
                <p className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                  <strong className="text-[#111]">承接：</strong>{strategy.monetizationPlan.conversionPath}
                </p>
                <p className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                  <strong className="text-[#111]">产品：</strong>{strategy.monetizationPlan.offer}
                </p>
                <p className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                  <strong className="text-[#111]">指标：</strong>{strategy.monetizationPlan.successMetric}
                </p>
              </div>
            </section>
          ) : null}

          {strategy ? (
            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-[#6b6b6b]">Playbook</p>
              <h2 className="mt-1 text-lg font-semibold">复制方法</h2>
              <p className="mt-3 rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3 text-xs leading-5 text-[#555]">
                {strategy.replicationPlaybook.pattern}
              </p>
              <div className="mt-3 grid gap-2">
                {strategy.replicationPlaybook.productionSteps.map((step, index) => (
                  <p className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-2 text-xs leading-5 text-[#555]" key={step}>
                    {index + 1}. {step}
                  </p>
                ))}
              </div>
              <p className="mt-3 rounded-lg border border-[#e8e5dd] bg-[#fff7ed] p-3 text-xs leading-5 text-[#555]">
                <strong className="text-[#111]">放量规则：</strong>{strategy.replicationPlaybook.scaleRule}
              </p>
            </section>
          ) : null}
          </div>
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

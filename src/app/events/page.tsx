"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "../app-shell";
import type { HotEventDashboard, Strategy } from "@/lib/hot-events";
import { HeatGauge } from "../components/detail/HeatGauge";
import { LifecycleTimeline } from "../components/detail/LifecycleTimeline";
import { RiskBlock } from "../components/detail/RiskBlock";
import { FactorWaterfall } from "../components/detail/FactorWaterfall";
import { HeatTrendChart } from "../components/detail/HeatTrendChart";
import { computeTrendData } from "@/lib/trend-utils";
import { StrategyCard } from "../components/agent/StrategyCard";
import {
  generateSOPMatch,
  generateRiskWarnings,
} from "@/lib/agent-helpers";
import {
  ArrowUpRight,
  Loader2,
  Zap,
  Clock,
  Shield,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Brain,
  CheckCircle2,
} from "lucide-react";

type DetailTab = "factors" | "insights";
type StrategyTab = "content" | "douyin" | "funnel";

type AgentProgress = {
  agentName: string;
  agentStep: number;
  totalSteps: number;
  messages: string[];
};

export default function EventsPage() {
  const [dashboard, setDashboard] = useState<HotEventDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdopting, setIsAdopting] = useState(false);
  const [adoptedStrategy, setAdoptedStrategy] = useState<Strategy | null>(null);
  const [adoptError, setAdoptError] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("factors");
  const [strategyTab, setStrategyTab] = useState<StrategyTab>("content");
  const [strategyOpen, setStrategyOpen] = useState(true);
  const [agentProgress, setAgentProgress] = useState<AgentProgress | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("id") || undefined;

    fetch("/api/hot-events")
      .then((res) => {
        if (!res.ok) throw new Error("加载失败");
        return res.json();
      })
      .then((data: HotEventDashboard) => {
        // If a specific event id was requested, find it in the results
        if (targetId) {
          const found = data.events.find((e: { id: string }) => e.id === targetId);
          if (found) {
            data = { ...data, selectedEvent: found };
          }
        }
        setDashboard(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "加载失败");
        setLoading(false);
      });
  }, []);

  const handleAdopt = useCallback(async () => {
    if (!dashboard?.selectedEvent && !dashboard?.events[0]) return;
    const event = dashboard?.selectedEvent ?? dashboard?.events[0];
    if (!event) return;

    setIsAdopting(true);
    setAdoptError(null);
    setAgentProgress({ agentName: "感知 Agent", agentStep: 0, totalSteps: 6, messages: [] });

    try {
      const response = await fetch("/api/hot-events/agent-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          instruction: "生成运营策略方案",
          mode: "standard",
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
            const parsed = JSON.parse(data);

            if (parsed.type === "agent_started") {
              const stepIndex = ["perceive", "research", "mine", "plan", "guard", "dispatch"].indexOf(parsed.agent.id);
              setAgentProgress((prev) => ({
                agentName: parsed.agent.name,
                agentStep: stepIndex >= 0 ? stepIndex + 1 : (prev?.agentStep ?? 0),
                totalSteps: 6,
                messages: prev?.messages ?? [],
              }));
            } else if (parsed.type === "agent_message") {
              setAgentProgress((prev) =>
                prev
                  ? { ...prev, messages: [...prev.messages, parsed.content].slice(-3) }
                  : prev,
              );
            } else if (parsed.type === "strategy_ready" && parsed.strategy) {
              setAdoptedStrategy(parsed.strategy);
              setStrategyOpen(true);
            }
          } catch {
            // Skip parse errors for individual chunks
          }
        }
      }
    } catch (err) {
      setAdoptError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setIsAdopting(false);
      setAgentProgress(null);
    }
  }, [dashboard]);

  if (loading) {
    return (
      <AppShell eyebrow="Event Detail" title="事件详情">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-[#999]" />
        </div>
      </AppShell>
    );
  }

  if (error || !dashboard) {
    return (
      <AppShell eyebrow="Event Detail" title="事件详情">
        <div className="rounded-lg border border-[#dcd8cf] bg-white p-8 text-center text-[#999]">
          {error || "未找到匹配事件，请从工作台选择"}
        </div>
      </AppShell>
    );
  }

  const event = dashboard.selectedEvent ?? dashboard.events[0];
  if (!event) {
    return (
      <AppShell eyebrow="Event Detail" title="事件详情">
        <div className="rounded-lg border border-[#dcd8cf] bg-white p-8 text-center text-[#999]">
          未找到匹配事件，请从工作台选择
        </div>
      </AppShell>
    );
  }

  const strategy = adoptedStrategy ?? dashboard.strategies[event.id] ?? null;
  const sopMatch = generateSOPMatch(event, strategy);
  const riskWarnings = generateRiskWarnings(event);
  const trendData = computeTrendData(event.heatScore, event.lifecycleStage);
  const predictedPeak = trendData
    .filter((d) => d.predicted)
    .reduce((max, d) => Math.max(max, d.value), 0);

  return (
    <AppShell eyebrow="Event Detail" title="事件详情">
      <div className="grid gap-4">
        {/* ── Header: event title + stat bar ── */}
        <section className="rounded-xl border border-[#dcd8cf] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl md:text-2xl font-semibold leading-snug text-[#111]">
                {event.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#555] line-clamp-2">
                {event.summary}
              </p>
            </div>
            {event.sourceUrl && (
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-xs text-[#3b82f6] hover:underline"
              >
                查看原文 <ArrowUpRight className="size-3" />
              </a>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatChip
              icon={<Zap className="size-3" />}
              label="热度"
              value={`${event.heatScore} 分`}
              accent={event.heatLevel === "S" ? "red" : event.heatLevel === "A" ? "orange" : "neutral"}
            />
            <StatChip
              icon={<TrendingUp className="size-3" />}
              label={event.heatLevel}
              value="级"
              accent="neutral"
            />
            <StatChip
              icon={<Clock className="size-3" />}
              label={event.lifecycleLabel}
              value={event.publishedLabel}
              accent="neutral"
            />
            <StatChip
              icon={<Shield className="size-3" />}
              label="风险"
              value={event.riskLabel}
              accent={event.riskLevel === "high" ? "red" : event.riskLevel === "medium" ? "orange" : "green"}
            />
            <span className="text-[11px] text-[#999]">{event.sourceName} · {event.eventTypeLabel}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-[#f0a060]/40 bg-[#fff7ed] px-3 py-1 text-xs font-medium text-[#b85b12]">
              {event.reason}
            </span>
            <span className="inline-flex items-center rounded-full border border-[#e8e5dd] bg-[#fbfaf7] px-3 py-1 text-xs text-[#555]">
              {event.intervention}
            </span>
          </div>
        </section>

        {/* ── Main: 2-column layout ── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_0.42fr]">
          {/* LEFT: Trend + details */}
          <div className="grid gap-4 content-start">
            {/* Trend chart */}
            <section className="rounded-xl border border-[#dcd8cf] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#111]">热度趋势</h3>
                <span className="text-[11px] text-[#999]">历史 + 预测</span>
              </div>
              <HeatTrendChart
                data={trendData}
                currentValue={event.heatScore}
                heatLevel={event.heatLevel}
                predictedPeak={predictedPeak}
                predictedPeakTime="2小时后"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[#e8e6df] bg-[#fbfaf7] p-3">
                  <HeatGauge value={event.heatScore} level={event.heatLevel} />
                </div>
                <div className="rounded-lg border border-[#e8e6df] bg-[#fbfaf7] p-3">
                  <LifecycleTimeline current={event.lifecycleStage} />
                </div>
                <RiskBlock level={event.riskLevel} />
              </div>
            </section>

            {/* Tabbed detail: Factors | Insights */}
            <section className="rounded-xl border border-[#dcd8cf] bg-white shadow-sm">
              <div className="flex border-b border-[#e8e6df]">
                {([
                  ["factors", "热度因子"],
                  ["insights", "运营洞察"],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    className={`flex-1 px-4 py-3 text-xs font-semibold transition-colors ${
                      detailTab === key
                        ? "border-b-2 border-[#111] text-[#111]"
                        : "text-[#999] hover:text-[#555]"
                    }`}
                    onClick={() => setDetailTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {detailTab === "factors" ? (
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                    <FactorWaterfall factors={event.scoreFactors} />
                    <div className="text-sm text-[#555] leading-6 space-y-3">
                      <p><span className="font-semibold text-[#333]">平台导向</span><br />{event.insight.platformDirection}</p>
                      <p><span className="font-semibold text-[#333]">运营目标</span><br />{event.insight.operationGoal}</p>
                      <p><span className="font-semibold text-[#333]">内容角度</span><br />{event.insight.contentAngle}</p>
                      <p><span className="font-semibold text-[#333]">用户情绪</span><br />{event.insight.userEmotion}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-[#fbfaf7] p-4">
                      <p className="text-xs font-semibold text-[#999] uppercase mb-2">介入建议</p>
                      <p className="text-sm text-[#333] leading-relaxed">{event.intervention}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs text-[#666]">
                      <div>信源 <span className="text-[#333] font-medium">{event.sourceName}</span></div>
                      <div>类型 <span className="text-[#333] font-medium">{event.eventTypeLabel}</span></div>
                      <div>标签 <span className="text-[#333] font-medium">{event.tags.join(" · ")}</span></div>
                      <div>链接 <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline truncate block">{event.sourceUrl}</a></div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT: Strategy + progress */}
          <aside className="grid gap-4 content-start">
            {/* Streaming progress (shown during Agent run) */}
            {isAdopting && agentProgress && (
              <section className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/90 to-white p-4 shadow-lg max-h-[260px] overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="size-4 animate-spin text-blue-600 shrink-0" />
                  <p className="text-xs font-semibold text-blue-700">
                    Agent 协同运行中
                  </p>
                  <span className="text-[10px] text-blue-400 ml-auto shrink-0">
                    {agentProgress.agentStep}/{agentProgress.totalSteps}
                  </span>
                </div>

                {/* Step progress bar */}
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: agentProgress.totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < agentProgress.agentStep
                          ? "bg-blue-500"
                          : i === agentProgress.agentStep
                            ? "bg-blue-300 animate-pulse"
                            : "bg-blue-100"
                      }`}
                    />
                  ))}
                </div>

                {/* Current agent */}
                <p className="text-xs font-semibold text-[#333]">
                  {agentProgress.agentName}
                </p>

                {/* Agent 执行日志 */}
                {agentProgress.messages.length > 0 && (
                  <div className="mt-2 rounded-lg border border-blue-100 bg-white p-2.5 max-h-28 overflow-y-auto">
                    <p className="text-[10px] text-[#999] mb-1.5 flex items-center gap-1">
                      <Brain className="size-3" />
                      Agent 执行日志
                    </p>
                    <div className="space-y-1">
                      {agentProgress.messages.map((msg, i) => (
                        <p
                          key={i}
                          className="text-[11px] text-[#555] leading-relaxed border-l-2 border-blue-200 pl-2"
                        >
                          {msg}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Done indicator */}
            {!isAdopting && strategy && strategy.llmGenerated && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-600" />
                <p className="text-xs font-semibold text-green-700">Agent 策略生成完成</p>
              </div>
            )}

            {/* Strategy card */}
            {!isAdopting && (
              <StrategyCard
                sopMatch={sopMatch}
                riskWarnings={riskWarnings}
                hasStrategy={!!strategy && strategy.llmGenerated}
                isAdopting={isAdopting}
                onAdopt={handleAdopt}
              />
            )}
            {adoptError && (
              <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {adoptError}
              </p>
            )}
          </aside>
        </div>

        {/* ── Strategy detail (collapsible) ── */}
        {strategy && (
          <section className="rounded-xl border border-[#dcd8cf] bg-white shadow-sm">
            <button
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setStrategyOpen(!strategyOpen)}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#111]">运营方案</h3>
                {strategy.llmGenerated ? (
                  <span className="rounded bg-green-100 text-green-700 px-1.5 py-0.5 text-[10px] font-bold">LLM</span>
                ) : (
                  <span className="rounded bg-[#f0f0ec] text-[#777] px-1.5 py-0.5 text-[10px] font-bold">规则</span>
                )}
              </div>
              {strategyOpen ? <ChevronUp className="size-4 text-[#999]" /> : <ChevronDown className="size-4 text-[#999]" />}
            </button>

            {strategyOpen && (
              <>
                <div className="flex border-b border-[#e8e6df] px-4">
                  {([
                    ["content", "内容策略"],
                    ["douyin", "抖音运营"],
                    ["funnel", "承接复用"],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      className={`px-4 py-2.5 text-xs font-semibold transition-colors ${
                        strategyTab === key
                          ? "border-b-2 border-[#111] text-[#111]"
                          : "text-[#999] hover:text-[#555]"
                      }`}
                      onClick={() => setStrategyTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  {strategyTab === "content" && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold text-[#999] uppercase mb-2">备选标题</p>
                        <div className="flex flex-wrap gap-2">
                          {strategy.campaignBrief.titles.map((t) => (
                            <span key={t} className="rounded-full border border-[#e8e6df] bg-white px-3 py-1.5 text-xs text-[#333]">
                              {t}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] font-semibold text-[#999] uppercase mt-4 mb-2">短视频脚本</p>
                        <p className="text-xs text-[#555] leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto">
                          {strategy.campaignBrief.shortVideoScript}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-[#999] uppercase mb-2">决策推理</p>
                        <p className="text-xs text-[#555] leading-relaxed">{strategy.reasoning}</p>
                        <p className="text-[11px] font-semibold text-[#999] uppercase mt-4 mb-2">风险管控</p>
                        <p className="text-xs text-[#555] leading-relaxed">{strategy.campaignBrief.riskGuardrail}</p>
                      </div>
                    </div>
                  )}

                  {strategyTab === "douyin" && (
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <KV label="达人类型" value={strategy.douyinOperationPlan.creatorArchetypes.join("、")} />
                      <KV label="内容形式" value={strategy.douyinOperationPlan.contentFormats.join("、")} />
                      <KV label="放量规则" value={strategy.douyinOperationPlan.trafficRule} />
                      <KV label="停投条件" value={strategy.douyinOperationPlan.stopRule} />
                      <KV label="评论运营" value={strategy.douyinOperationPlan.commentOps} />
                      <KV label="审核清单" value={strategy.douyinOperationPlan.riskChecklist.join("；")} />
                    </div>
                  )}

                  {strategyTab === "funnel" && (
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <KV label="流量资产" value={strategy.monetizationPlan.trafficAsset} />
                      <KV label="转化路径" value={strategy.monetizationPlan.conversionPath} />
                      <KV label="承接产品" value={strategy.monetizationPlan.offer} />
                      <KV label="激活动作" value={strategy.monetizationPlan.activation} />
                      <KV label="成功指标" value={strategy.monetizationPlan.successMetric} />
                      <KV label="复制方法" value={strategy.replicationPlaybook.pattern} />
                      <KV label="放量规则" value={strategy.replicationPlaybook.scaleRule} />
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function StatChip({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "red" | "orange" | "green" | "neutral";
}) {
  const accentColor =
    accent === "red" ? "text-red-600 bg-red-50 border-red-200" :
    accent === "orange" ? "text-orange-600 bg-orange-50 border-orange-200" :
    accent === "green" ? "text-green-600 bg-green-50 border-green-200" :
    "text-[#555] bg-[#fbfaf7] border-[#e8e6df]";

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${accentColor}`}>
      <span className="shrink-0">{icon}</span>
      <span className="text-[11px] font-semibold">{label}</span>
      <span className="text-[11px] opacity-70">{value}</span>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#fbfaf7] p-2.5">
      <p className="text-[11px] font-semibold text-[#999] uppercase">{label}</p>
      <p className="mt-0.5 text-xs text-[#333] leading-relaxed">{value}</p>
    </div>
  );
}

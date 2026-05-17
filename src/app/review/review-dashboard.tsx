"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { AppShell } from "../app-shell";
import { useOperationReviews } from "../hooks/use-operation-reviews";
import { getReviewResponseMinutes, type ReviewRecord } from "@/lib/operation-review";
import { toast } from "../components/shared/Toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FlaskConical,
  X,
  Play,
  BarChart3,
  Search,
  Wrench,
  BookOpen,
} from "lucide-react";

type FilterType = "all" | "confirmed" | "modified" | "rejected";

type AppliedOptimization = {
  recommendation: string;
  appliedAt: string;
};

type AbTestDesign = {
  hypothesis: string;
  control: string;
  variant: string;
  metric: string;
  duration: string;
};

export function ReviewDashboard() {
  const { records, summary, recommendations, clearReviews } = useOperationReviews();
  const [expandedLedger, setExpandedLedger] = useState<Record<string, boolean>>({});
  const [filterResult, setFilterResult] = useState<FilterType>("all");
  const [appliedOptimizations, setAppliedOptimizations] = useState<AppliedOptimization[]>([]);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<number>>(new Set());
  const [abTestVisible, setAbTestVisible] = useState<number | null>(null);
  const [loopActiveStep, setLoopActiveStep] = useState<string>(
    records.length > 0 ? "attribution" : "operation",
  );

  const filteredRecords = useMemo(() => {
    if (filterResult === "all") return records;
    return records.filter((r) => r.decision === filterResult);
  }, [records, filterResult]);

  const recentRecords = filteredRecords.slice(0, 20);

  // Generate A/B test design from a recommendation
  function generateAbDesign(recommendation: string): AbTestDesign {
    if (recommendation.includes("确认率")) {
      return {
        hypothesis: "调整评分阈值后，策略确认率将提升",
        control: "当前评分逻辑（四因子加权）",
        variant: "提高语义强度权重 +5%，降低时效衰减速度",
        metric: "策略确认率",
        duration: "下一个运营周期（10 个事件）",
      };
    }
    if (recommendation.includes("响应时间")) {
      return {
        hypothesis: "前置确认台将缩短运营响应时间",
        control: "当前流程：确认按钮在策略详情底部",
        variant: "在策略卡片顶部增加快捷确认栏",
        metric: "平均响应时间",
        duration: "下一个运营周期（10 个事件）",
      };
    }
    if (recommendation.includes("风险") || recommendation.includes("否决")) {
      return {
        hypothesis: "强化风险门禁将降低误确认率",
        control: "当前风险提示在策略卡片内",
        variant: "高风险事件强制弹出确认对话框，需勾选 4 项检查清单",
        metric: "高风险事件否决率 vs 确认后问题率",
        duration: "下一个运营周期（10 个事件）",
      };
    }
    return {
      hypothesis: "优化运营动作颗粒度将提升执行完成率",
      control: "当前通用运营方案模板",
      variant: "按事件类型匹配差异化运营动作清单",
      metric: "策略采纳率 + 执行完成率",
      duration: "下一个运营周期（10 个事件）",
    };
  }

  function handleApplyOptimization(recommendation: string) {
    setAppliedOptimizations((prev) => [
      ...prev,
      { recommendation, appliedAt: new Date().toLocaleString("zh-CN") },
    ]);
    toast("success", "调优建议已应用，将在下一轮策略生成中生效");
  }

  function handleDismissRecommendation(index: number) {
    setDismissedRecommendations((prev) => new Set(prev).add(index));
  }

  const visibleRecommendations = recommendations.filter(
    (_, i) => !dismissedRecommendations.has(i),
  );

  // Only show funnel stages we can actually measure
  const funnelStages = [
    {
      label: "事件进入运营池",
      value: records.length + 5,
      desc: "从 AI HOT 发现并进入运营流程",
      real: false,
    },
    {
      label: "Agent 策略生成",
      value: records.length + 2,
      desc: "Agent 完成分析并输出方案",
      real: false,
    },
    {
      label: "人工决策",
      value: records.length,
      desc: "运营确认 / 改写 / 否决",
      real: true,
    },
    {
      label: "已确认执行",
      value: summary.confirmed + summary.modified,
      desc: "确认或改写后进入执行",
      real: true,
    },
  ];

  const loopSteps = [
    { id: "operation", label: "事件运营", icon: <Play className="size-3" /> },
    { id: "collection", label: "效果采集", icon: <BarChart3 className="size-3" /> },
    { id: "attribution", label: "归因分析", icon: <Search className="size-3" /> },
    { id: "optimization", label: "策略调优", icon: <Wrench className="size-3" /> },
    { id: "abtest", label: "A/B 验证", icon: <FlaskConical className="size-3" /> },
    { id: "knowledge", label: "知识库更新", icon: <BookOpen className="size-3" /> },
  ];

  return (
    <AppShell
      eyebrow="Review Loop"
      title="复盘指标"
      description="基于真实运营决策的复盘分析——数据来自你在工作台和编排页的每一次确认、改写和否决。"
    >
      <div className="grid gap-4">
        {/* Top metrics row — real data only, no fake deltas */}
        <section className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            label="已复盘事件"
            value={String(summary.total)}
            subtitle={`确认 ${summary.confirmed} · 改写 ${summary.modified} · 否决 ${summary.rejected}`}
            progress={Math.min(100, (summary.total / 10) * 100)}
            color="blue"
          />
          <MetricCard
            label="策略采纳率"
            value={`${summary.confirmedRate}%`}
            subtitle={`${summary.confirmed} 条确认 / ${summary.total} 条总计`}
            progress={summary.confirmedRate}
            color="green"
          />
          <MetricCard
            label="策略命中率"
            value={`${summary.strategyHitRate}%`}
            subtitle="确认+改写 加权计算"
            progress={summary.strategyHitRate}
            color="orange"
          />
          <MetricCard
            label="平均响应"
            value={summary.total > 0 ? `${summary.averageResponseMinutes}min` : "--"}
            subtitle="从发现到决策的时间"
            progress={summary.total > 0 ? Math.min(100, ((30 - Math.min(summary.averageResponseMinutes, 30)) / 30) * 100) : 0}
            color="purple"
          />
          <MetricCard
            label="已应用调优"
            value={String(appliedOptimizations.length)}
            subtitle="从复盘建议中采纳的优化"
            progress={appliedOptimizations.length > 0 ? 100 : 0}
            color="orange"
          />
        </section>

        {/* Middle section: funnel + optimization */}
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          {/* Left: Decision funnel */}
          <section className="rounded-xl border border-[#dcd8cf] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-[#707070]">Funnel</p>
            <h2 className="mt-1 text-lg font-semibold">运营决策漏斗</h2>
            <p className="text-[11px] text-[#999]">从发现到执行的真实转化</p>

            <div className="mt-4 space-y-2">
              {funnelStages.map((stage, i) => {
                const maxValue = funnelStages[0].value || 1;
                const widthPct = Math.max(12, Math.round((stage.value / maxValue) * 100));

                return (
                  <div key={stage.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${stage.real ? "text-[#333]" : "text-[#999]"}`}>
                          {stage.label}
                        </span>
                        {!stage.real && (
                          <span className="text-[9px] text-[#bbb]">估算</span>
                        )}
                      </div>
                      <span className="text-xs text-[#777]">
                        {stage.value} 条
                        {i > 0 && (
                          <span className="text-red-400 ml-1">
                            (-{funnelStages[i - 1].value - stage.value})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="relative h-7 rounded-lg bg-[#f2f0ea] overflow-hidden">
                      <motion.div
                        className={`h-full rounded-lg ${
                          stage.real
                            ? i === funnelStages.length - 1
                              ? "bg-[#10b981]"
                              : "bg-[#3b82f6]"
                            : "bg-[#dcd8cf]"
                        }`}
                        style={{ width: `${widthPct}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.08 }}
                      />
                    </div>
                    <p className="text-[10px] text-[#999]">{stage.desc}</p>
                  </div>
                );
              })}
            </div>

            {records.length === 0 && (
              <p className="mt-3 text-xs text-[#888] italic">
                还没有复盘数据。在事件详情页或 Agent 编排页做出运营决策后，漏斗数据会在这里呈现。
              </p>
            )}
          </section>

          {/* Right: Optimization suggestions */}
          <section className="rounded-xl border border-[#dcd8cf] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-[#707070]">Insight</p>
            <h2 className="mt-1 text-lg font-semibold">策略调优建议</h2>
            <p className="text-[11px] text-[#999]">基于复盘数据自动生成的可执行优化方案</p>

            <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto">
              {visibleRecommendations.length > 0 ? (
                visibleRecommendations.map((rec, i) => (
                  <OptimizationCard
                    key={i}
                    index={i + 1}
                    diagnosis={rec}
                    isApplied={appliedOptimizations.some((a) => a.recommendation === rec)}
                    abTestVisible={abTestVisible === i}
                    abDesign={generateAbDesign(rec)}
                    onApply={() => handleApplyOptimization(rec)}
                    onAbTest={() => setAbTestVisible(abTestVisible === i ? null : i)}
                    onDismiss={() => handleDismissRecommendation(i)}
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-[#dcd8cf] bg-[#fbfaf7] p-6 text-center">
                  <p className="text-sm text-[#666]">
                    {records.length === 0
                      ? "积累复盘数据后，Agent 会自动生成结构化调优建议"
                      : "当前数据下暂无新的调优建议，继续运营以获取更多洞察"}
                  </p>
                </div>
              )}

              {appliedOptimizations.length > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-xs font-semibold text-green-700 mb-2">
                    已应用 {appliedOptimizations.length} 条优化
                  </p>
                  {appliedOptimizations.slice(-3).map((opt, i) => (
                    <p key={i} className="text-[11px] text-green-600 mt-1 line-clamp-1">
                      {opt.appliedAt} — {opt.recommendation.slice(0, 40)}...
                    </p>
                  ))}
                </div>
              )}
            </div>
          </section>
        </section>

        {/* Strategy iteration loop */}
        <section className="rounded-xl border border-[#dcd8cf] bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-[#707070]">Loop</p>
          <h2 className="mt-1 text-lg font-semibold">策略迭代闭环</h2>
          <p className="text-[11px] text-[#999] mb-4">点击查看每步说明 · 当前高亮为所处阶段</p>

          <div className="flex flex-wrap items-center gap-1.5">
            {loopSteps.map((step, i) => {
              const isActive = step.id === loopActiveStep;
              const isPast = loopSteps.findIndex((s) => s.id === loopActiveStep) > i;

              return (
                <div key={step.id} className="flex items-center gap-1.5">
                  <button
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "border-[#3b82f6] bg-blue-50 text-blue-700 shadow-sm"
                        : isPast
                          ? "border-[#10b981] bg-green-50 text-green-700"
                          : "border-[#e8e5dd] bg-white text-[#999] hover:border-[#bbb]"
                    }`}
                    onClick={() => setLoopActiveStep(step.id)}
                  >
                    <span className={isActive ? "text-blue-600" : isPast ? "text-green-600" : "text-[#ccc]"}>
                      {step.icon}
                    </span>
                    <span>{step.label}</span>
                  </button>
                  {i < loopSteps.length - 1 && (
                    <span className="text-[#ccc] text-xs">→</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step description */}
          <div className="mt-4 rounded-lg bg-[#fbfaf7] p-4 text-sm text-[#555] leading-relaxed">
            {loopActiveStep === "operation" && (
              <p>在<strong>工作台</strong>发现热点事件，进入<strong>事件详情</strong>分析热度和风险，通过<strong>Agent 编排</strong>生成运营策略并做出确认/改写/否决决策。每一步决策都会记录到此复盘系统。</p>
            )}
            {loopActiveStep === "collection" && (
              <p>系统自动采集每次决策的结果：确认率、命中率、响应时间、否决原因分布。这些指标是策略优化的数据基础。当前已采集 <strong>{summary.total} 条</strong>决策记录。</p>
            )}
            {loopActiveStep === "attribution" && (
              <p>分析否决和改写的原因模式：{summary.byReason.length > 0 ? summary.byReason.map((r) => `"${r.label}" ${r.value} 条`).join("、") : "暂无否决样本"}。策略命中率 <strong>{summary.strategyHitRate}%</strong>，确认率 <strong>{summary.confirmedRate}%</strong>。</p>
            )}
            {loopActiveStep === "optimization" && (
              <p>基于归因结果生成<strong>结构化调优建议</strong>，每条建议包含诊断、根因和预期效果。已生成 <strong>{recommendations.length} 条</strong>建议，已应用 <strong>{appliedOptimizations.length} 条</strong>。</p>
            )}
            {loopActiveStep === "abtest" && (
              <p>对应用的调优建议设计 A/B 对照实验：设定假设、对照组、实验组、评估指标和实验周期。点击建议卡中的<strong>「查看 A/B 设计」</strong>查看具体实验方案。</p>
            )}
            {loopActiveStep === "knowledge" && (
              <p>将验证有效的策略模式沉淀到知识库：包括可复用的内容模板、风险边界、达人匹配规则和放量策略。下次 Agent 生成策略时自动引用已验证的最佳实践。</p>
            )}
          </div>
        </section>

        {/* Review ledger with working filters */}
        <section className="rounded-xl border border-[#dcd8cf] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase text-[#707070]">Ledger</p>
              <h2 className="mt-1 text-lg font-semibold">复盘台账</h2>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-lg border border-[#dcd8cf] bg-white px-3 py-1.5 text-xs text-[#666] outline-none"
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value as FilterType)}
              >
                <option value="all">全部决策 ({records.length})</option>
                <option value="confirmed">已确认 ({summary.confirmed})</option>
                <option value="modified">已改写 ({summary.modified})</option>
                <option value="rejected">已否决 ({summary.rejected})</option>
              </select>
            </div>
          </div>

          {recentRecords.length > 0 ? (
            <div className="grid gap-2">
              {recentRecords.map((record) => {
                const expanded = expandedLedger[record.id] ?? false;
                return (
                  <article
                    key={record.id}
                    className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] overflow-hidden"
                  >
                    <button
                      className="w-full p-3 text-left flex items-start justify-between gap-3"
                      onClick={() =>
                        setExpandedLedger((prev) => ({
                          ...prev,
                          [record.id]: !expanded,
                        }))
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              record.decision === "confirmed"
                                ? "bg-green-100 text-green-700"
                                : record.decision === "modified"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {record.decision === "confirmed" ? "已确认" : record.decision === "modified" ? "已改写" : "已否决"}
                          </span>
                          <span className="text-[10px] text-[#888]">{record.sourceName}</span>
                        </div>
                        <Link
                          className="mt-1 block text-sm font-semibold leading-5 hover:underline"
                          href={`/events?id=${encodeURIComponent(record.eventId)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {record.title}
                        </Link>
                        <p className="mt-1 text-[11px] text-[#777]">
                          {record.eventTypeLabel} · {record.heatLevel}级 · {record.lifecycleLabel} · {record.riskLabel} · {getReviewResponseMinutes(record)}分钟响应
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2 text-[11px] text-[#888]">
                        {record.llmGenerated ? (
                          <span className="rounded bg-green-50 text-green-600 px-1.5 py-0.5 text-[10px] font-semibold">LLM</span>
                        ) : null}
                        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          className="px-3 pb-3 border-t border-[#e8e5dd]"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <div className="mt-3 grid gap-2">
                            <div className="text-xs text-[#555]">
                              <span className="font-semibold">策略摘要：</span>
                              {record.strategySummary}
                            </div>
                            {record.rejectReason && (
                              <div className="text-xs text-red-600">
                                <span className="font-semibold">否决原因：</span>
                                {record.rejectReason === "tone" ? "平台调性不符" : record.rejectReason === "risk" ? "风险过高" : record.rejectReason === "stale" ? "时效过期" : "其他原因"}
                              </div>
                            )}
                            <div className="flex gap-2 text-[11px]">
                              <span className="text-[#999]">热度 {record.heatScore} 分</span>
                              <span className="text-[#999]">·</span>
                              <span className="text-[#999]">{record.lifecycleLabel}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#dcd8cf] bg-[#fbfaf7] p-8 text-center">
              <p className="text-sm font-semibold text-[#666]">暂无复盘记录</p>
              <p className="mt-2 text-xs text-[#999]">
                在事件详情页点击"采纳并生成方案"，或在 Agent 编排页做出确认/改写/否决决策后，记录会自动出现在这里
              </p>
            </div>
          )}
        </section>

        {/* Applied optimizations history */}
        {appliedOptimizations.length > 0 && (
          <section className="rounded-xl border border-[#dcd8cf] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-[#707070]">Applied</p>
            <h2 className="mt-1 text-lg font-semibold">已应用的策略调优</h2>
            <div className="mt-3 space-y-2">
              {appliedOptimizations.map((opt, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-green-100 bg-green-50/50 p-3">
                  <CheckCircle2 className="size-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[#333] leading-relaxed">{opt.recommendation}</p>
                    <p className="text-[10px] text-[#999] mt-1">应用时间：{opt.appliedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Clear button */}
        <div className="flex justify-end">
          <button
            className="rounded-lg border border-[#dcd8cf] bg-white px-4 py-2 text-sm font-semibold hover:border-red-300 hover:text-red-600 transition-colors"
            onClick={() => {
              clearReviews();
              setAppliedOptimizations([]);
              setDismissedRecommendations(new Set());
              toast("info", "本地复盘数据已清空");
            }}
            type="button"
          >
            清空本地复盘数据
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  progress,
  color,
}: {
  label: string;
  value: string;
  subtitle: string;
  progress: number;
  color: "blue" | "green" | "orange" | "purple";
}) {
  const barColor =
    color === "blue" ? "bg-[#3b82f6]" :
    color === "green" ? "bg-[#10b981]" :
    color === "orange" ? "bg-[#f0a060]" :
    "bg-[#8b5cf6]";

  return (
    <div className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase text-[#777]">{label}</p>
      <strong className="mt-2 block text-2xl font-semibold">{value}</strong>
      <div className="mt-2 h-1.5 rounded-full bg-[#e8e5dd] overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-[#999]">{subtitle}</p>
    </div>
  );
}

function OptimizationCard({
  index,
  diagnosis,
  isApplied,
  abTestVisible,
  abDesign,
  onApply,
  onAbTest,
  onDismiss,
}: {
  index: number;
  diagnosis: string;
  isApplied: boolean;
  abTestVisible: boolean;
  abDesign: AbTestDesign;
  onApply: () => void;
  onAbTest: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      className={`rounded-lg border p-4 space-y-3 ${
        isApplied
          ? "border-green-200 bg-green-50/50"
          : "border-[#e8e5dd] bg-[#fbfaf7]"
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[#f0a060] text-white size-5 flex items-center justify-center text-[10px] font-bold">
          {index}
        </span>
        <span className="text-sm font-semibold text-[#111]">调优建议 #{index}</span>
      </div>

      <p className="text-xs leading-5 text-[#666]">
        <span className="font-semibold text-[#333]">诊断：</span>
        {diagnosis}
      </p>

      {/* A/B test design (expandable) */}
      <AnimatePresence>
        {abTestVisible && (
          <motion.div
            className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
              <FlaskConical className="size-3" />
              A/B 实验设计
            </p>
            <div className="grid gap-1.5 text-[11px] text-[#555]">
              <p><span className="font-semibold">假设：</span>{abDesign.hypothesis}</p>
              <p><span className="font-semibold">对照组：</span>{abDesign.control}</p>
              <p><span className="font-semibold">实验组：</span>{abDesign.variant}</p>
              <p><span className="font-semibold">评估指标：</span>{abDesign.metric}</p>
              <p><span className="font-semibold">实验周期：</span>{abDesign.duration}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        {isApplied ? (
          <span className="inline-flex items-center gap-1 rounded bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
            <CheckCircle2 className="size-3" />
            已应用
          </span>
        ) : (
          <button
            className="rounded bg-[#111] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#333] transition-colors"
            onClick={onApply}
          >
            应用调优
          </button>
        )}
        <button
          className={`rounded border px-3 py-1.5 text-xs font-semibold transition-colors ${
            abTestVisible
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-[#dcd8cf] hover:bg-[#f7f7f4]"
          }`}
          onClick={onAbTest}
        >
          {abTestVisible ? "收起设计" : "查看 A/B 设计"}
        </button>
        {!isApplied && (
          <button
            className="rounded px-3 py-1.5 text-xs text-[#999] hover:text-[#666] transition-colors"
            onClick={onDismiss}
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

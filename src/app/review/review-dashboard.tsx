"use client";

import Link from "next/link";
import { AppShell } from "../app-shell";
import { useOperationReviews } from "../hooks/use-operation-reviews";
import { getReviewResponseMinutes } from "@/lib/operation-review";

export function ReviewDashboard() {
  const { records, summary, recommendations, clearReviews } = useOperationReviews();
  const recentRecords = records.slice(0, 8);

  return (
    <AppShell
      eyebrow="Review Loop"
      title="热点复盘指标"
      description="本地记录的确认、改写和否决样本会在这里汇总，方便展示策略驱动的迭代机制。"
    >
      <div className="grid gap-4">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="已复盘事件" value={String(summary.total)} note="当前本地样本数" />
          <MetricCard label="采纳率" value={`${summary.confirmedRate}%`} note="确认 / 全部复盘" />
          <MetricCard label="策略命中率" value={`${summary.strategyHitRate}%`} note="确认 + 部分改写的加权结果" />
          <MetricCard label="平均响应" value={`${summary.averageResponseMinutes} 分钟`} note="从首见到决策" />
          <MetricCard label="预估 ROI" value={`${summary.estimatedRoiMultiple}x`} note="Demo 估算值" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4">
            <PanelCard title="决策漏斗" eyebrow="Funnel">
              <div className="grid gap-3">
                {summary.byDecision.map((item) => (
                  <BarRow key={item.label} label={item.label} value={item.value} percent={item.percent} />
                ))}
              </div>
            </PanelCard>

            <PanelCard title="否决原因分布" eyebrow="Guardrail">
              <div className="grid gap-3">
                {summary.byReason.length > 0 ? (
                  summary.byReason.map((item) => (
                    <BarRow key={item.label} label={item.label} value={item.value} percent={item.percent} />
                  ))
                ) : (
                  <p className="text-sm leading-6 text-[#666]">
                    还没有否决样本。等你在工作台里点几次“否决”，这里就会开始显形。
                  </p>
                )}
              </div>
            </PanelCard>
          </div>

          <div className="grid gap-4">
            <PanelCard title="策略驱动调优建议" eyebrow="Insight">
              <div className="grid gap-2">
                {recommendations.map((item) => (
                  <p key={item} className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3 text-sm leading-6 text-[#444]">
                    {item}
                  </p>
                ))}
              </div>
            </PanelCard>

            <PanelCard title="复盘台账" eyebrow="Samples">
              {recentRecords.length > 0 ? (
                <div className="grid gap-3">
                  {recentRecords.map((record) => (
                    <article key={record.id} className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getDecisionTone(record.decision)}`}>
                              {getDecisionLabel(record.decision)}
                            </span>
                            <span className="text-[11px] text-[#888]">{record.sourceName}</span>
                          </div>
                          <Link
                            className="mt-2 block text-sm font-semibold leading-6 hover:underline"
                            href={`/events?id=${encodeURIComponent(record.eventId)}`}
                          >
                            {record.title}
                          </Link>
                          <p className="mt-1 text-[11px] text-[#777]">
                            {record.eventTypeLabel} · {record.heatLevel} 级 · {record.lifecycleLabel} · {record.riskLabel}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-[11px] text-[#777]">
                          <p>{getReviewResponseMinutes(record)} 分钟</p>
                          <p>{record.llmGenerated ? "LLM 参与" : "规则兜底"}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#555]">
                        {record.strategySummary}
                      </p>
                      {record.rejectReason ? (
                        <p className="mt-2 text-[11px] text-[#999]">
                          否决原因：{getRejectReasonLabel(record.rejectReason)}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#d8d3c8] bg-[#fbfaf7] p-4 text-sm leading-6 text-[#666]">
                  这里现在还空着。去工作台点几个“确认 / 改写 / 否决”，再回来就能看到一条完整复盘链路。
                </div>
              )}
            </PanelCard>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            className="rounded-lg border border-[#dcd8cf] bg-white px-4 py-2 text-sm font-semibold hover:border-[#111] hover:bg-[#f7f7f4]"
            onClick={clearReviews}
            type="button"
          >
            清空本地复盘
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase text-[#777]">{label}</p>
      <strong className="mt-2 block text-2xl font-semibold">{value}</strong>
      <p className="mt-1 text-[11px] leading-5 text-[#888]">{note}</p>
    </div>
  );
}

function PanelCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase text-[#707070]">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BarRow({
  label,
  value,
  percent,
}: {
  label: string;
  value: number;
  percent: number;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[#333]">{label}</span>
        <span className="text-xs text-[#777]">
          {value} 条 · {percent}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#ece7dc]">
        <div className="h-full rounded-full bg-[#f0a060]" style={{ width: `${Math.max(percent, value > 0 ? 8 : 0)}%` }} />
      </div>
    </div>
  );
}

function getDecisionLabel(decision: "confirmed" | "modified" | "rejected") {
  const labels = {
    confirmed: "已确认",
    modified: "已改写",
    rejected: "已否决",
  } as const;
  return labels[decision];
}

function getDecisionTone(decision: "confirmed" | "modified" | "rejected") {
  const tones = {
    confirmed: "bg-[#dff5df] text-[#1f6f35]",
    modified: "bg-[#e9e1ff] text-[#4b328f]",
    rejected: "bg-[#ffe0df] text-[#8a2a22]",
  } as const;
  return tones[decision];
}

function getRejectReasonLabel(reason: "tone" | "risk" | "stale" | "other") {
  const labels = {
    tone: "平台调性",
    risk: "风险过高",
    stale: "时效过期",
    other: "其他原因",
  } as const;
  return labels[reason];
}

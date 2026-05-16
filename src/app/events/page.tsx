import { AppShell } from "../app-shell";
import { getHotEventDashboard } from "@/lib/hot-events";
import { HeatGauge } from "../components/detail/HeatGauge";
import { LifecycleTimeline } from "../components/detail/LifecycleTimeline";
import { RiskBlock } from "../components/detail/RiskBlock";
import { FactorWaterfall } from "../components/detail/FactorWaterfall";
import type { ReactNode } from "react";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const [{ id }, dashboard] = await Promise.all([
    searchParams,
    getHotEventDashboard(),
  ]);
  const event =
    dashboard.events.find((item) => item.id === id) ??
    dashboard.selectedEvent ??
    dashboard.events[0];
  const strategy = event ? dashboard.strategies[event.id] : null;

  return (
    <AppShell eyebrow="Event Detail" title="单事件看清楚">
      {event ? (
        <div className="grid gap-3">
          <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#666]">
                  <Badge>{event.sourceName}</Badge>
                  <Badge>{event.eventTypeLabel}</Badge>
                  <Badge>{event.lifecycleLabel}</Badge>
                  <Badge>{event.riskLabel} 风险</Badge>
                  <Badge>{event.publishedLabel}</Badge>
                </div>
                <h2 className="mt-3 text-2xl font-semibold leading-tight md:text-3xl">
                  {event.title}
                </h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-[#444]">
                  {event.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill kind="hot">看清楚：{event.reason}</Pill>
                  <Pill kind="soft">{event.intervention}</Pill>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:w-[360px]">
                <MetricTile
                  label="热度"
                  value={`${event.heatScore}`}
                  hint={`${event.heatLevel} 级`}
                />
                <MetricTile
                  label="生命周期"
                  value={event.lifecycleLabel}
                  hint="窗口判断"
                />
                <MetricTile
                  label="风险"
                  value={event.riskLabel}
                  hint="发布前复核"
                />
                <MetricTile
                  label="来源"
                  value={event.source}
                  hint={event.sourceName}
                />
              </div>
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="grid gap-3">
              <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
                <SectionHeader
                  eyebrow="Heat / Lifecycle / Risk"
                  title="热点态势"
                  meta="单屏看热度、窗口和风险边界"
                />
                <div className="mt-3 grid gap-3 xl:grid-cols-[0.92fr_1.08fr]">
                  <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                    <HeatGauge
                      value={event.heatScore}
                      level={event.heatLevel}
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                      <LifecycleTimeline current={event.lifecycleStage} />
                    </div>
                    <RiskBlock level={event.riskLevel} />
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
                <SectionHeader
                  eyebrow="Scoring"
                  title="热度因子与运营判断"
                  meta="把分数翻译成动作，不把页面做成日志墙"
                />
                <div className="mt-3 grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
                  <FactorWaterfall factors={event.scoreFactors} />
                  <div className="grid gap-2">
                    <DenseBlock
                      label="平台导向"
                      value={event.insight.platformDirection}
                    />
                    <DenseBlock
                      label="运营目标"
                      value={event.insight.operationGoal}
                    />
                    <DenseBlock
                      label="内容角度"
                      value={event.insight.contentAngle}
                    />
                    <DenseBlock
                      label="用户情绪"
                      value={event.insight.userEmotion}
                    />
                    <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                      <p className="text-[11px] font-semibold uppercase text-[#707070]">
                        介入建议
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#333]">
                        {event.intervention}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="grid gap-3">
              <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
                <SectionHeader
                  eyebrow="Insight"
                  title="事件画像"
                  meta="把事件边界压成可扫读信息"
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <MiniField label="事件类型" value={event.eventTypeLabel} />
                  <MiniField label="热度等级" value={event.heatLevel} />
                  <MiniField label="生命周期" value={event.lifecycleLabel} />
                  <MiniField label="风险等级" value={event.riskLabel} />
                </div>
                <div className="mt-3 grid gap-2">
                  {event.tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center justify-between rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-[#222]">{tag}</span>
                      <span className="text-[11px] text-[#888]">标签</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
                <SectionHeader
                  eyebrow="Source"
                  title="来源与摘要"
                  meta="先看信源，再决定要不要追"
                />
                <div className="mt-3 grid gap-2 text-sm leading-6 text-[#333]">
                  <DenseBlock label="信源" value={event.sourceName} />
                  <DenseBlock label="原文链接" value={event.sourceUrl} />
                  <DenseBlock label="原始摘要" value={event.summary} />
                </div>
              </section>
            </aside>
          </section>

          {strategy ? (
            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionHeader
                  eyebrow="Strategy"
                  title="运营方案"
                  meta="脚本、动作、风控和承接放在同一层"
                />
                {strategy.llmGenerated ? (
                  <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-green-700">
                    LLM
                  </span>
                ) : (
                  <span className="rounded-full border border-[#e8e5dd] bg-[#fbfaf7] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#777]">
                    Fallback
                  </span>
                )}
              </div>

              <div className="mt-3 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-3">
                  <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                    <p className="text-[11px] font-semibold uppercase text-[#707070]">
                      标题
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {strategy.campaignBrief.titles.map((title) => (
                        <span
                          key={title}
                          className="rounded-full border border-[#e8e5dd] bg-white px-3 py-1.5 text-sm leading-5 text-[#222]"
                        >
                          {title}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <DenseBlock
                      label="脚本"
                      value={strategy.campaignBrief.shortVideoScript}
                    />
                    <DenseBlock
                      label="风险边界"
                      value={strategy.campaignBrief.riskGuardrail}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <DenseBlock
                      label="热度分析"
                      value={strategy.heatAnalysis}
                    />
                    <DenseBlock
                      label="风险评估"
                      value={strategy.riskAssessment}
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                    <p className="text-[11px] font-semibold uppercase text-[#707070]">
                      抖音化运营动作
                    </p>
                    <div className="mt-2 grid gap-2 text-sm leading-6 text-[#333]">
                      <CompactKV
                        label="达人类型"
                        value={strategy.douyinOperationPlan.creatorArchetypes.join("、")}
                      />
                      <CompactKV
                        label="内容形式"
                        value={strategy.douyinOperationPlan.contentFormats.join("、")}
                      />
                      <CompactKV
                        label="放量 / 停投"
                        value={`${strategy.douyinOperationPlan.trafficRule} ${strategy.douyinOperationPlan.stopRule}`}
                      />
                      <CompactKV
                        label="风险审核"
                        value={strategy.douyinOperationPlan.riskChecklist.join("；")}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                    <p className="text-[11px] font-semibold uppercase text-[#707070]">
                      承接与复用
                    </p>
                    <div className="mt-2 grid gap-2 text-sm leading-6 text-[#333]">
                      <CompactKV
                        label="流量资产"
                        value={strategy.monetizationPlan.trafficAsset}
                      />
                      <CompactKV
                        label="转化路径"
                        value={strategy.monetizationPlan.conversionPath}
                      />
                      <CompactKV
                        label="承接产品"
                        value={strategy.monetizationPlan.offer}
                      />
                      <CompactKV
                        label="复盘指标"
                        value={strategy.monetizationPlan.successMetric}
                      />
                      <CompactKV
                        label="复制方法"
                        value={strategy.replicationPlaybook.pattern}
                      />
                      <CompactKV
                        label="放量规则"
                        value={strategy.replicationPlaybook.scaleRule}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}

function SectionHeader({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#707070]">
        {eyebrow}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <h2 className="text-base font-semibold md:text-lg">{title}</h2>
        {meta ? (
          <span className="text-[11px] text-[#888]">{meta}</span>
        ) : null}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
      <p className="text-[11px] font-semibold uppercase text-[#707070]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[#222]">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-[#888]">{hint}</p>
    </div>
  );
}

function Pill({
  children,
  kind = "soft",
}: {
  children: ReactNode;
  kind?: "soft" | "hot";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium ${
        kind === "hot"
          ? "border-[#f0a060]/40 bg-[#fff7ed] text-[#b85b12]"
          : "border-[#e8e5dd] bg-[#fbfaf7] text-[#555]"
      }`}
    >
      {children}
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#e8e5dd] bg-[#fbfaf7] px-2.5 py-1 text-[11px] font-semibold text-[#555]">
      {children}
    </span>
  );
}

function DenseBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
      <p className="text-[11px] font-semibold uppercase text-[#707070]">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#333]">
        {value}
      </p>
    </div>
  );
}

function MiniField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase text-[#707070]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[#222]">{value}</p>
    </div>
  );
}

function CompactKV({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-[#e8e5dd] bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase text-[#707070]">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-[#333] whitespace-pre-wrap break-words">
        {value}
      </p>
    </div>
  );
}

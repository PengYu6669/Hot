import { AppShell } from "../app-shell";
import { getHotEventDashboard } from "@/lib/hot-events";
import { HeatGauge } from "../components/detail/HeatGauge";
import { LifecycleTimeline } from "../components/detail/LifecycleTimeline";
import { RiskBlock } from "../components/detail/RiskBlock";
import { FactorWaterfall } from "../components/detail/FactorWaterfall";
import { InsightCardMatrix } from "../components/detail/TagCloud";

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
    <AppShell
      eyebrow="Event Detail"
      title="单事件看清楚"
      description="L1 看指标做决策，L2 看评分依据和证据链。所有数据来自 AI HOT API + 本地评分规则，无 Mock。"
    >
      {event ? (
        <div className="grid gap-4">
          {/* L1: Core metrics — responsive grid */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm">
              <HeatGauge value={event.heatScore} level={event.heatLevel} />
            </div>
            <div className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm">
              <LifecycleTimeline current={event.lifecycleStage} />
            </div>
            <div className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm sm:col-span-2 lg:col-span-1">
              <RiskBlock level={event.riskLevel} />
            </div>
          </section>

          {/* L2: Factor breakdown + insight */}
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm">
              <FactorWaterfall factors={event.scoreFactors} />

              {/* Scoring rule explainer */}
              <div className="mt-5 p-3 rounded-lg bg-[#fbfaf7] border border-[#e8e5dd]">
                <p className="text-[11px] font-semibold text-[#666] mb-2">评分规则说明</p>
                <div className="grid gap-1.5 text-[11px] text-[#555] leading-relaxed">
                  <p>· <strong>时效信号</strong>：发布时间 ≤6h 得 26 分，≤24h 得 21 分，≤72h 得 15 分</p>
                  <p>· <strong>事件类型</strong>：模型发布 24 分，产品更新 22 分，行业动态 20 分，论文 17 分，观点 14 分</p>
                  <p>· <strong>语义强度</strong>：基础 16 分 + 命中 OpenAI/Agent/开源等关键词每个 +3 分，上限 28</p>
                  <p>· <strong>可信来源</strong>：基础 16 分 + 有摘要 +4 分 + 有原文链接 +2 分</p>
                </div>
                <p className="mt-2 text-[10px] text-[#999]">
                  分级阈值：≥85 为 S 级（优先介入），70-84 为 A 级（策略池），&lt;70 为 B 级（观察）。
                </p>
              </div>
            </section>

            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm">
              <InsightCardMatrix
                items={[
                  { label: "平台导向", value: event.insight.platformDirection },
                  { label: "运营目标", value: event.insight.operationGoal },
                  { label: "内容角度", value: event.insight.contentAngle },
                  { label: "用户情绪", value: event.insight.userEmotion },
                ]}
              />
              <p className="mt-3 text-[10px] text-[#999]">
                以上 insight 基于事件标题/摘要关键词匹配规则生成，非 LLM 推理。
              </p>
            </section>
          </div>

          {/* Strategy */}
          {strategy ? (
            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase text-[#6b6b6b]">Strategy</p>
                {strategy.llmGenerated && (
                  <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                    LLM
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-xl font-semibold">运营方案</h2>

              {/* Agent reasoning — real LLM output */}
              {strategy.llmGenerated && strategy.agentReasoning && (
                <div className="mt-3 rounded-lg bg-[#fff7ed] p-3 border border-[#f0a060]/30">
                  <p className="text-[11px] font-bold text-[#e8752a] mb-1">Agent 推理链</p>
                  <p className="text-sm leading-6 whitespace-pre-wrap">{strategy.agentReasoning}</p>
                </div>
              )}

              {/* Campaign brief titles */}
              <div className="mt-4 grid gap-2">
                {strategy.campaignBrief.titles.map((title) => (
                  <strong
                    className="rounded-lg bg-[#fbfaf7] p-3 text-sm border border-[#e8e5dd]"
                    key={title}
                  >
                    {title}
                  </strong>
                ))}
              </div>
              <p className="mt-3 rounded-lg bg-[#fbfaf7] p-3 text-sm leading-6 border border-[#e8e5dd]">
                {strategy.campaignBrief.shortVideoScript}
              </p>
              <p className="mt-3 rounded-lg bg-[#fbfaf7] p-3 text-xs leading-5 border border-[#e8e5dd] text-[#666]">
                {strategy.campaignBrief.riskGuardrail}
              </p>

              {/* LLM analysis sections */}
              {strategy.llmGenerated && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {strategy.heatAnalysis && (
                    <div className="rounded-lg bg-[#fbfaf7] p-3 border border-[#e8e5dd]">
                      <p className="text-[11px] font-bold text-[#6b6b6b] mb-1">热度分析</p>
                      <p className="text-xs leading-5 whitespace-pre-wrap">{strategy.heatAnalysis}</p>
                    </div>
                  )}
                  {strategy.riskAssessment && (
                    <div className="rounded-lg bg-[#fbfaf7] p-3 border border-[#e8e5dd]">
                      <p className="text-[11px] font-bold text-[#6b6b6b] mb-1">风险评估</p>
                      <p className="text-xs leading-5 whitespace-pre-wrap">{strategy.riskAssessment}</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          ) : null}

          {/* ROI estimate — real data from hot-events.ts */}
          <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-[#6b6b6b]">ROI 预估</p>
            <h2 className="mt-1 text-xl font-semibold">运营指标估算</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "响应时长", value: event.roi.responseTime },
                { label: "人力节省", value: event.roi.manualTimeSaved },
                { label: "内容召回", value: event.roi.contentRecall },
                { label: "预期转化", value: event.roi.expectedConversion },
              ].map((m) => (
                <div key={m.label} className="rounded-lg bg-[#fbfaf7] border border-[#e8e5dd] p-3">
                  <span className="text-[11px] text-[#999]">{m.label}</span>
                  <p className="mt-1 text-sm font-semibold leading-5">{m.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-[#999]">
              ROI 估算基于热度等级和生命周期的代理公式，非真实业务数据。真实业务中需接入内容消费和转化归因。
            </p>
          </section>

          {/* Creator match placeholder — honest about status */}
          <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-[#6b6b6b]">Creator Match</p>
            <h2 className="mt-1 text-xl font-semibold">创作者撮合</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {getRecommendedCreators(event).map((name) => (
                <div key={name} className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3 flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[#f0a060]/20 flex items-center justify-center text-[#f0a060] font-bold text-sm shrink-0">
                    {name.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{name}</p>
                    <p className="text-[10px] text-[#999]">创作者库待接入</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-[#999]">
              创作者名单来自 eventType 规则匹配（src/lib/hot-events.ts getRecommendedCreators）。
              粉丝数、历史 ROI、档期等数据需接入创作者中台 API。
            </p>
          </section>

          {/* Similar cases placeholder */}
          <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-[#6b6b6b]">Reference</p>
            <h2 className="mt-1 text-xl font-semibold">运营经验库</h2>
            <p className="mt-2 text-sm text-[#666] leading-6">
              当前为人工总结的运营案例模板。待积累足够真实运营数据后，可通过向量检索匹配历史相似事件和已验证策略。
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { title: "模型发布类", action: "解释型首发 → 工具场景二创 → 评论区征集" },
                { title: "产品更新类", action: "功能拆解 → 效率对比 → 用户教程" },
                { title: "行业动态类", action: "趋势解读 → 影响分析 → 行动建议" },
              ].map((c) => (
                <div key={c.title} className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                  <p className="text-sm font-semibold">{c.title}</p>
                  <p className="mt-2 text-xs leading-5 text-[#666]">{c.action}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-[#999]">
              当前为静态运营经验总结，非 RAG 检索结果。RAG 需历史案例库积累和数据标注支持。
            </p>
          </section>

          {/* SOP nodes — real data from hot-events.ts */}
          <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 md:p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-[#6b6b6b]">SOP</p>
            <h2 className="mt-1 text-xl font-semibold">运营流水线节点</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {event.sop.map((node) => (
                <div
                  key={node.name}
                  className={`rounded-lg border p-3 ${
                    node.status === "done"
                      ? "border-green-300 bg-green-50/60"
                      : node.status === "running"
                        ? "border-[#f0a060] bg-[#fff7ed]"
                        : node.status === "guarded"
                          ? "border-red-300 bg-red-50/60"
                          : "border-[#e8e5dd] bg-[#fbfaf7]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{node.name}</span>
                    <span className="text-[10px] text-[#999]">{node.owner}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#555]">
                    输入：{node.input}<br />
                    动作：{node.action}<br />
                    输出：{node.output}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function getRecommendedCreators(event: { eventType: string }) {
  if (event.eventType === "paper") return ["@论文精读室", "@AI研究员日常", "@模型观察站"];
  if (event.eventType === "ai-model") return ["@模型测评局", "@AI效率研究所", "@开源情报站"];
  if (event.eventType === "ai-product") return ["@产品增长笔记", "@AI工具箱", "@创业者日报"];
  return ["@AI商业观察", "@科技热点局", "@趋势拆解员"];
}

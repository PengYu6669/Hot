import type { HeatLevel, HotEvent, Strategy } from "./hot-events";

export type ReviewDecision = "confirmed" | "modified" | "rejected";
export type ReviewRejectReason = "tone" | "risk" | "stale" | "other";

export type ReviewRecord = {
  id: string;
  eventId: string;
  title: string;
  sourceName: string;
  eventTypeLabel: string;
  heatScore: number;
  heatLevel: HeatLevel;
  lifecycleLabel: string;
  riskLabel: string;
  decision: ReviewDecision;
  rejectReason?: ReviewRejectReason;
  llmGenerated: boolean;
  strategySummary: string;
  firstSeenAt: string;
  decisionAt: string;
};

export type ReviewSummary = {
  total: number;
  confirmed: number;
  modified: number;
  rejected: number;
  confirmedRate: number;
  strategyHitRate: number;
  averageResponseMinutes: number;
  estimatedRoiMultiple: number;
  byReason: Array<{ label: string; value: number; percent: number }>;
  byDecision: Array<{ label: string; value: number; percent: number }>;
};

export function createReviewRecord({
  event,
  strategy,
  decision,
  rejectReason,
  previous,
}: {
  event: HotEvent;
  strategy: Strategy | null | undefined;
  decision: ReviewDecision;
  rejectReason?: ReviewRejectReason;
  previous?: ReviewRecord | null;
}): ReviewRecord {
  const now = new Date().toISOString();

  return {
    id: `review-${event.id}`,
    eventId: event.id,
    title: event.title,
    sourceName: event.sourceName,
    eventTypeLabel: event.eventTypeLabel,
    heatScore: event.heatScore,
    heatLevel: event.heatLevel,
    lifecycleLabel: event.lifecycleLabel,
    riskLabel: event.riskLabel,
    decision,
    rejectReason,
    llmGenerated: strategy?.llmGenerated ?? false,
    strategySummary: createStrategySummary(strategy, event),
    firstSeenAt: previous?.firstSeenAt ?? now,
    decisionAt: now,
  };
}

export function upsertReviewRecord(
  records: ReviewRecord[],
  next: ReviewRecord,
): ReviewRecord[] {
  const index = records.findIndex((record) => record.eventId === next.eventId);
  if (index < 0) return [next, ...records];

  const existing = records[index];
  const rest = records.filter((record) => record.eventId !== next.eventId);
  return [
    {
      ...next,
      firstSeenAt: existing.firstSeenAt,
    },
    ...rest,
  ];
}

export function summarizeReviewRecords(records: ReviewRecord[]): ReviewSummary {
  const total = records.length;
  const confirmed = records.filter((item) => item.decision === "confirmed").length;
  const modified = records.filter((item) => item.decision === "modified").length;
  const rejected = records.filter((item) => item.decision === "rejected").length;

  const averageResponseMinutes = total
    ? Math.round(
        records.reduce((sum, record) => {
          return sum + getDurationMinutes(record.firstSeenAt, record.decisionAt);
        }, 0) / total,
      )
    : 0;

  const strategyHitRate = total
    ? Math.round((((confirmed * 1) + (modified * 0.6)) / total) * 100)
    : 0;

  const estimatedRoiMultiple = total
    ? roundOneDecimal((confirmed * 1.6 + modified * 1.1) / Math.max(total * 0.7, 1))
    : 0;

  const reasonMap = new Map<ReviewRejectReason, number>();
  for (const record of records) {
    if (record.decision === "rejected" && record.rejectReason) {
      reasonMap.set(record.rejectReason, (reasonMap.get(record.rejectReason) ?? 0) + 1);
    }
  }

  const decisionEntries: Array<[string, number]> = [
    ["确认", confirmed],
    ["改写", modified],
    ["否决", rejected],
  ];

  return {
    total,
    confirmed,
    modified,
    rejected,
    confirmedRate: total ? Math.round((confirmed / total) * 100) : 0,
    strategyHitRate,
    averageResponseMinutes,
    estimatedRoiMultiple,
    byReason: reasonLabels
      .map((reason) => ({
        label: reason.label,
        value: reasonMap.get(reason.id) ?? 0,
        percent: rejected
          ? Math.round(((reasonMap.get(reason.id) ?? 0) / rejected) * 100)
          : 0,
      }))
      .filter((item) => item.value > 0),
    byDecision: decisionEntries.map(([label, value]) => ({
      label,
      value,
      percent: total ? Math.round((value / total) * 100) : 0,
    })),
  };
}

export function getReviewResponseMinutes(record: ReviewRecord) {
  return getDurationMinutes(record.firstSeenAt, record.decisionAt);
}

export function createReviewRecommendations(records: ReviewRecord[]) {
  const summary = summarizeReviewRecords(records);
  const mostCommonReason = [...summary.byReason].sort((a, b) => b.value - a.value)[0];
  const topRejected = records.filter((item) => item.decision === "rejected").slice(0, 3);

  const recommendations = [
    summary.confirmedRate >= 60
      ? "确认率较高，可以继续保留当前热度评分逻辑，重点优化策略表达。"
      : "确认率偏低，优先回看评分阈值和事件筛选规则。",
    summary.averageResponseMinutes > 45
      ? "响应时间偏长，建议把人工确认台前置到策略页首屏。"
      : "响应链路较顺，可以继续用当前流程做 Demo。",
    mostCommonReason?.label === "风险过高"
      ? "风险类否决居多，应该把发布前检查清单做成更显眼的门禁。"
      : "可以继续增强抖音化运营动作，先把内容供给和承接做厚。",
  ];

  if (topRejected.length > 0) {
    recommendations.push(
      `重点复盘最近的 ${topRejected.length} 条否决样本，优先修正「${topRejected[0].title}」这类事件的策略边界。`,
    );
  }

  return recommendations;
}

function createStrategySummary(strategy: Strategy | null | undefined, event: HotEvent) {
  if (!strategy) {
    return `${event.reason} ${event.intervention}`.trim();
  }

  const title = strategy.campaignBrief.titles[0] ?? event.title;
  const brief = strategy.reasoning.slice(0, 72);
  return `${title}｜${brief}`;
}

function getDurationMinutes(start: string, end: string) {
  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 1000 / 60));
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

const reasonLabels: Array<{ id: ReviewRejectReason; label: string }> = [
  { id: "tone", label: "平台调性" },
  { id: "risk", label: "风险过高" },
  { id: "stale", label: "时效过期" },
  { id: "other", label: "其他原因" },
];

import type { HotEvent, Strategy } from "./hot-events";

export type OperationTaskStatus =
  | "pending"
  | "processing"
  | "awaiting_confirmation"
  | "confirmed"
  | "executing"
  | "reviewed";

export type OperationRole = "operator" | "content" | "audit" | "strategy";

export type OperationTaskStep = {
  id: string;
  role: OperationRole;
  title: string;
  status: "todo" | "doing" | "done";
  output: string;
};

export type OperationTask = {
  id: string;
  eventId: string;
  title: string;
  heatLevel: string;
  lifecycleLabel: string;
  riskLabel: string;
  status: OperationTaskStatus;
  owner: OperationRole;
  createdAt: string;
  updatedAt: string;
  strategySummary: string;
  steps: OperationTaskStep[];
};

export function createOperationTask({
  event,
  strategy,
  status = "confirmed",
  previous,
}: {
  event: HotEvent;
  strategy: Strategy | null | undefined;
  status?: OperationTaskStatus;
  previous?: OperationTask | null;
}): OperationTask {
  const now = new Date().toISOString();
  const steps = createSteps(event, strategy, status, previous?.steps);

  return {
    id: `task-${event.id}`,
    eventId: event.id,
    title: event.title,
    heatLevel: event.heatLevel,
    lifecycleLabel: event.lifecycleLabel,
    riskLabel: event.riskLabel,
    status,
    owner: getOwner(status),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    strategySummary:
      strategy?.campaignBrief.titles[0] ??
      `${event.reason} ${event.intervention}`.trim(),
    steps,
  };
}

export function upsertOperationTask(
  tasks: OperationTask[],
  next: OperationTask,
): OperationTask[] {
  const rest = tasks.filter((task) => task.eventId !== next.eventId);
  return [next, ...rest];
}

export function summarizeOperationTasks(tasks: OperationTask[]) {
  const total = tasks.length;
  const byStatus = countBy(tasks, (task) => task.status);
  const doneSteps = tasks.flatMap((task) => task.steps).filter((step) => step.status === "done").length;
  const allSteps = Math.max(tasks.flatMap((task) => task.steps).length, 1);

  return {
    total,
    pending: byStatus.pending ?? 0,
    processing: byStatus.processing ?? 0,
    awaitingConfirmation: byStatus.awaiting_confirmation ?? 0,
    confirmed: byStatus.confirmed ?? 0,
    executing: byStatus.executing ?? 0,
    reviewed: byStatus.reviewed ?? 0,
    completionRate: total ? Math.round((doneSteps / allSteps) * 100) : 0,
    estimatedHoursSaved: roundOneDecimal(total * 0.35 + doneSteps * 0.08),
  };
}

export function createRuleFeedback(tasks: OperationTask[]) {
  const reviewed = tasks.filter((task) => task.status === "reviewed");
  const highRisk = tasks.filter((task) => task.riskLabel === "高").length;
  const executing = tasks.filter((task) => task.status === "executing").length;
  const processing = tasks.filter((task) => task.status === "processing").length;
  const awaitingConfirmation = tasks.filter(
    (task) => task.status === "awaiting_confirmation",
  ).length;

  return [
    reviewed.length > 0
      ? "已复盘任务会优先沉淀标题、脚本结构和放量规则，作为同类事件模板。"
      : "还没有已复盘任务，建议先确认 1-2 个事件完成闭环。",
    processing > 0
      ? "存在 Agent 处理中任务，运营台应优先关注工具调用结果和人工断点。"
      : awaitingConfirmation > 0
        ? "已有待确认策略包，运营应尽快确认、改写或否决，避免动作停在建议阶段。"
        : "当前没有处理中任务，可从高热低风险事件启动 Agent 处理。",
    highRisk > 0
      ? "高风险任务存在，下一轮应提高管控 Agent 的前置权重。"
      : "当前高风险压力较低，可把策略 Agent 的内容供给效率作为优化重点。",
    executing > 0
      ? "已有执行中任务，复盘页应跟踪执行产出和评论需求密度。"
      : "暂无执行中任务，确认后的事件应进入执行队列而不是停在策略卡片。",
  ];
}

function createSteps(
  event: HotEvent,
  strategy: Strategy | null | undefined,
  status: OperationTaskStatus,
  previous?: OperationTaskStep[],
): OperationTaskStep[] {
  const base: OperationTaskStep[] = [
    {
      id: "operator-confirm",
      role: "operator",
      title: "运营确认",
      status: status === "pending" || status === "processing" ? "doing" : "done",
      output: `${event.heatLevel} 级，${event.lifecycleLabel}，确认是否进入策略执行。`,
    },
    {
      id: "content-produce",
      role: "content",
      title: "内容供给",
      status:
        status === "pending"
          ? "todo"
          : status === "processing" ||
              status === "awaiting_confirmation" ||
              status === "confirmed"
            ? "doing"
            : "done",
      output: strategy?.campaignBrief.shortVideoScript ?? "生成短视频脚本、标题和评论引导。",
    },
    {
      id: "audit-guard",
      role: "audit",
      title: "风险审核",
      status:
        status === "confirmed"
          ? "doing"
          : status === "pending" ||
              status === "processing" ||
              status === "awaiting_confirmation"
            ? "todo"
            : "done",
      output:
        strategy?.riskAssessment ??
        (event.riskLevel === "high"
          ? "需人工核验来源、争议点和敏感表达。"
          : "事实、观点和预测分开表达。"),
    },
    {
      id: "strategy-review",
      role: "strategy",
      title: "复盘沉淀",
      status: status === "reviewed" ? "done" : status === "executing" ? "doing" : "todo",
      output: strategy?.replicationPlaybook.scaleRule ?? "记录有效互动和放量/停投规则。",
    },
  ];

  if (!previous) return base;

  return base.map((step) => {
    const old = previous.find((item) => item.id === step.id);
    if (!old) return step;
    return {
      ...step,
      output: step.output || old.output,
    };
  });
}

function getOwner(status: OperationTaskStatus): OperationRole {
  if (status === "pending") return "operator";
  if (status === "processing") return "strategy";
  if (status === "awaiting_confirmation") return "operator";
  if (status === "confirmed") return "content";
  if (status === "executing") return "audit";
  return "strategy";
}

function countBy<T extends string>(
  items: OperationTask[],
  selector: (task: OperationTask) => T,
) {
  const map = {} as Record<T, number>;
  for (const item of items) {
    const key = selector(item);
    map[key] = (map[key] ?? 0) + 1;
  }
  return map;
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

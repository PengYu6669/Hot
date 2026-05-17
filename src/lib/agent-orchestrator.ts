import {
  createStrategy,
  type HotEvent,
  type ScoreFactor,
  type Strategy,
} from "./hot-events";
import type { OperationTaskStatus } from "./operation-tasks";

export type AgentRunMode = "standard" | "risk-first" | "script-first";

export type AgentNodeId =
  | "perceive"
  | "research"
  | "mine"
  | "plan"
  | "guard"
  | "dispatch";

export type AgentRunEvent =
  | {
      type: "run_started";
      runId: string;
      mode: AgentRunMode;
      status: OperationTaskStatus;
    }
  | {
      type: "agent_started";
      runId: string;
      agent: AgentDefinition;
    }
  | {
      type: "tool_call";
      runId: string;
      agentId: AgentNodeId;
      tool: ToolCallRecord;
    }
  | {
      type: "agent_message";
      runId: string;
      agent: AgentDefinition;
      content: string;
      meta: string;
    }
  | {
      type: "state_changed";
      runId: string;
      status: OperationTaskStatus;
      reason: string;
    }
  | {
      type: "llm_token";
      runId: string;
      agentId: AgentNodeId;
      token: string;
    }
  | {
      type: "strategy_ready";
      runId: string;
      strategy: Strategy;
    }
  | {
      type: "run_completed";
      runId: string;
      status: OperationTaskStatus;
      summary: string;
      durationMs: number;
    };

export type AgentDefinition = {
  id: AgentNodeId;
  name: string;
  role: string;
  owns: string;
};

export type ToolCallRecord = {
  name: string;
  input: string;
  output: string;
  durationMs: number;
};

type AgentContext = {
  runId: string;
  event: HotEvent;
  instruction: string;
  mode: AgentRunMode;
  valueScore: number;
  historicalCase: string;
  strategy: Strategy | null;
  status: OperationTaskStatus;
  previousStrategy: Strategy | null;
};

const agents: Record<AgentNodeId, AgentDefinition> = {
  perceive: {
    id: "perceive",
    name: "感知 Agent",
    role: "热点线索感知",
    owns: "来源校验、事件标准化、时效窗口",
  },
  research: {
    id: "research",
    name: "资料 Agent",
    role: "历史案例和上下文补全",
    owns: "同类模式、可复用钩子、信息缺口",
  },
  mine: {
    id: "mine",
    name: "挖掘 Agent",
    role: "热度和运营价值判断",
    owns: "评分解释、生命周期、投入优先级",
  },
  plan: {
    id: "plan",
    name: "策略 Agent",
    role: "抖音运营动作生成",
    owns: "脚本、评论承接、达人类型、放量规则",
  },
  guard: {
    id: "guard",
    name: "管控 Agent",
    role: "风险审核和人工断点",
    owns: "事实边界、敏感表达、审核结论",
  },
  dispatch: {
    id: "dispatch",
    name: "调度 Agent",
    role: "任务派发和状态流转",
    owns: "待确认队列、角色分工、复盘入口",
  },
};

export async function runHotEventAgents({
  event,
  instruction,
  mode,
  onEvent,
  previousStrategy,
}: {
  event: HotEvent;
  instruction?: string;
  mode: AgentRunMode;
  onEvent: (event: AgentRunEvent) => void;
  previousStrategy?: Strategy | null;
}) {
  const startedAt = Date.now();
  const context: AgentContext = {
    runId: `agent-run-${event.id}-${startedAt}`,
    event,
    instruction: instruction?.trim() || "请完成热点运营判断并生成可执行策略。",
    mode,
    valueScore: 0,
    historicalCase: "",
    strategy: null,
    status: "processing",
    previousStrategy: previousStrategy ?? null,
  };

  onEvent({
    type: "run_started",
    runId: context.runId,
    mode,
    status: context.status,
  });

  const graph = createRunGraph(mode);
  for (const node of graph) {
    await runNode(node, context, onEvent);
  }

  context.status = "awaiting_confirmation";
  onEvent({
    type: "state_changed",
    runId: context.runId,
    status: context.status,
    reason: "策略包、风险结论和派发建议已生成，等待运营人工确认。",
  });
  onEvent({
    type: "run_completed",
    runId: context.runId,
    status: context.status,
    summary: `已完成 ${graph.length} 个 Agent 节点，进入待确认。`,
    durationMs: Date.now() - startedAt,
  });

  return {
    runId: context.runId,
    strategy: context.strategy,
    status: context.status,
  };
}

function createRunGraph(mode: AgentRunMode): AgentNodeId[] {
  if (mode === "risk-first") {
    return ["perceive", "research", "mine", "guard", "plan", "dispatch"];
  }
  if (mode === "script-first") {
    return ["perceive", "mine", "plan", "research", "guard", "dispatch"];
  }
  return ["perceive", "research", "mine", "plan", "guard", "dispatch"];
}

async function runNode(
  node: AgentNodeId,
  context: AgentContext,
  onEvent: (event: AgentRunEvent) => void,
) {
  const agent = agents[node];
  onEvent({
    type: "agent_started",
    runId: context.runId,
    agent,
  });

  if (node === "perceive") {
    const tool = runTool("normalize_hot_event", context.event.title, () => {
      return `${context.event.sourceName} / ${context.event.eventTypeLabel} / ${context.event.publishedLabel}`;
    });
    emitTool(context, agent.id, tool, onEvent);
    emitMessage(
      context,
      agent,
      `已完成线索感知：来源 ${context.event.sourceName}，类型 ${context.event.eventTypeLabel}，当前${context.event.lifecycleLabel}。`,
      "HotEvent normalize",
      onEvent,
    );
    return;
  }

  if (node === "research") {
    const tool = runTool("retrieve_operation_case", context.event.eventTypeLabel, () => {
      context.historicalCase = createHistoricalCase(context.event);
      return context.historicalCase;
    });
    emitTool(context, agent.id, tool, onEvent);
    emitMessage(
      context,
      agent,
      `找到可复用运营模式：${context.historicalCase}`,
      "Historical playbook",
      onEvent,
    );
    return;
  }

  if (node === "mine") {
    const tool = runTool("score_operation_value", context.event.title, () => {
      context.valueScore = getOperationValueScore(context.event);
      return formatScoreFactors(context.event.scoreFactors);
    });
    emitTool(context, agent.id, tool, onEvent);
    emitMessage(
      context,
      agent,
      `运营价值 ${context.valueScore} 分，热度 ${context.event.heatScore}/${context.event.heatLevel}，建议进入策略生成并保留人工断点。`,
      "Scoring engine",
      onEvent,
    );
    return;
  }

  if (node === "plan") {
    const toolStartedAt = Date.now();
    const strategy = await createStrategy(context.event, {
      humanInstruction: context.instruction,
      previousStrategy: context.previousStrategy,
      onToken: (token) => {
        onEvent({
          type: "llm_token",
          runId: context.runId,
          agentId: node,
          token,
        });
      },
    });
    context.strategy = strategy;
    const llmTrace = strategy.llmTrace;
    emitTool(
      context,
      agent.id,
      {
        name: "generate_douyin_strategy",
        input: context.instruction,
        output: llmTrace
          ? `${llmTrace.usedLlm ? "LLM_OK" : "FALLBACK"} / ${llmTrace.model} / ${llmTrace.durationMs}ms / ${llmTrace.fallbackReason ?? strategy.campaignBrief.titles[0]}`
          : strategy.campaignBrief.titles[0],
        durationMs: Date.now() - toolStartedAt,
      },
      onEvent,
    );
    emitMessage(
      context,
      agent,
      strategy.agentReasoning ||
        `已生成脚本、评论承接、放量/停投规则和达人/内容形式建议。`,
      strategy.llmGenerated
        ? `LLM strategy call · ${strategy.llmTrace?.model ?? ""}`
        : `Fallback strategy rules · ${strategy.llmTrace?.fallbackReason ?? "LLM unavailable"}`,
      onEvent,
    );
    onEvent({
      type: "strategy_ready",
      runId: context.runId,
      strategy,
    });
    return;
  }

  if (node === "guard") {
    const assessment =
      context.strategy?.riskAssessment ??
      (context.event.riskLabel === "高"
        ? "高风险事件，需人工核验来源和敏感表达。"
        : "风险可控，发布前仍需区分事实、观点和预测。");
    const tool = runTool("run_risk_checklist", context.event.riskLabel, () => assessment);
    emitTool(context, agent.id, tool, onEvent);
    emitMessage(context, agent, assessment, "Risk checklist", onEvent);
    return;
  }

  const dispatchOutput = context.strategy
    ? `派发建议：内容供给承接「${context.strategy.campaignBrief.titles[0]}」，审核关注「${context.strategy.campaignBrief.riskGuardrail}」。`
    : "策略未生成，保持待处理。";
  const tool = runTool("dispatch_operation_task", context.event.id, () => dispatchOutput);
  emitTool(context, agent.id, tool, onEvent);
  emitMessage(
    context,
    agent,
    `${dispatchOutput} 当前不自动执行，必须由运营确认后进入执行队列。`,
    "Task dispatch",
    onEvent,
  );
}

function emitTool(
  context: AgentContext,
  agentId: AgentNodeId,
  tool: ToolCallRecord,
  onEvent: (event: AgentRunEvent) => void,
) {
  onEvent({
    type: "tool_call",
    runId: context.runId,
    agentId,
    tool,
  });
}

function emitMessage(
  context: AgentContext,
  agent: AgentDefinition,
  content: string,
  meta: string,
  onEvent: (event: AgentRunEvent) => void,
) {
  onEvent({
    type: "agent_message",
    runId: context.runId,
    agent,
    content,
    meta,
  });
}

function runTool(name: string, input: string, fn: () => string): ToolCallRecord {
  const startedAt = Date.now();
  return {
    name,
    input,
    output: fn(),
    durationMs: Date.now() - startedAt,
  };
}

function createHistoricalCase(event: HotEvent) {
  if (event.eventType === "paper") {
    return "论文热点优先做应用场景解释，再用评论区收集技术细节需求。";
  }
  if (event.eventType === "ai-model") {
    return "模型热点优先做能力边界和普通用户影响，二创再补测评和提示词。";
  }
  if (event.eventType === "ai-product") {
    return "产品热点优先做实测流程，承接工具清单、教程合集和试用线索。";
  }
  return "行业热点优先做趋势判断，避免绝对化预测，用评论问题收集需求。";
}

function formatScoreFactors(factors: ScoreFactor[]) {
  return factors.map((factor) => `${factor.label}${factor.value}`).join(" / ");
}

function getOperationValueScore(event: HotEvent) {
  const lifecycle =
    event.lifecycleStage === "burst"
      ? 24
      : event.lifecycleStage === "emerging"
        ? 20
        : event.lifecycleStage === "mature"
          ? 12
          : 6;
  const riskPenalty =
    event.riskLevel === "high" ? 20 : event.riskLevel === "medium" ? 8 : 0;
  const contentFit =
    event.eventType === "ai-model" || event.eventType === "ai-product" ? 18 : 12;

  return Math.max(
    0,
    Math.min(100, Math.round(event.heatScore * 0.58 + lifecycle + contentFit - riskPenalty)),
  );
}

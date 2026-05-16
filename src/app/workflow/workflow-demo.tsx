"use client";

import type { HotEvent, HotEventDashboard, Strategy } from "@/lib/hot-events";
import type { AgentRunEvent, AgentRunMode } from "@/lib/agent-orchestrator";
import type {
  OperationRole,
  OperationTask,
  OperationTaskStatus,
} from "@/lib/operation-tasks";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "../app-shell";
import { useOperationReviews } from "../hooks/use-operation-reviews";
import { useOperationTasks } from "../hooks/use-operation-tasks";
import type { DecisionStatus } from "../components/dashboard/types";

type RunMode = AgentRunMode;
type ConversationMessage = {
  id: string;
  align?: "left" | "right";
  label: string;
  body: string;
  meta?: string;
  result?: boolean;
  kind?: "message" | "tool" | "state" | "result";
  tools?: ConversationTool[];
  sections?: ConversationSection[];
};

type ConversationTool = {
  id: string;
  label: string;
  input: string;
  output: string;
  meta?: string;
};

type ConversationSection = {
  title: string;
  content: string;
};

const modes: Record<RunMode, { label: string; instruction: string }> = {
  standard: {
    label: "标准快反",
    instruction: "判断这个热点是否值得做抖音快反，给出脚本、评论引导、放量和止损规则。",
  },
  "risk-first": {
    label: "风险优先",
    instruction: "先做风险复核，再决定是否生成内容，重点标出不能说和需要人工确认的部分。",
  },
  "script-first": {
    label: "脚本优先",
    instruction: "直接产出一条适合抖音的解释型短视频脚本，要求有钩子、口播、字幕和评论引导。",
  },
};

const statusCopy: Record<
  OperationTaskStatus,
  { label: string; tone: string; next?: OperationTaskStatus; nextLabel?: string }
> = {
  pending: {
    label: "待处理",
    tone: "border-[#d8d2c6] bg-[#fbfaf7] text-[#6a6258]",
    next: "processing",
    nextLabel: "启动 Agent",
  },
  processing: {
    label: "处理中",
    tone: "border-[#8eb7df] bg-[#eef6ff] text-[#235985]",
  },
  awaiting_confirmation: {
    label: "待确认",
    tone: "border-[#d9b370] bg-[#fff9e8] text-[#80551c]",
  },
  confirmed: {
    label: "已确认",
    tone: "border-[#d9b370] bg-[#fff7e8] text-[#80551c]",
    next: "executing",
    nextLabel: "进入执行",
  },
  executing: {
    label: "执行中",
    tone: "border-[#8ebf81] bg-[#eef8eb] text-[#3f6e35]",
    next: "reviewed",
    nextLabel: "标记复盘",
  },
  reviewed: {
    label: "已复盘",
    tone: "border-[#beb7df] bg-[#f3f0ff] text-[#4e4384]",
  },
};

const roleCopy: Record<OperationRole, { label: string; tone: string }> = {
  operator: { label: "运营", tone: "bg-[#111] text-white" },
  content: { label: "内容供给", tone: "bg-[#fff0dc] text-[#8a4b16]" },
  audit: { label: "审核", tone: "bg-[#ffe5e1] text-[#8a2a22]" },
  strategy: { label: "策略", tone: "bg-[#edf6d8] text-[#49671f]" },
};

export function WorkflowDemo({ dashboard }: { dashboard: HotEventDashboard }) {
  const [currentDashboard, setCurrentDashboard] = useState(dashboard);
  const [selectedId, setSelectedId] = useState(
    dashboard.selectedEvent?.id ?? dashboard.events[0]?.id,
  );
  const [mode, setMode] = useState<RunMode>("standard");
  const [decision, setDecision] = useState<DecisionStatus>("pending");
  const [thinking, setThinking] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState(modes.standard.instruction);
  const [threads, setThreads] = useState<Record<string, ConversationMessage[]>>({});
  const messageCounter = useRef(0);
  const activeAssistantMessageId = useRef<string | null>(null);
  const { recordDecision } = useOperationReviews();
  const { tasks, summary, feedback, upsertTask } = useOperationTasks();

  const event = useMemo(() => {
    return (
      currentDashboard.events.find((item) => item.id === selectedId) ??
      currentDashboard.selectedEvent ??
      currentDashboard.events[0] ??
      null
    );
  }, [currentDashboard.events, currentDashboard.selectedEvent, selectedId]);

  const strategy = event ? currentDashboard.strategies[event.id] : null;
  const task = event ? tasks.find((item) => item.eventId === event.id) ?? null : null;
  const valueScore = event ? getOperationValueScore(event) : 0;
  const conversation = event ? threads[event.id] ?? [] : [];

  function ensureTask(nextStatus: OperationTaskStatus, nextStrategy = strategy) {
    if (!event) return;
    upsertTask({
      event,
      strategy: nextStrategy,
      status: nextStatus,
    });
  }

  function selectEvent(id: string) {
    setSelectedId(id);
    setDecision("pending");
    setAgentError(null);
  }

  function changeMode(nextMode: RunMode) {
    setMode(nextMode);
    setComposerValue(modes[nextMode].instruction);
    setDecision("pending");
  }

  async function runAgent(instruction = composerValue) {
    if (!event) return;
    const normalizedInstruction = instruction.trim();
    if (!normalizedInstruction) return;

    setThinking(true);
    setAgentError(null);
    setDecision("pending");
    ensureTask("processing");
    const assistantId = nextMessageId("assistant");
    activeAssistantMessageId.current = assistantId;
    setThreads((current) => ({
      ...current,
      [event.id]: [
        ...(current[event.id] ?? []),
        {
          id: nextMessageId("operator"),
          align: "right",
          label: "运营",
          body: normalizedInstruction,
        },
        {
          id: assistantId,
          label: "HotAgent",
          body: "我会先看清楚这个热点，再生成抖音运营动作。",
          meta: "running",
          tools: [],
        },
      ],
    }));
    setComposerValue("");

    try {
      const response = await fetch("/api/hot-events/agent-run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event,
          instruction: normalizedInstruction,
          mode,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Agent 运行失败");
      }

      await consumeAgentStream(response.body, (runEvent) => {
        handleAgentEvent(runEvent, event);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "策略 Agent 重跑失败";
      setAgentError(message);
      ensureTask("pending");
      setThreads((current) => ({
        ...current,
        [event.id]: [
          ...(current[event.id] ?? []),
          {
            id: nextMessageId("error"),
            label: "系统",
            body: message,
            meta: "运行失败，任务已回到待处理",
          },
        ],
      }));
    } finally {
      setThinking(false);
    }
  }

  function handleAgentEvent(runEvent: AgentRunEvent, currentEvent: HotEvent) {
    if (runEvent.type === "strategy_ready") {
      const nextStrategy = runEvent.strategy;
      setCurrentDashboard((current) => ({
        ...current,
        strategy:
          current.strategy?.eventId === nextStrategy.eventId
            ? nextStrategy
            : current.strategy,
        strategies: {
          ...current.strategies,
          [nextStrategy.eventId]: nextStrategy,
        },
      }));
      recordDecision({
        event: currentEvent,
        strategy: nextStrategy,
        decision: "modified",
      });
      ensureTask("awaiting_confirmation", nextStrategy);
      updateAssistantMessage(currentEvent.id, (message) => ({
        ...message,
        sections: createStrategySections(nextStrategy),
        meta: nextStrategy.llmTrace
          ? `${nextStrategy.llmTrace.usedLlm ? "LLM generated" : "Rule fallback"} · ${nextStrategy.llmTrace.model} · ${nextStrategy.llmTrace.durationMs}ms`
          : nextStrategy.llmGenerated
            ? "LLM generated"
            : "Rule fallback",
        result: true,
      }));
      return;
    }

    if (runEvent.type === "state_changed") {
      updateAssistantMessage(currentEvent.id, (message) => ({
        ...message,
        body: `${message.body}\n\n${runEvent.reason}`,
        meta: statusCopy[runEvent.status].label,
      }));
      return;
    }

    if (runEvent.type === "agent_started") {
      return;
    }

    if (runEvent.type === "tool_call") {
      updateAssistantMessage(currentEvent.id, (message) => ({
        ...message,
        tools: [
          ...(message.tools ?? []),
          {
            id: nextMessageId(`${runEvent.agentId}-tool-${runEvent.tool.name}`),
            label: getToolLabel(runEvent.agentId),
            input: runEvent.tool.input,
            output: runEvent.tool.output,
            meta: `${runEvent.tool.durationMs}ms`,
          },
        ],
      }));
      return;
    }

    if (runEvent.type === "agent_message") {
      updateAssistantMessage(currentEvent.id, (message) => ({
        ...message,
        body: `${runEvent.agent.name}：${runEvent.content}`,
        meta: runEvent.meta,
      }));
      return;
    }

    if (runEvent.type === "run_completed") {
      updateAssistantMessage(currentEvent.id, (message) => ({
        ...message,
        body: `${message.body}\n\n${runEvent.summary}`,
        meta: `${statusCopy[runEvent.status].label} · ${runEvent.durationMs}ms`,
        result: true,
      }));
    }
  }

  function updateAssistantMessage(
    eventId: string,
    updater: (message: ConversationMessage) => ConversationMessage,
  ) {
    const messageId = activeAssistantMessageId.current;
    if (!messageId) return;

    setThreads((current) => ({
      ...current,
      [eventId]: (current[eventId] ?? []).map((message) =>
        message.id === messageId ? updater(message) : message,
      ),
    }));
  }

  function nextMessageId(prefix: string) {
    messageCounter.current += 1;
    return `${prefix}-${messageCounter.current}`;
  }

  function applyDecision(nextDecision: DecisionStatus) {
    setDecision(nextDecision);
    if (!event || nextDecision === "pending") return;

    recordDecision({
      event,
      strategy,
      decision: nextDecision,
      rejectReason: nextDecision === "rejected" ? "other" : undefined,
    });

    if (nextDecision === "confirmed" || nextDecision === "modified") {
      ensureTask("confirmed");
    } else {
      ensureTask("pending");
    }
  }

  function advanceTask(status: OperationTaskStatus) {
    ensureTask(status);
    if (status === "confirmed") {
      setDecision("confirmed");
    }
  }

  return (
    <AppShell
      eyebrow="Agent Workflow"
      title="Agent 协同运营台"
      description="把热点判断、人工确认、角色流转和执行队列放在同一个运营工作流里。"
    >
      {event ? (
        <div className="grid gap-4 xl:grid-cols-[0.52fr_1.9fr]">
          <aside className="grid content-start gap-4 xl:sticky xl:top-4">
            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[#707070]">Current task</p>
                  <h2 className="mt-1 text-lg font-semibold leading-tight">热点处理单</h2>
                </div>
                <StatusPill status={task?.status ?? "pending"} />
              </div>
              <p className="mt-3 text-sm font-semibold leading-6">{event.title}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniMetric label="热度" value={`${event.heatScore}/${event.heatLevel}`} />
                <MiniMetric label="价值" value={String(valueScore)} />
                <MiniMetric label="阶段" value={event.lifecycleLabel} />
                <MiniMetric label="风险" value={event.riskLabel} />
              </div>
              <p className="mt-3 text-xs leading-5 text-[#666]">
                {event.reason} {event.intervention}
              </p>
            </section>

            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[#707070]">Execution queue</p>
                  <h2 className="mt-1 text-lg font-semibold leading-tight">执行队列</h2>
                </div>
                <span className="rounded-full border border-[#dcd8cf] px-2 py-1 text-xs text-[#666]">
                  {summary.total} 单
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {tasks.length ? (
                  tasks.slice(0, 8).map((item) => (
                    <button
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        item.eventId === event.id
                          ? "border-[#f0a060] bg-[#fff7ed]"
                          : "border-[#e8e5dd] bg-[#fbfaf7] hover:border-[#bbb]"
                      }`}
                      key={item.id}
                      onClick={() => selectEvent(item.eventId)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-xs font-semibold leading-5">{item.title}</p>
                        <StatusPill status={item.status} small />
                      </div>
                      <p className="mt-2 text-[11px] text-[#777]">
                        当前角色：{roleCopy[item.owner].label} · {item.lifecycleLabel} · 风险{item.riskLabel}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-[#dcd8cf] bg-[#fbfaf7] p-3 text-xs leading-5 text-[#777]">
                    还没有进入队列的任务。运行 Agent 或人工确认后，这里会出现可推进的运营处理单。
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[#dcd8cf] bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-[#707070]">Event pool</p>
              <div className="mt-3 grid max-h-[30vh] gap-2 overflow-y-auto pr-1">
                {currentDashboard.events.slice(0, 8).map((item) => (
                  <button
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      item.id === event.id
                        ? "border-[#111] bg-[#111] text-white"
                        : "border-[#e8e5dd] bg-[#fbfaf7] hover:border-[#bbb]"
                    }`}
                    key={item.id}
                    onClick={() => selectEvent(item.id)}
                  >
                    <p className="line-clamp-2 text-xs font-semibold leading-5">{item.title}</p>
                    <p className={`mt-1 text-[11px] ${item.id === event.id ? "text-white/70" : "text-[#888]"}`}>
                      {item.heatLevel} 级 · {item.lifecycleLabel} · 风险{item.riskLabel}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <main className="rounded-lg border border-[#dcd8cf] bg-[#fbfaf7] p-3 shadow-sm md:p-4">
              <div className="mx-auto grid max-w-6xl gap-4">
                <section className="flex min-h-[620px] flex-col rounded-xl border border-[#dcd8cf] bg-white shadow-sm">
                  <div className="flex flex-col gap-2 border-b border-[#eee9df] md:flex-row md:items-start md:justify-between">
                    <div className="p-4 pb-3">
                      <p className="text-xs font-bold uppercase text-[#707070]">Agent conversation</p>
                      <h2 className="mt-1 text-xl font-semibold">多轮热点运营智能体</h2>
                      <p className="mt-1 line-clamp-1 text-sm text-[#666]">{event.title}</p>
                    </div>
                    <div className="px-4 pt-4">
                      <StatusPill status={task?.status ?? "pending"} />
                    </div>
                  </div>

                  <div className="min-h-[360px] flex-1 overflow-y-auto bg-[#fcfbf8] px-4 py-5 md:px-8">
                    <div className="mx-auto grid max-w-3xl gap-4">
                    {conversation.length ? (
                      conversation.map((message) => (
                        <ChatMessage
                          align={message.align}
                          body={message.body}
                          key={message.id}
                          kind={message.kind}
                          label={message.label}
                          meta={message.meta}
                          result={message.result}
                          tools={message.tools}
                        />
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#dcd8cf] bg-[#fbfaf7] p-5">
                        <p className="text-sm font-semibold">还没有运行记录</p>
                        <p className="mt-2 text-sm leading-6 text-[#666]">
                          直接在下方输入框提问或下达运营指令。Agent 会流式展示读取热点源、检索历史案例、计算热度价值、生成抖音策略、风险审核和任务派发。
                        </p>
                      </div>
                    )}
                    {thinking ? (
                      <ChatMessage
                        body="正在调用服务端 Agent 图，策略节点完成后会进入待确认。"
                        label="调度 Agent"
                        meta="running"
                      />
                    ) : null}
                    </div>
                  </div>

                  {agentError ? (
                    <p className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      {agentError}
                    </p>
                  ) : null}

                  <form
                    className="border-t border-[#eee9df] bg-white p-3"
                    onSubmit={(submitEvent) => {
                      submitEvent.preventDefault();
                      void runAgent();
                    }}
                  >
                    <div className="mx-auto grid max-w-3xl gap-3">
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(modes) as RunMode[]).map((item) => (
                          <button
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                              mode === item
                                ? "border-[#111] bg-[#111] text-white"
                                : "border-[#dcd8cf] bg-white hover:border-[#111]"
                            }`}
                            key={item}
                            onClick={() => changeMode(item)}
                            type="button"
                          >
                            {modes[item].label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-end gap-2 rounded-2xl border border-[#dcd8cf] bg-[#fbfaf7] p-2 shadow-sm">
                        <textarea
                          className="max-h-36 min-h-14 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 outline-none"
                          onChange={(item) => setComposerValue(item.target.value)}
                          onKeyDown={(keyEvent) => {
                            if (keyEvent.key === "Enter" && !keyEvent.shiftKey) {
                              keyEvent.preventDefault();
                              void runAgent();
                            }
                          }}
                          placeholder="输入运营指令，例如：先做风险审核，再生成适合抖音的脚本和评论区承接"
                          value={composerValue}
                        />
                        <button
                          className="h-10 rounded-xl bg-[#111] px-4 text-sm font-semibold text-white hover:bg-[#333] disabled:opacity-50"
                          disabled={thinking || !composerValue.trim()}
                          type="submit"
                        >
                          {thinking ? "运行中" : "发送"}
                        </button>
                      </div>
                    </div>
                  </form>
                </section>

                {strategy && task && task.status !== "pending" ? (
                  <section className="rounded-xl border border-[#dcd8cf] bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-[#707070]">Operation package</p>
                        <h2 className="mt-1 text-xl font-semibold">人工确认台与动作清单</h2>
                        <p className="mt-2 text-sm leading-6 text-[#555]">
                          确认后会进入执行队列，由内容供给、审核、策略复盘继续流转。
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <DecisionButton active={decision === "confirmed"} label="确认" onClick={() => applyDecision("confirmed")} />
                        <DecisionButton active={decision === "modified"} label="改写采纳" onClick={() => applyDecision("modified")} />
                        <DecisionButton active={decision === "rejected"} label="否决" onClick={() => applyDecision("rejected")} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
                      <div className="grid gap-3">
                        <InfoBlock label="短视频脚本" value={strategy.campaignBrief.shortVideoScript} />
                        <InfoBlock label="评论区承接" value={strategy.campaignBrief.commentGuide} />
                      </div>
                      <div className="grid content-start gap-3">
                        <InfoBlock label="抖音动作" value={strategy.douyinOperationPlan.contentFormats.join(" / ")} />
                        <InfoBlock label="放量规则" value={strategy.douyinOperationPlan.trafficRule} />
                        <InfoBlock label="停投规则" value={strategy.douyinOperationPlan.stopRule} />
                      </div>
                    </div>

                    <TaskSteps task={task} />

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
                      <p className="text-sm leading-6 text-[#555]">
                        <strong className="text-[#111]">当前结论：</strong>{getDecisionCopy(decision, task?.status)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {!task ? (
                          <button
                            className="rounded-lg border border-[#111] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#111] hover:text-white"
                            onClick={() => advanceTask("confirmed")}
                          >
                            加入执行队列
                          </button>
                        ) : null}
                        {task?.status && statusCopy[task.status].next ? (
                          <button
                            className="rounded-lg bg-[#111] px-3 py-2 text-xs font-semibold text-white hover:bg-[#333]"
                            onClick={() => {
                              const nextStatus = statusCopy[task.status].next!;
                              if (nextStatus === "processing") {
                                void runAgent(modes[mode].instruction);
                              } else {
                                advanceTask(nextStatus);
                              }
                            }}
                          >
                            {statusCopy[task.status].nextLabel}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </section>
                ) : null}

                <section className="rounded-xl border border-[#dcd8cf] bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-[#707070]">Feedback loop</p>
                      <h2 className="mt-1 text-xl font-semibold">流程效率与规则反哺</h2>
                    </div>
                    <span className="rounded-full border border-[#dcd8cf] px-3 py-1 text-xs text-[#666]">
                      本地任务记录 Demo
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <MiniMetric label="任务数" value={String(summary.total)} />
                    <MiniMetric label="待确认" value={String(summary.awaitingConfirmation)} />
                    <MiniMetric label="执行中" value={String(summary.executing)} />
                    <MiniMetric label="已复盘" value={String(summary.reviewed)} />
                    <MiniMetric label="节省工时" value={`${summary.estimatedHoursSaved}h`} />
                  </div>
                  <div className="mt-3 grid gap-2">
                    {feedback.map((item) => (
                      <p className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3 text-xs leading-5 text-[#555]" key={item}>
                        {item}
                      </p>
                    ))}
                  </div>
                </section>
              </div>
          </main>
        </div>
      ) : null}
    </AppShell>
  );
}

async function consumeAgentStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: AgentRunEvent) => void,
) {
  const reader = body.getReader();
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
      const parsed = JSON.parse(data) as AgentRunEvent | { type: "error"; message: string };
      if (parsed.type === "error") {
        throw new Error(parsed.message);
      }
      onEvent(parsed);
    }
  }
}

function getToolLabel(agentId: string) {
  if (agentId === "perceive") return "读取热点";
  if (agentId === "research") return "查案例";
  if (agentId === "mine") return "算价值";
  if (agentId === "plan") return "生成策略";
  if (agentId === "guard") return "风险审核";
  return "派发任务";
}

function createStrategySections(strategy: Strategy): ConversationSection[] {
  return [
    {
      title: "标题方向",
      content: strategy.campaignBrief.titles.join(" / "),
    },
    {
      title: "一句话结论",
      content: strategy.agentReasoning.split("。")[0] + "。",
    },
    {
      title: "短视频脚本",
      content: strategy.campaignBrief.shortVideoScript,
    },
    {
      title: "放量/停投",
      content: `${strategy.douyinOperationPlan.trafficRule}\n${strategy.douyinOperationPlan.stopRule}`,
    },
  ];
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

function ChatMessage({
  align = "left",
  label,
  body,
  meta,
  result,
  kind,
  tools = [],
  sections = [],
}: {
  align?: "left" | "right";
  label: string;
  body: string;
  meta?: string;
  result?: boolean;
  kind?: "message" | "tool" | "state" | "result";
  tools?: ConversationTool[];
  sections?: ConversationSection[];
}) {
  const operator = align === "right";
  if (kind === "state") {
    return (
      <div className="mx-auto max-w-[80%] rounded-full border border-[#dcd8cf] bg-white px-3 py-2 text-center text-xs font-semibold text-[#555]">
        {body}
      </div>
    );
  }

  return (
    <div className={`flex w-full gap-3 ${operator ? "justify-end" : "justify-start"}`}>
      {!operator ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111] text-xs font-bold text-white">
          AI
        </div>
      ) : null}
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-left ${
          operator
            ? "bg-[#111] text-white"
            : result
              ? "border border-[#dcd8cf] bg-white shadow-sm"
              : "border border-[#e8e5dd] bg-white"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`text-xs font-semibold ${operator ? "text-white/80" : "text-[#555]"}`}>
            {label}
          </span>
          {meta ? <span className={`text-[11px] ${operator ? "text-white/60" : "text-[#999]"}`}>{meta}</span> : null}
        </div>
        {tools.length ? (
          <div className="mt-3 grid gap-1.5 rounded-xl border border-[#e8e5dd] bg-[#fbfaf7] p-2">
            {tools.map((tool) => (
              <div className="grid gap-1 rounded-lg bg-white px-2 py-1.5 text-xs text-[#666]" key={tool.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-semibold text-[#333]">
                    {tool.label}
                  </span>
                  {tool.meta ? <span className="shrink-0 text-[#999]">{tool.meta}</span> : null}
                </div>
                <div className="grid gap-0.5">
                  <p className="whitespace-pre-wrap leading-5 text-[#555]">
                    <strong className="text-[#333]">输入：</strong>{tool.input}
                  </p>
                  <p className="whitespace-pre-wrap leading-5 text-[#555]">
                    <strong className="text-[#333]">输出：</strong>{tool.output}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {sections.length ? (
          <div className="mt-3 grid gap-2">
            {sections.map((section) => (
              <div className="rounded-xl border border-[#e8e5dd] bg-white px-3 py-2" key={section.title}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#777]">{section.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#333]">{section.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${operator ? "text-white" : "text-[#333]"}`}>{body}</p>
        )}
      </div>
      {operator ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d9b370] text-xs font-bold text-[#111]">
          你
        </div>
      ) : null}
    </div>
  );
}

function TaskSteps({ task }: { task: OperationTask | null }) {
  const steps = task?.steps ?? [];
  if (!steps.length) {
    return (
      <p className="mt-4 rounded-lg border border-dashed border-[#dcd8cf] bg-[#fbfaf7] p-3 text-sm leading-6 text-[#666]">
        当前策略还未形成任务步骤。确认后会拆成运营、内容供给、审核、复盘四个角色动作。
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-4">
      {steps.map((step) => (
        <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3" key={step.id}>
          <div className="flex items-center justify-between gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${roleCopy[step.role].tone}`}>
              {roleCopy[step.role].label}
            </span>
            <span className="text-[11px] text-[#777]">{getStepStatusCopy(step.status)}</span>
          </div>
          <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
          <p className="mt-2 line-clamp-5 text-xs leading-5 text-[#666]">{step.output}</p>
        </div>
      ))}
    </div>
  );
}

function StatusPill({
  status,
  small = false,
}: {
  status: OperationTaskStatus;
  small?: boolean;
}) {
  return (
    <span
      className={`shrink-0 rounded-full border font-semibold ${statusCopy[status].tone} ${
        small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      {statusCopy[status].label}
    </span>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3">
      <p className="text-xs font-bold uppercase text-[#777]">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#444]">{value}</p>
    </div>
  );
}

function getDecisionCopy(decision: DecisionStatus, status?: OperationTaskStatus) {
  if (decision === "confirmed") return "已确认，任务进入内容供给和风险审核流转。";
  if (decision === "modified") return "已采纳改写，任务进入执行队列并沉淀为策略反馈。";
  if (decision === "rejected") return "已否决，回到待处理状态，作为负样本进入复盘指标。";
  if (status) return `任务当前处于「${statusCopy[status].label}」，等待下一步人工动作。`;
  return "等待人工确认，确认结果会进入执行队列和复盘指标。";
}

function getStepStatusCopy(status: "todo" | "doing" | "done") {
  if (status === "done") return "已完成";
  if (status === "doing") return "进行中";
  return "待开始";
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-2">
      <span className="text-[11px] text-[#777]">{label}</span>
      <strong className="mt-1 block text-sm">{value}</strong>
    </div>
  );
}

function DecisionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors md:text-sm ${
        active
          ? "border-[#111] bg-[#111] text-white"
          : "border-[#dcd8cf] bg-white hover:border-[#111]"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

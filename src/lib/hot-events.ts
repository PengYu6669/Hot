import { fetchAihotItems, getSinceDate, type AihotItem } from "./aihot";
import { generateJsonWithLlmResult } from "./llm";

export type HeatLevel = "S" | "A" | "B";
export type LifecycleStage = "emerging" | "burst" | "mature" | "decline";
export type RiskLevel = "low" | "medium" | "high";
export type EventType =
  | "ai-model"
  | "ai-product"
  | "industry"
  | "paper"
  | "tip"
  | "ai";

export type ScoreFactor = {
  label: string;
  value: number;
  evidence: string;
};

export type EventInsight = {
  userEmotion: string;
  platformDirection: string;
  operationGoal: string;
  contentAngle: string;
};

export type CampaignBrief = {
  titles: string[];
  shortVideoScript: string;
  commentGuide: string;
  riskGuardrail: string;
  distributionPlan: string;
};

export type MonetizationPlan = {
  trafficAsset: string;
  conversionPath: string;
  offer: string;
  activation: string;
  successMetric: string;
};

export type ReplicationPlaybook = {
  pattern: string;
  reusableHook: string;
  requiredSignals: string[];
  productionSteps: string[];
  scaleRule: string;
};

export type DouyinOperationPlan = {
  creatorArchetypes: string[];
  contentFormats: string[];
  commentOps: string;
  trafficRule: string;
  stopRule: string;
  riskChecklist: string[];
};

export type AgentRunStep = {
  id: "perceive" | "mine" | "plan" | "guard";
  name: string;
  input: string;
  action: string;
  output: string;
  llmUsed: boolean;
};

export type AgentRun = {
  id: string;
  startedAt: string;
  finishedAt: string;
  steps: AgentRunStep[];
};

export type LlmTrace = {
  attempted: boolean;
  usedLlm: boolean;
  model: string;
  durationMs: number;
  fallbackReason: string | null;
};

export type HotEvent = {
  id: string;
  title: string;
  summary: string;
  source: "aihot";
  sourceName: string;
  sourceUrl: string;
  heatScore: number;
  heatLevel: HeatLevel;
  scoreFactors: ScoreFactor[];
  lifecycleStage: LifecycleStage;
  lifecycleLabel: string;
  riskLevel: RiskLevel;
  riskLabel: string;
  eventType: EventType;
  eventTypeLabel: string;
  tags: string[];
  insight: EventInsight;
  reason: string;
  intervention: string;
  createdAt: string | null;
  publishedLabel: string;
  rawData: AihotItem;
};

export type Strategy = {
  id: string;
  eventId: string;
  topicName: string;
  contentTemplate: string;
  trafficSuggestion: string;
  reasoning: string;
  agentReasoning: string;
  heatAnalysis: string;
  riskAssessment: string;
  monetizationPlan: MonetizationPlan;
  replicationPlaybook: ReplicationPlaybook;
  agentRun?: AgentRun;
  llmTrace?: LlmTrace;
  llmGenerated: boolean;
  status: "pending" | "confirmed" | "modified" | "rejected";
  campaignBrief: CampaignBrief;
  douyinOperationPlan: DouyinOperationPlan;
};

type AgentOutput = CampaignBrief & {
  reasoning: string;
  heatAnalysis: string;
  riskAssessment: string;
  monetizationPlan: MonetizationPlan;
  replicationPlaybook: ReplicationPlaybook;
  douyinOperationPlan: DouyinOperationPlan;
};

export type HotEventDashboard = {
  metrics: Array<{ label: string; value: string; delta: string }>;
  events: HotEvent[];
  selectedEvent: HotEvent | null;
  strategy: Strategy | null;
  strategies: Record<string, Strategy>;
  generatedAt: string;
};

const categoryLabels: Record<string, string> = {
  "ai-models": "模型发布",
  "ai-products": "产品更新",
  industry: "行业动态",
  paper: "论文研究",
  tip: "技巧观点",
};

const eventTypeMap: Record<string, EventType> = {
  "ai-models": "ai-model",
  "ai-products": "ai-product",
  industry: "industry",
  paper: "paper",
  tip: "tip",
};

const importantKeywords = [
  "OpenAI",
  "Anthropic",
  "Google",
  "Gemini",
  "GPT",
  "Sora",
  "Claude",
  "Agent",
  "模型",
  "发布",
  "融资",
  "开源",
  "榜首",
  "全球",
];

export async function getHotEventDashboard({
  q,
  generateSelectedStrategy = false,
}: {
  q?: string;
  generateSelectedStrategy?: boolean;
} = {}): Promise<HotEventDashboard> {
  const response = await fetchAihotItems({
    mode: "selected",
    take: 12,
    since: getSinceDate(24 * 7),
    q,
  });

  const events = response.items.map(toHotEvent).sort((a, b) => {
    return b.heatScore - a.heatScore;
  });

  const selectedEvent = events[0] ?? null;
  const strategy = selectedEvent
    ? generateSelectedStrategy
      ? await createStrategy(selectedEvent)
      : createFallbackStrategy(selectedEvent)
    : null;
  const strategies = Object.fromEntries(
    events.map((event) => {
      const isSelected = event.id === selectedEvent?.id;
      if (isSelected && strategy) return [event.id, strategy];
      return [event.id, createFallbackStrategy(event)];
    }),
  );

  return {
    metrics: createMetrics(events),
    events,
    selectedEvent,
    strategy,
    strategies,
    generatedAt: new Date().toISOString(),
  };
}

function toHotEvent(item: AihotItem): HotEvent {
  const eventType = item.category ? eventTypeMap[item.category] : "ai";
  const scoreFactors = calculateScoreFactors(item);
  const heatScore = scoreFactors.reduce((sum, factor) => sum + factor.value, 0);
  const heatLevel = getHeatLevel(heatScore);
  const lifecycleStage = getLifecycleStage(item.publishedAt);
  const riskLevel = getRiskLevel(item);
  const eventTypeLabel = item.category
    ? categoryLabels[item.category]
    : "AI 热点";
  const insight = createInsight(item, eventTypeLabel, lifecycleStage);
  const intervention = createIntervention(lifecycleStage, heatLevel);

  return {
    id: item.id,
    title: item.title,
    summary: item.summary ?? "暂无摘要，建议运营确认原文后再生成内容方案。",
    source: "aihot",
    sourceName: item.source,
    sourceUrl: item.url,
    heatScore,
    heatLevel,
    scoreFactors,
    lifecycleStage,
    lifecycleLabel: getLifecycleLabel(lifecycleStage),
    riskLevel,
    riskLabel: getRiskLabel(riskLevel),
    eventType,
    eventTypeLabel,
    tags: createTags(item, eventTypeLabel),
    insight,
    reason: createScoreReason(item, heatScore),
    intervention,
    createdAt: item.publishedAt,
    publishedLabel: formatBeijingTime(item.publishedAt),
    rawData: item,
  };
}

function calculateScoreFactors(item: AihotItem): ScoreFactor[] {
  const ageHours = getAgeHours(item.publishedAt);
  const freshness =
    ageHours <= 6 ? 26 : ageHours <= 24 ? 21 : ageHours <= 72 ? 15 : 8;
  const category =
    item.category === "ai-models"
      ? 24
      : item.category === "ai-products"
        ? 22
        : item.category === "industry"
          ? 20
          : item.category === "paper"
            ? 17
            : 14;

  const text = `${item.title} ${item.summary ?? ""}`;
  const keywordHits = importantKeywords.filter((keyword) =>
    text.toLowerCase().includes(keyword.toLowerCase()),
  );
  const semantic = Math.min(16 + keywordHits.length * 3, 28);
  const reliability = 16 + (item.summary ? 4 : 0) + (item.url ? 2 : 0);

  return [
    {
      label: "时效信号",
      value: freshness,
      evidence:
        ageHours <= 24
          ? "最近 24 小时内发布，仍处于可运营窗口"
          : "发布时间较早，需要观察是否有二次传播",
    },
    {
      label: "事件类型",
      value: category,
      evidence: item.category
        ? `${categoryLabels[item.category]}类热点，适合做结构化内容供给`
        : "通用 AI 热点，需人工补充事件类型",
    },
    {
      label: "语义强度",
      value: semantic,
      evidence:
        keywordHits.length > 0
          ? `命中 ${keywordHits.slice(0, 3).join("、")} 等高关注词`
          : "未命中强热点词，依赖内容角度放大",
    },
    {
      label: "可信来源",
      value: reliability,
      evidence: item.summary
        ? "有来源、原文链接和摘要，可直接进入策略生成"
        : "摘要不足，需运营先核验原文",
    },
  ];
}

function getHeatLevel(score: number): HeatLevel {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  return "B";
}

function getLifecycleStage(publishedAt: string | null): LifecycleStage {
  const ageHours = getAgeHours(publishedAt);
  if (ageHours <= 3) return "emerging";
  if (ageHours <= 24) return "burst";
  if (ageHours <= 72) return "mature";
  return "decline";
}

function getRiskLevel(item: AihotItem): RiskLevel {
  const text = `${item.title} ${item.summary ?? ""}`;
  if (/监管|版权|争议|泄露|安全|诉讼|封禁/.test(text)) return "high";
  if (/融资|收购|裁员|价格|榜首|第一|排名/.test(text)) return "medium";
  return "low";
}

function getLifecycleLabel(stage: LifecycleStage) {
  const labels: Record<LifecycleStage, string> = {
    emerging: "萌芽期",
    burst: "爆发期",
    mature: "成熟期",
    decline: "衰退期",
  };
  return labels[stage];
}

function getRiskLabel(risk: RiskLevel) {
  const labels: Record<RiskLevel, string> = {
    low: "低",
    medium: "中",
    high: "高",
  };
  return labels[risk];
}

function createInsight(
  item: AihotItem,
  eventTypeLabel: string,
  stage: LifecycleStage,
): EventInsight {
  const titleAndSummary = `${item.title} ${item.summary ?? ""}`;
  const userEmotion = /第一|榜首|全球|突破|发布|开源/.test(titleAndSummary)
    ? "好奇、追新、效率焦虑"
    : /价格|裁员|监管|争议/.test(titleAndSummary)
      ? "不确定、观望、风险敏感"
      : "信息获取、观点判断";

  return {
    userEmotion,
    platformDirection:
      "优先鼓励有信息增量、低夸张表达、能帮助用户理解趋势的内容。",
    operationGoal:
      stage === "decline"
        ? "沉淀复盘素材，判断是否有二次传播机会。"
        : `围绕${eventTypeLabel}快速生成解释型内容，提升热点召回和运营转化。`,
    contentAngle:
      item.category === "paper"
        ? "把研究结论翻译成普通用户能理解的应用场景。"
        : "用“发生了什么、为什么重要、普通人怎么用”降低理解门槛。",
  };
}

function createTags(item: AihotItem, eventTypeLabel: string) {
  const tags = [eventTypeLabel];
  if (item.source) tags.push(item.source.replace(/^X[:：]/, "X："));
  if (/Agent|智能体/i.test(`${item.title} ${item.summary ?? ""}`)) {
    tags.push("Agent");
  }
  if (/开源/.test(`${item.title} ${item.summary ?? ""}`)) tags.push("开源");
  return Array.from(new Set(tags)).slice(0, 4);
}

function createScoreReason(item: AihotItem, heatScore: number) {
  const category = item.category ? categoryLabels[item.category] : "AI 热点";
  if (heatScore >= 85) {
    return `${category}条目在时效、语义强度和来源可信度上都满足优先介入条件。`;
  }
  if (heatScore >= 70) {
    return `${category}条目具备跟进价值，适合进入策略池做小流量验证。`;
  }
  return `${category}条目当前热度偏观察，可低成本收集反馈后再决定是否加码。`;
}

function createIntervention(stage: LifecycleStage, level: HeatLevel) {
  if (level === "S" && stage !== "decline") {
    return "建议 2 小时内切入，先发解释型内容，再跟进观点型二创。";
  }
  if (stage === "emerging") return "建议轻量试水，观察传播速度和评论关键词。";
  if (stage === "burst") return "建议立即生成内容模板并匹配创作者。";
  if (stage === "mature") return "建议做复盘型、清单型内容，降低同质化风险。";
  return "建议只保留监控，除非出现二次传播信号。";
}

export async function createStrategy(
  event: HotEvent,
  {
    humanInstruction,
    includeAgentRun = true,
    onToken,
    previousStrategy,
  }: {
    humanInstruction?: string;
    includeAgentRun?: boolean;
    onToken?: (token: string) => void;
    previousStrategy?: Strategy | null;
  } = {},
): Promise<Strategy> {
  const startedAt = Date.now();
  const normalizedInstruction = humanInstruction?.trim();
  const isRefinement = !!previousStrategy && !!normalizedInstruction;
  const fallback = createFallbackStrategy(event, normalizedInstruction);
  const fallbackOutput: AgentOutput = {
    titles: fallback.campaignBrief.titles,
    shortVideoScript: fallback.campaignBrief.shortVideoScript,
    commentGuide: fallback.campaignBrief.commentGuide,
    riskGuardrail: fallback.campaignBrief.riskGuardrail,
    distributionPlan: fallback.campaignBrief.distributionPlan,
    reasoning: fallback.reasoning,
    heatAnalysis: `热度 ${event.heatScore} 分 / ${event.heatLevel} 级，${event.lifecycleLabel}。评分：${event.scoreFactors.map((f) => `${f.label} ${f.value}/28`).join("，")}。`,
    riskAssessment: fallback.campaignBrief.riskGuardrail,
    monetizationPlan: fallback.monetizationPlan,
    replicationPlaybook: fallback.replicationPlaybook,
    douyinOperationPlan: fallback.douyinOperationPlan,
  };
  const refinementSuffix = isRefinement
    ? "\n- 这是对已有策略的修改优化，请基于用户反馈针对性地调整策略，只修改用户要求改的部分，保持其他部分不变"
    : "";

  const llmResult = await generateJsonWithLlmResult<Partial<AgentOutput>>({
    fallback: fallbackOutput,
    onToken,
    system: `你是 HotAgent，一个融合了事件感知、热度挖掘、策略生成、风险管控四大能力的热点运营 Agent。

你的角色定义：
- 感知：理解热点事件背景、来源可信度、行业位置
- 挖掘：判断事件为什么热、处于什么生命周期、运营价值多大
- 策略：产出内容角度、标题、脚本、分发节奏
- 管控：识别内容安全风险，标记人工确认断点
- 增长：把热度沉淀为可复用资产和可验证转化，不停留在流量

输出规则：
- 必须输出严格 JSON，不要 Markdown 代码块，不要解释性文字
- reasoning / heatAnalysis / riskAssessment 必须针对该事件具体内容分析，严禁套模板
- 如果有人类运营指令，必须显式说明你如何采纳、修正或拒绝该指令
- monetizationPlan 必须回答“热度和流量之后拿来做什么”
- replicationPlaybook 必须回答“这类爆款以后如何复制”
- douyinOperationPlan 必须回答“抖音化运营动作如何落地”
- shortVideoScript 必须是可直接录成竖屏视频的分镜脚本，按 0-3s / 3-10s / 10-20s / 20-30s 分段
- 语言克制、专业，面向运营中台场景${refinementSuffix}`,
    user: JSON.stringify({
      instruction: isRefinement
        ? "用户对上一次策略有反馈意见，请针对性地修改优化策略，只调整用户提到的问题，其他保持不变。"
        : "请以 HotAgent 身份完成全流程运营判断，输出完整 JSON。",
      humanInstruction: normalizedInstruction || null,
      previousStrategy: previousStrategy
        ? {
            titles: previousStrategy.campaignBrief.titles,
            shortVideoScript: previousStrategy.campaignBrief.shortVideoScript,
            commentGuide: previousStrategy.campaignBrief.commentGuide,
            riskGuardrail: previousStrategy.campaignBrief.riskGuardrail,
            distributionPlan: previousStrategy.campaignBrief.distributionPlan,
            reasoning: previousStrategy.reasoning,
            douyinOperationPlan: previousStrategy.douyinOperationPlan,
            monetizationPlan: previousStrategy.monetizationPlan,
          }
        : undefined,
      event: {
        title: event.title,
        summary: event.summary,
        source: event.sourceName,
        publishedAt: event.publishedLabel,
        category: event.eventTypeLabel,
        heatScore: event.heatScore,
        heatLevel: event.heatLevel,
        lifecycle: event.lifecycleLabel,
        riskLevel: event.riskLabel,
        tags: event.tags,
        scores: event.scoreFactors.map((f) => ({
          dimension: f.label,
          score: f.value,
          max: 28,
          basis: f.evidence,
        })),
      },
      outputFields: {
        titles: "3 个抖音风格标题",
        shortVideoScript: "30 秒竖屏脚本，按 0-3s / 3-10s / 10-20s / 20-30s 分段，包含口播和屏幕字幕",
        commentGuide: "评论区引导",
        riskGuardrail: "风险管控提示",
        distributionPlan: "分发节奏建议",
        reasoning: "完整决策推理链（200-400字）：事件背景 → 热因分析 → 价值判断 → 策略选择 → 风险考量",
        heatAnalysis: "热度四维分析（100-200字）：时效窗口 / 行业关注度 / 用户兴趣匹配 / 信源可信度",
        riskAssessment: "内容安全评估（100-150字）：敏感表述 / 事实争议 / 监管合规 / 平台调性",
        monetizationPlan: {
          trafficAsset: "本次热度能沉淀成什么资产",
          conversionPath: "从曝光到转化的路径",
          offer: "承接的产品/服务/社群/线索形态",
          activation: "用户下一步动作",
          successMetric: "验证是否值得加码的指标",
        },
        replicationPlaybook: {
          pattern: "可复制的爆款模式",
          reusableHook: "可复用开场钩子",
          requiredSignals: "下次复用前必须满足的真实信号数组",
          productionSteps: "复用生产步骤数组",
          scaleRule: "放量或停止规则",
        },
        douyinOperationPlan: {
          creatorArchetypes: "推荐创作者类型",
          contentFormats: "内容形式组合",
          commentOps: "评论区运营动作",
          trafficRule: "放量/停投规则",
          stopRule: "停止追热点的条件",
          riskChecklist: "发布前必须检查的风险点",
        },
      },
    }),
  });
  const output = normalizeAgentOutput(llmResult.output, fallbackOutput);
  const finishedAt = Date.now();

  const llmGenerated =
    llmResult.usedLlm &&
    output.reasoning !== fallbackOutput.reasoning &&
    output.reasoning.length > 80;

  return {
    id: `strategy-${event.id}`,
    eventId: event.id,
    topicName: `#${event.title.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "").slice(0, 18)}`,
    contentTemplate: `用"发生了什么 → 为什么重要 → 普通人怎么用/怎么看"的三段式拆解「${event.title}」，结尾抛出一个可二创的问题。`,
    trafficSuggestion: output.distributionPlan,
    reasoning: output.reasoning,
    agentReasoning: output.reasoning,
    heatAnalysis: output.heatAnalysis,
    riskAssessment: output.riskAssessment,
    monetizationPlan: output.monetizationPlan,
    replicationPlaybook: output.replicationPlaybook,
    douyinOperationPlan: output.douyinOperationPlan,
    agentRun: includeAgentRun
      ? createAgentRun(event, output, {
          startedAt,
          finishedAt,
          llmGenerated,
          humanInstruction: normalizedInstruction,
        })
      : undefined,
    llmTrace: {
      attempted: llmResult.attempted,
      usedLlm: llmResult.usedLlm,
      model: llmResult.model,
      durationMs: llmResult.durationMs,
      fallbackReason: llmResult.fallbackReason,
    },
    llmGenerated,
    status: "pending",
    campaignBrief: {
      titles: output.titles,
      shortVideoScript: output.shortVideoScript,
      commentGuide: output.commentGuide,
      riskGuardrail: output.riskGuardrail,
      distributionPlan: output.distributionPlan,
    },
  };
}

function createFallbackCampaignBrief(
  event: HotEvent,
  humanInstruction?: string,
): CampaignBrief {
  const instructionPrefix = humanInstruction
    ? `按人工指令「${humanInstruction}」调整：`
    : "";

  return {
    titles: [
      `${event.title}，普通人真正该关注什么？`,
      `这个${event.eventTypeLabel}为什么突然火了`,
      `一分钟看懂：${event.title.slice(0, 18)}`,
    ],
    shortVideoScript: `${instructionPrefix}0-3s｜钩子：别只看这条热点多热，先看它会影响谁。屏幕字幕「${event.title.slice(0, 18)}」。\n3-10s｜发生了什么：用一句话讲清事件——${event.summary.slice(0, 72)}。\n10-20s｜为什么重要：结合${event.lifecycleLabel}和${event.heatLevel}级热度，说明它对普通用户/创作者/企业的具体影响。\n20-30s｜抖音化收口：用一个问题引导评论——${event.eventType === "paper" ? "你想看论文应用场景，还是技术细节？" : "你更关心怎么用，还是会不会改变行业？"}`,
    commentGuide: "你更关心它的技术突破、商业机会，还是普通人的使用门槛？",
    riskGuardrail:
      event.riskLevel === "high"
        ? "需人工复核来源和表述，避免绝对化结论、未经证实数据和敏感扩散。"
        : "避免夸大效果，保留来源链接，观点与事实分开表达。",
    distributionPlan:
      event.heatLevel === "S"
        ? "先投放小流量验证完播与互动，30 分钟内若评论密度高则放大分发。"
        : "先进入自然流量池测试，用评论关键词决定是否二次包装。",
  };
}

function createMonetizationPlan(event: HotEvent): MonetizationPlan {
  const baseOffer =
    event.eventType === "paper"
      ? "论文精读清单、技术解读直播预约、研究社群线索"
      : event.eventType === "ai-model"
        ? "模型测评合集、提示词模板包、企业试用咨询线索"
        : event.eventType === "ai-product"
          ? "工具对比表、教程合集、效率工具订阅/咨询线索"
          : "趋势报告、行业解读专栏、私域社群入群线索";

  return {
    trafficAsset: `${event.eventTypeLabel}热点下的用户问题、评论关键词和可复用选题角度`,
    conversionPath:
      "短视频/图文获得曝光 → 评论区收集需求 → 私信/表单承接 → 推送清单、工具包或咨询入口 → 复盘转化质量",
    offer: baseOffer,
    activation:
      event.heatLevel === "S"
        ? "评论区置顶领取清单/模板，2 小时内用二创内容追问具体需求"
        : "先用收藏型内容沉淀兴趣用户，再通过后续合集做低成本转化",
    successMetric:
      "收藏率、评论需求密度、私信/表单点击率、有效线索率，而不只看播放量",
  };
}

function createReplicationPlaybook(event: HotEvent): ReplicationPlaybook {
  const requiredSignals = [
    `AI HOT 类别为「${event.eventTypeLabel}」`,
    `热度评分达到 ${event.heatLevel === "B" ? "70+" : `${event.heatScore}+`} 或出现强关键词`,
    "标题/摘要能回答明确用户问题",
    "来源链接和事实边界可被核验",
  ];

  return {
    pattern: `${event.eventTypeLabel}：发生了什么 → 为什么重要 → 普通人/企业怎么用 → 留一个可承接需求的问题`,
    reusableHook:
      event.eventType === "paper"
        ? "这篇论文真正有用的不是结论，而是它可能改掉一个工作流"
        : "这个 AI 热点别只看热闹，先看它会影响哪类人",
    requiredSignals,
    productionSteps: [
      "用 AI HOT 条目确认时效、类别、来源和摘要",
      "按四因子评分判断是否进入策略池",
      "把内容拆成解释型首发、教程型二创、清单型承接三段",
      "用评论需求决定是否放量或做下一条",
      "记录有效线索和内容结构，沉淀为下一次模板",
    ],
    scaleRule:
      "30-60 分钟内收藏/评论需求密度高于同类均值则加码二创；只有播放无收藏无需求则停止追热点。",
  };
}

function createDouyinOperationPlan(event: HotEvent): DouyinOperationPlan {
  const creatorArchetypes =
    event.eventType === "paper"
      ? ["技术解读型达人", "产品效率型账号", "行业观察型创作者"]
      : event.eventType === "ai-model"
        ? ["模型评测型达人", "AI 工具测评账号", "技术拆解型创作者"]
        : event.eventType === "ai-product"
          ? ["工具实测型达人", "效率提升型账号", "教程合集型创作者"]
          : ["热点解读型账号", "行业评论型达人", "知识清单型创作者"];

  const contentFormats =
    event.heatLevel === "S"
      ? ["30 秒解释短视频", "评论区答疑二创", "工具/观点对比卡片"]
      : ["60 秒观点拆解", "图文清单", "热点延伸问答"];

  return {
    creatorArchetypes,
    contentFormats,
    commentOps:
      event.heatLevel === "S"
        ? "置顶一个高频问题，集中收集评论关键词，2 小时内追加二创回应。"
        : "先用提问式评论收集关注点，若收藏和评论密度不足则不放大追投。",
    trafficRule:
      event.heatLevel === "S"
        ? "先小流量验证完播与收藏，30 分钟内指标优于同类样本再扩量。"
        : "先自然流量测试，用评论关键词和收藏率决定是否进入第二轮分发。",
    stopRule:
      event.lifecycleStage === "decline"
        ? "若已进入衰退期且没有二次传播信号，直接停止追热点。"
        : "播放有增长但收藏、评论和有效互动偏弱时，停止继续加码。",
    riskChecklist: [
      "来源链接可核验",
      "事实与观点分离表达",
      "避免夸大结论和绝对化判断",
      "敏感、版权、监管表述先人工复核",
    ],
  };
}

function createFallbackStrategy(
  event: HotEvent,
  humanInstruction?: string,
): Strategy {
  const campaignBrief = createFallbackCampaignBrief(event, humanInstruction);
  const douyinOperationPlan = createDouyinOperationPlan(event);
  const instructionReasoning = humanInstruction
    ? ` 已收到人工运营指令「${humanInstruction}」，当前先用本地规则生成改写版策略；如 LLM 可用，会进一步重跑生成。`
    : "";

  return {
    id: `strategy-${event.id}`,
    eventId: event.id,
    topicName: `#${event.title.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "").slice(0, 18)}`,
    contentTemplate: `用"发生了什么 → 为什么重要 → 普通人怎么用/怎么看"的三段式拆解「${event.title}」，结尾抛出一个可二创的问题。`,
    trafficSuggestion: campaignBrief.distributionPlan,
    reasoning: `${event.reason} ${event.intervention}${instructionReasoning}`,
    agentReasoning: `${event.reason} ${event.intervention}${instructionReasoning}`,
    heatAnalysis: `热度 ${event.heatScore} 分 / ${event.heatLevel} 级，${event.lifecycleLabel}。基于时效、事件类型、语义强度、可信来源四项加权评分。`,
    riskAssessment: `${event.riskLevel === "high" ? "高风险事件，需人工复核来源和表述。" : event.riskLevel === "medium" ? "中等风险，注意事实与观点分离。" : "低风险，可进入常规运营流程。"}`,
    monetizationPlan: createMonetizationPlan(event),
    replicationPlaybook: createReplicationPlaybook(event),
    douyinOperationPlan,
    llmGenerated: false,
    status: "pending",
    campaignBrief,
  };
}

function normalizeAgentOutput(
  output: Partial<AgentOutput>,
  fallback: AgentOutput,
): AgentOutput {
  return {
    titles: normalizeStringArray(output.titles, fallback.titles).slice(0, 3),
    shortVideoScript: normalizeString(
      output.shortVideoScript,
      fallback.shortVideoScript,
    ),
    commentGuide: normalizeString(output.commentGuide, fallback.commentGuide),
    riskGuardrail: normalizeString(output.riskGuardrail, fallback.riskGuardrail),
    distributionPlan: normalizeString(
      output.distributionPlan,
      fallback.distributionPlan,
    ),
    reasoning: normalizeString(output.reasoning, fallback.reasoning),
    heatAnalysis: normalizeString(output.heatAnalysis, fallback.heatAnalysis),
    riskAssessment: normalizeString(
      output.riskAssessment,
      fallback.riskAssessment,
    ),
    monetizationPlan: normalizeMonetizationPlan(
      output.monetizationPlan,
      fallback.monetizationPlan,
    ),
    replicationPlaybook: normalizeReplicationPlaybook(
      output.replicationPlaybook,
      fallback.replicationPlaybook,
    ),
    douyinOperationPlan: normalizeDouyinOperationPlan(
      output.douyinOperationPlan,
      fallback.douyinOperationPlan,
    ),
  };
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const strings = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  return strings.length ? strings : fallback;
}

function normalizeMonetizationPlan(
  value: unknown,
  fallback: MonetizationPlan,
): MonetizationPlan {
  if (!value || typeof value !== "object") return fallback;
  const plan = value as Partial<Record<keyof MonetizationPlan, unknown>>;
  return {
    trafficAsset: normalizeString(plan.trafficAsset, fallback.trafficAsset),
    conversionPath: normalizeString(plan.conversionPath, fallback.conversionPath),
    offer: normalizeString(plan.offer, fallback.offer),
    activation: normalizeString(plan.activation, fallback.activation),
    successMetric: normalizeString(plan.successMetric, fallback.successMetric),
  };
}

function normalizeReplicationPlaybook(
  value: unknown,
  fallback: ReplicationPlaybook,
): ReplicationPlaybook {
  if (!value || typeof value !== "object") return fallback;
  const playbook = value as Partial<Record<keyof ReplicationPlaybook, unknown>>;
  return {
    pattern: normalizeString(playbook.pattern, fallback.pattern),
    reusableHook: normalizeString(playbook.reusableHook, fallback.reusableHook),
    requiredSignals: normalizeStringArray(
      playbook.requiredSignals,
      fallback.requiredSignals,
    ),
    productionSteps: normalizeStringArray(
      playbook.productionSteps,
      fallback.productionSteps,
    ),
    scaleRule: normalizeString(playbook.scaleRule, fallback.scaleRule),
  };
}

function normalizeDouyinOperationPlan(
  value: unknown,
  fallback: DouyinOperationPlan,
): DouyinOperationPlan {
  if (!value || typeof value !== "object") return fallback;
  const plan = value as Partial<Record<keyof DouyinOperationPlan, unknown>>;
  return {
    creatorArchetypes: normalizeStringArray(
      plan.creatorArchetypes,
      fallback.creatorArchetypes,
    ),
    contentFormats: normalizeStringArray(
      plan.contentFormats,
      fallback.contentFormats,
    ),
    commentOps: normalizeString(plan.commentOps, fallback.commentOps),
    trafficRule: normalizeString(plan.trafficRule, fallback.trafficRule),
    stopRule: normalizeString(plan.stopRule, fallback.stopRule),
    riskChecklist: normalizeStringArray(
      plan.riskChecklist,
      fallback.riskChecklist,
    ),
  };
}

function createAgentRun(
  event: HotEvent,
  output: AgentOutput,
  {
    startedAt,
    finishedAt,
    llmGenerated,
    humanInstruction,
  }: {
    startedAt: number;
    finishedAt: number;
    llmGenerated: boolean;
    humanInstruction?: string;
  },
): AgentRun {
  const steps: AgentRunStep[] = [
    {
      id: "perceive",
      name: "感知 Agent",
      input: "AI HOT public API 条目",
      action: "清洗标题、来源、摘要、发布时间和分类",
      output: `生成 HotEvent：${event.sourceName} / ${event.publishedLabel}`,
      llmUsed: false,
    },
    {
      id: "mine",
      name: "挖掘 Agent",
      input: "HotEvent + 四因子评分规则",
      action: "计算热度、生命周期、运营价值和风险",
      output: output.heatAnalysis,
      llmUsed: false,
    },
    {
      id: "plan",
      name: "策略/增长 Agent",
      input: humanInstruction
        ? `事件洞察 + 人工指令：${humanInstruction}`
        : "事件洞察 + 平台导向 + 变现目标",
      action: "生成内容策略、承接路径和爆款复用方法",
      output: output.reasoning,
      llmUsed: llmGenerated,
    },
    {
      id: "guard",
      name: "管控 Agent",
      input: "策略包 + 风险标签",
      action: "检查事实边界、夸张表达和人工断点",
      output: output.riskAssessment,
      llmUsed: llmGenerated,
    },
  ];

  return {
    id: `run-${event.id}-${finishedAt}`,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    steps,
  };
}

function createMetrics(events: HotEvent[]) {
  const sCount = events.filter((event) => event.heatLevel === "S").length;
  const pendingCount = events.filter((event) => event.heatScore >= 70).length;
  const highRiskCount = events.filter(
    (event) => event.riskLevel === "high",
  ).length;
  const avgScore = events.length
    ? Math.round(
        events.reduce((sum, event) => sum + event.heatScore, 0) / events.length,
      )
    : 0;

  return [
    { label: "热点发现", value: String(events.length), delta: "近 7 天精选线索" },
    { label: "事件生成率", value: `${Math.round((pendingCount / Math.max(events.length, 1)) * 100)}%`, delta: "A 级以上进入运营池" },
    { label: "平均热度", value: String(avgScore), delta: `${sCount} 个 S 级优先处理` },
    {
      label: "管控压力",
      value: String(highRiskCount),
      delta: "高风险需人工复核",
    },
  ];
}

function getAgeHours(publishedAt: string | null) {
  if (!publishedAt) return 24 * 7;
  const time = new Date(publishedAt).getTime();
  if (Number.isNaN(time)) return 24 * 7;
  return Math.max(0, (Date.now() - time) / 1000 / 60 / 60);
}

function formatBeijingTime(publishedAt: string | null) {
  if (!publishedAt) return "时间未知";
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "时间未知";

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

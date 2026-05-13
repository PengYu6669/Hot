import { fetchAihotItems, getSinceDate, type AihotItem } from "./aihot";
import { generateJsonWithLlm } from "./llm";

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

export type SopNode = {
  name: string;
  owner: string;
  status: "done" | "running" | "pending" | "guarded";
  input: string;
  action: string;
  output: string;
};

export type RoiEstimate = {
  responseTime: string;
  manualTimeSaved: string;
  contentRecall: string;
  expectedConversion: string;
};

export type CampaignBrief = {
  titles: string[];
  shortVideoScript: string;
  commentGuide: string;
  riskGuardrail: string;
  distributionPlan: string;
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
  sop: SopNode[];
  roi: RoiEstimate;
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
  recommendedCreators: string[];
  trafficSuggestion: string;
  confidence: number;
  reasoning: string;
  agentReasoning: string;
  heatAnalysis: string;
  riskAssessment: string;
  llmGenerated: boolean;
  status: "pending" | "confirmed" | "modified" | "rejected";
  campaignBrief: CampaignBrief;
};

type AgentOutput = CampaignBrief & {
  reasoning: string;
  heatAnalysis: string;
  riskAssessment: string;
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
}: {
  q?: string;
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
    ? await createStrategy(selectedEvent)
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
    sop: createSopNodes(heatLevel, lifecycleStage, riskLevel),
    roi: createRoiEstimate(heatLevel, lifecycleStage),
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

function createSopNodes(
  level: HeatLevel,
  stage: LifecycleStage,
  risk: RiskLevel,
): SopNode[] {
  return [
    {
      name: "线索感知",
      owner: "感知 Agent",
      status: "done",
      input: "AI HOT 精选条目",
      action: "清洗标题、来源、摘要、发布时间",
      output: "标准 HotEvent",
    },
    {
      name: "事件挖掘",
      owner: "分析 Agent",
      status: "done",
      input: "HotEvent + scoring factors",
      action: "判断热度等级、生命周期、用户情绪",
      output: `${level} 级 / ${getLifecycleLabel(stage)}`,
    },
    {
      name: "运营策略",
      owner: "运营 Agent",
      status: level === "B" ? "pending" : "running",
      input: "事件洞察 + 平台导向",
      action: "生成标题、脚本、达人和分发建议",
      output: "待确认策略包",
    },
    {
      name: "管控复盘",
      owner: "人工 + 复盘 Agent",
      status: risk === "high" ? "guarded" : "pending",
      input: "策略包 + 风险标签 + 后验指标",
      action: "人工确认、记录采纳和转化",
      output: "ROI 复盘样本",
    },
  ];
}

function createRoiEstimate(level: HeatLevel, stage: LifecycleStage): RoiEstimate {
  const urgent = level === "S" || stage === "burst";
  return {
    responseTime: urgent ? "预计 15 分钟出首版方案" : "预计 30 分钟出观察方案",
    manualTimeSaved: urgent ? "节省约 45 分钟人工选题/脚本时间" : "节省约 25 分钟人工判断时间",
    contentRecall: urgent ? "预估召回 8-12 个可运营内容角度" : "预估召回 3-5 个低成本内容角度",
    expectedConversion: urgent ? "策略采纳后预估转化 uplift 12%-18%" : "小流量验证后预估 uplift 5%-8%",
  };
}

async function createStrategy(event: HotEvent): Promise<Strategy> {
  const fallback = createFallbackStrategy(event);
  const output = await generateJsonWithLlm<AgentOutput>({
    fallback: {
      titles: fallback.campaignBrief.titles,
      shortVideoScript: fallback.campaignBrief.shortVideoScript,
      commentGuide: fallback.campaignBrief.commentGuide,
      riskGuardrail: fallback.campaignBrief.riskGuardrail,
      distributionPlan: fallback.campaignBrief.distributionPlan,
      reasoning: fallback.reasoning,
      heatAnalysis: `热度 ${event.heatScore} 分 / ${event.heatLevel} 级，${event.lifecycleLabel}。评分：${event.scoreFactors.map((f) => `${f.label} ${f.value}/28`).join("，")}。`,
      riskAssessment: fallback.campaignBrief.riskGuardrail,
    },
    system: `你是 HotAgent，一个融合了事件感知、热度挖掘、策略生成、风险管控四大能力的热点运营 Agent。

你的角色定义：
- 感知：理解热点事件背景、来源可信度、行业位置
- 挖掘：判断事件为什么热、处于什么生命周期、运营价值多大
- 策略：产出内容角度、标题、脚本、分发节奏
- 管控：识别内容安全风险，标记人工确认断点

输出规则：
- 必须输出严格 JSON，不要 Markdown 代码块，不要解释性文字
- reasoning / heatAnalysis / riskAssessment 必须针对该事件具体内容分析，严禁套模板
- 语言克制、专业，面向运营中台场景`,
    user: JSON.stringify({
      instruction: "请以 HotAgent 身份完成全流程运营判断，输出完整 JSON。",
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
        shortVideoScript: "30 秒短视频脚本，三段式",
        commentGuide: "评论区引导",
        riskGuardrail: "风险管控提示",
        distributionPlan: "分发节奏建议",
        reasoning: "完整决策推理链（200-400字）：事件背景 → 热因分析 → 价值判断 → 策略选择 → 风险考量",
        heatAnalysis: "热度四维分析（100-200字）：时效窗口 / 行业关注度 / 用户兴趣匹配 / 信源可信度",
        riskAssessment: "内容安全评估（100-150字）：敏感表述 / 事实争议 / 监管合规 / 平台调性",
      },
    }),
  });

  const llmGenerated = output.reasoning.length > 80;

  return {
    id: `strategy-${event.id}`,
    eventId: event.id,
    topicName: `#${event.title.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "").slice(0, 18)}`,
    contentTemplate: `用"发生了什么 → 为什么重要 → 普通人怎么用/怎么看"的三段式拆解「${event.title}」，结尾抛出一个可二创的问题。`,
    recommendedCreators: getRecommendedCreators(event),
    trafficSuggestion: output.distributionPlan,
    confidence: llmGenerated
      ? event.heatLevel === "S" ? 0.86 : event.heatLevel === "A" ? 0.74 : 0.62
      : event.heatLevel === "S" ? 0.78 : event.heatLevel === "A" ? 0.68 : 0.56,
    reasoning: output.reasoning,
    agentReasoning: output.reasoning,
    heatAnalysis: output.heatAnalysis,
    riskAssessment: output.riskAssessment,
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

function createFallbackCampaignBrief(event: HotEvent): CampaignBrief {
  return {
    titles: [
      `${event.title}，普通人真正该关注什么？`,
      `这个${event.eventTypeLabel}为什么突然火了`,
      `一分钟看懂：${event.title.slice(0, 18)}`,
    ],
    shortVideoScript: `开头 3 秒点出事件：${event.title}。中段解释它为什么重要：${event.summary.slice(0, 80)}。结尾给用户一个行动建议：先关注应用场景，不要只看参数和排名。`,
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

function createFallbackStrategy(event: HotEvent): Strategy {
  const campaignBrief = createFallbackCampaignBrief(event);

  return {
    id: `strategy-${event.id}`,
    eventId: event.id,
    topicName: `#${event.title.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "").slice(0, 18)}`,
    contentTemplate: `用"发生了什么 → 为什么重要 → 普通人怎么用/怎么看"的三段式拆解「${event.title}」，结尾抛出一个可二创的问题。`,
    recommendedCreators: getRecommendedCreators(event),
    trafficSuggestion: campaignBrief.distributionPlan,
    confidence:
      event.heatLevel === "S" ? 0.78 : event.heatLevel === "A" ? 0.68 : 0.56,
    reasoning: `${event.reason} ${event.intervention}`,
    agentReasoning: `${event.reason} ${event.intervention}`,
    heatAnalysis: `热度 ${event.heatScore} 分 / ${event.heatLevel} 级，${event.lifecycleLabel}。基于时效、事件类型、语义强度、可信来源四项加权评分。`,
    riskAssessment: `${event.riskLevel === "high" ? "高风险事件，需人工复核来源和表述。" : event.riskLevel === "medium" ? "中等风险，注意事实与观点分离。" : "低风险，可进入常规运营流程。"}`,
    llmGenerated: false,
    status: "pending",
    campaignBrief,
  };
}

function getRecommendedCreators(event: HotEvent) {
  if (event.eventType === "paper") {
    return ["@论文精读室", "@AI研究员日常", "@模型观察站"];
  }
  if (event.eventType === "ai-model") {
    return ["@模型测评局", "@AI效率研究所", "@开源情报站"];
  }
  if (event.eventType === "ai-product") {
    return ["@产品增长笔记", "@AI工具箱", "@创业者日报"];
  }
  return ["@AI商业观察", "@科技热点局", "@趋势拆解员"];
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

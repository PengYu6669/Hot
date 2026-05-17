import type { HotEvent, Strategy } from "./hot-events";

// Agent推理链路步骤
export type AgentChainStep = {
  id: "perceive" | "mine" | "strategy";
  name: string;
  timestamp: string;
  confidence: number;
  input: string;
  action: string;
  output: string;
  dataSource?: string;
};

// 相似案例
export type SimilarCase = {
  id: string;
  title: string;
  similarity: number;
  lifecycle: string;
  strategy: string;
  effect: {
    playback: string;
    engagement: string;
  };
  date: string;
};

// SOP匹配
export type SOPMatch = {
  id: string;
  name: string;
  confidence: number;
  reason: string;
  content: string;
};

// 预测效果
export type PredictedEffect = {
  playback: { value: string; baseline: string };
  engagement: { value: string; baseline: string };
  conversion: { value: string; baseline: string };
};

// 风险预警
export type RiskWarning = {
  level: "low" | "medium" | "high";
  message: string;
  detail: string;
};

// 基于真实HotEvent生成Agent推理链路
export function generateAgentChain(event: HotEvent): AgentChainStep[] {
  const now = new Date();
  const time1 = new Date(now.getTime() - 2 * 60000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  const time2 = new Date(now.getTime() - 1 * 60000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  const time3 = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  return [
    {
      id: "perceive",
      name: "感知Agent",
      timestamp: time1,
      confidence: 90,
      input: `${event.sourceName} 热点条目`,
      action: "发现线索：提取标题、来源、摘要、发布时间",
      output: `识别为${event.eventTypeLabel}类事件，来源可信度高`,
      dataSource: `${event.sourceName} API`,
    },
    {
      id: "mine",
      name: "挖掘Agent",
      timestamp: time2,
      confidence: 85,
      input: "结构化事件数据 + 历史事件图谱",
      action: "事件聚类：计算热度因子、判定生命周期、评估影响",
      output: `热度${event.heatScore}分(${event.heatLevel}级)，${event.lifecycleLabel}，${event.intervention}`,
      dataSource: "事件知识图谱 + 向量数据库",
    },
    {
      id: "strategy",
      name: "运营Agent",
      timestamp: time3,
      confidence: 80,
      input: "事件画像 + SOP库 + 历史案例",
      action: "SOP匹配：检索相似案例，生成运营策略",
      output: `推荐${event.eventTypeLabel}运营策略`,
      dataSource: "SOP知识库 + RAG召回",
    },
  ];
}

// 基于真实HotEvent生成相似案例
export function generateSimilarCases(event: HotEvent): SimilarCase[] {
  const cases: SimilarCase[] = [];

  // 根据事件类型生成相似案例
  if (event.eventType === "ai-model") {
    cases.push({
      id: "CASE_001",
      title: "类似模型发布事件",
      similarity: 85,
      lifecycle: "萌芽期 → 爆发期",
      strategy: "技术解读 + 二创激励",
      effect: { playback: "+150%", engagement: "+20%" },
      date: "2026-03-15",
    });
  } else if (event.eventType === "ai-product") {
    cases.push({
      id: "CASE_002",
      title: "类似产品更新事件",
      similarity: 80,
      lifecycle: "爆发期 → 成熟期",
      strategy: "功能测评 + 使用教程",
      effect: { playback: "+120%", engagement: "+18%" },
      date: "2026-04-08",
    });
  } else {
    cases.push({
      id: "CASE_003",
      title: `类似${event.eventTypeLabel}事件`,
      similarity: 75,
      lifecycle: `${event.lifecycleLabel}`,
      strategy: "内容解读 + 用户互动",
      effect: { playback: "+100%", engagement: "+15%" },
      date: "2026-02-20",
    });
  }

  return cases;
}

// 基于真实Strategy生成SOP匹配
export function generateSOPMatch(event: HotEvent, strategy?: Strategy | null): SOPMatch {
  return {
    id: `SOP-${event.eventType.toUpperCase()}-001`,
    name: `${event.eventTypeLabel}类-${event.lifecycleLabel}-${event.riskLabel}风险`,
    confidence: 80,
    reason: `事件类型匹配、生命周期匹配、风险等级匹配`,
    content: strategy?.reasoning || `针对${event.eventTypeLabel}事件，在${event.lifecycleLabel}采用内容解读+用户互动的组合策略`,
  };
}

// 基于真实HotEvent生成预测效果
export function generatePredictedEffect(event: HotEvent): PredictedEffect {
  const multiplier = event.heatLevel === "S" ? 2.0 : event.heatLevel === "A" ? 1.5 : 1.2;

  return {
    playback: {
      value: `+${Math.round(multiplier * 100)}%`,
      baseline: "vs不运营",
    },
    engagement: {
      value: `+${Math.round(multiplier * 10)}%`,
      baseline: "vs同类平均",
    },
    conversion: {
      value: `+${(multiplier * 2).toFixed(1)}%`,
      baseline: "粉丝转化率",
    },
  };
}

// 基于真实HotEvent生成风险预警
export function generateRiskWarnings(event: HotEvent): RiskWarning[] {
  const warnings: RiskWarning[] = [];

  if (event.riskLevel === "high") {
    warnings.push({
      level: "high",
      message: "高风险事件，需严格审核",
      detail: "避免引发争议，确保事实准确，需人工复核后发布",
    });
  } else if (event.riskLevel === "medium") {
    warnings.push({
      level: "medium",
      message: "中等风险，需注意表述",
      detail: "避免夸大效果，保留来源链接，观点与事实分开表达",
    });
  }

  return warnings;
}

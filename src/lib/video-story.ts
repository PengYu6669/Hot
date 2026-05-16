import type { HotEvent, Strategy } from "./hot-events";

export type VideoScene = {
  id: string;
  label: string;
  duration: number;
  headline: string;
  body: string;
  subtitle: string;
};

export type VideoStoryboard = {
  title: string;
  hook: string;
  caption: string;
  scenes: VideoScene[];
  totalDuration: number;
};

export function createVideoStoryboard(
  event: HotEvent,
  strategy: Strategy | null,
): VideoStoryboard {
  const creatorLine = strategy?.douyinOperationPlan.creatorArchetypes.join("、") ?? "内容创作者";
  const formatLine = strategy?.douyinOperationPlan.contentFormats[0] ?? "30 秒解释短视频";
  const hook = `别只看这条热点多热，先看它会不会改变 ${event.eventTypeLabel} 的表达方式。`;
  const scenes: VideoScene[] = [
    {
      id: "hook",
      label: "钩子",
      duration: 5,
      headline: event.title,
      body: hook,
      subtitle: `${event.heatScore} 分 · ${event.heatLevel} 级 · ${event.lifecycleLabel}`,
    },
    {
      id: "why-hot",
      label: "为什么热",
      duration: 6,
      headline: event.reason,
      body: event.insight.operationGoal,
      subtitle: `时效、语义、来源三项一起看，不是单纯追热搜。`,
    },
    {
      id: "angle",
      label: "怎么拍",
      duration: 6,
      headline: "抖音化内容角度",
      body: `${creatorLine}更适合用${formatLine}切入，先回答“发生了什么、为什么重要、普通人怎么用”。`,
      subtitle: strategy?.douyinOperationPlan.commentOps ?? event.intervention,
    },
    {
      id: "action",
      label: "行动",
      duration: 6,
      headline: "运营动作",
      body: `${strategy?.douyinOperationPlan.trafficRule ?? "先小流量验证"} ${strategy?.douyinOperationPlan.stopRule ?? "不适合就停"} `,
      subtitle: strategy?.monetizationPlan.successMetric ?? "收藏率、评论密度、有效线索率",
    },
    {
      id: "cta",
      label: "收口",
      duration: 5,
      headline: "下一步",
      body: strategy?.campaignBrief.commentGuide ?? "评论区告诉我你更想看技术拆解还是商业分析。",
      subtitle: strategy?.monetizationPlan.activation ?? "先做解释型内容，再看是否值得扩量。",
    },
  ];

  return {
    title: `HotAgent 视频草案 · ${event.eventTypeLabel}`,
    hook,
    caption: `${event.title}｜${strategy?.douyinOperationPlan.trafficRule ?? "热点快反"}｜#HotAgent`,
    scenes,
    totalDuration: scenes.reduce((sum, scene) => sum + scene.duration, 0),
  };
}


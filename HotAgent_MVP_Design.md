# HotAgent — 抖音热点运营平台 MVP 设计文档

---

## 一、面试题与 MVP 功能映射

| 面试题 | MVP 要做吗 | 在 HotAgent 里的落地形态 |
| :--- | :--- | :--- |
| **题1：定义"热"的分层模型** | ✅ 必须做 | 感知 Agent 的热度分计算逻辑和 S/A/B 三级分级。页面直接展示每个事件的 `heatScore` 和 `heatLevel`，以及为什么打这个分（推荐理由）。 |
| **题2：运营 SOP 的平台化抽象** | ✅ 必须做 | 整套系统的底层 DAG 编排。感知 → 分析 → 策略生成 → 方案确认，这四个节点就是你抽象出来的标准运营流水线。 |
| **题3：指标体系与 ROI 验证** | ⚠️ 做一半 | 页面上留一个指标监控区（热点处理时长、Agent 采纳率、漏报率），用 Mock 数据展示。等 V2 再接入真实数据看板。 |
| **题4：热点生命周期与介入时机** | ✅ 做逻辑 | 分析 Agent 的趋势预测字段（`lifecycleStage`：萌芽/爆发/成熟/衰退），并在策略里给出介入建议。页面用色条可视化当前所处阶段。 |
| **题5：创作者撮合与内容供给** | ⚠️ 只出名单 | 运营 Agent 输出的策略里包含推荐创作者名单（Mock 数据），不做真实 API 调用。 |
| **题6：竞品热点判断与抖音化改造** | ❌ V2 | 暂时不做。等进入团队拿到真实业务场景后再迭代。 |

---

## 二、Agent 架构设计

```
┌─────────────────────────────────────────────────┐
│                    消息队列                       │
│  (Redis / BullMQ，解耦 Agent 与前端)              │
└───┬──────────┬──────────┬──────────┬───────────┘
    │          │          │          │
    ▼          ▼          ▼          ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│感知Agent│ │分析Agent│ │运营Agent│ │复盘Agent│
│perceive│ │analyze │ │execute │ │review  │
│       │ │       │ │       │ │(V2)   │
└─┬─────┘ └─┬─────┘ └─┬─────┘ └───────┘
  │         │         │
  │  DAG 编排（LangGraph StateGraph）            │
  │  [感知] → [分析] → [策略生成] → [等待人工确认] │
  │     ↑                          │
  │     └─── 失败/降级回退 ─────────┘
  │
  ▼
┌─────────────────────────────────────────────────┐
│                  工具层 (MCP)                    │
│  trend-scraper / doc-retriever / topic-manager  │
└─────────────────────────────────────────────────┘
```

### 核心设计点

1. **DAG 编排，不走单一 Prompt**  
   每个 Agent 只做一件事，节点间通过状态（State）传递，出问题可以精确定位到哪一步。

2. **节点独立**  
   每个节点都是一个独立的 Agent，有自己的 Prompt 和工具调用权限。

3. **人机协同（HITL）**  
   分析 Agent 生成方案后，必须等待人工确认才能执行。这是你 Guardrails 体系里 HITL 的落地。

4. **降级逻辑**  
   任何节点失败，回退到上一个节点并重试，超过重试次数则标记为"需人工介入"。

---

## 三、RAG 架构设计

**方案：混合检索 + 重排序**

```
用户 Query（当前热点事件摘要）
    │
    ▼
┌─────────────────────┐
│  Query 改写（Re-writing）│  ← 轻量 LLM，扩展同义词、补全上下文
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────┐
│  混合检索（Hybrid Retrieval） │
│  ┌──────────┐ ┌───────────┐ │
│  │ 向量检索  │ │ 全文检索   │ │
│  │(pgvector)│ │(关键词匹配)│ │
│  └────┬─────┘ └─────┬─────┘ │
│       │              │       │
│       └──────┬───────┘       │
│              ▼               │
│     粗排结果（Top-20）       │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  精排（Reranker）            │
│  用 BGE-Reranker 或 LLM     │
│  对 Top-20 重排序，输出 Top-5 │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  上下文压缩                   │
│  对 Top-5 文档提取最相关段落   │
│  注入 Agent 的 prompt         │
└─────────────────────────────┘
```

### 技术实现细节

| 模块 | 实现方案 |
| :--- | :--- |
| **数据库** | PostgreSQL + pgvector（HNSW 索引）。你 NexMind 里那套直接搬过来。 |
| **多路召回** | 向量检索负责语义匹配，全文检索负责精确关键词。用 **RRF 融合排序**。 |
| **精排** | 对粗排 Top-20 用 BGE-Reranker 重排序。面试时可以说"用精排比单纯调大 K 值性价比更高"。 |
| **父子 Chunk** | 每个案例存两个粒度的 Chunk。父 Chunk 是摘要（200 字），子 Chunk 是原文段落。检索时先匹配父 Chunk，命中后拉取对应子 Chunk。 |

---

## 四、数据模型

### 4.1 热点事件（HotEvent）

```typescript
interface HotEvent {
  id: string;
  title: string;
  summary: string;
  source: "weibo" | "douyin" | "aihot" | "mock";
  heatScore: number;          // 热度分 0-100
  heatLevel: "S" | "A" | "B"; // 热度等级
  lifecycleStage: "emerging" | "burst" | "mature" | "decline"; // 生命周期阶段
  riskLevel: "low" | "medium" | "high";
  eventType: "entertainment" | "social" | "vertical" | "ai";
  tags: string[];
  rawData: any;
  createdAt: Date;
}
```

### 4.2 运营策略（Strategy）

```typescript
interface Strategy {
  id: string;
  eventId: string;
  topicName: string;           // 话题名称建议
  contentTemplate: string;     // 内容模板
  recommendedCreators: string[]; // 推荐创作者名单
  trafficSuggestion: string;   // 流量配置建议
  confidence: number;          // 置信度
  reasoning: string;           // 推荐理由（为什么给这个策略）
  status: "pending" | "confirmed" | "modified" | "rejected";
}
```

### 4.3 历史案例（HistoricalCase）

```typescript
interface HistoricalCase {
  id: string;
  title: string;
  eventType: string;
  strategy: string;
  result: string;
  roi: number;
  lessons: string;
}
```

---

## 五、优化后的 PRD

### 5.1 核心功能与面试题映射

| 功能 | 对应面试题 | 落地形态 |
| :--- | :--- | :--- |
| 热度分计算 + S/A/B 分级 | 题1：定义"热"的分层模型 | 感知 Agent 输出，页面用色条+数字展示，附带打分理由 |
| 运营 SOP 抽象为 DAG | 题2：运营 SOP 的平台化抽象 | 整个系统的底层引擎，四个节点串行 |
| 指标监控区 | 题3：指标体系与 ROI 验证 | 页面顶部的数据看板（处理时长、采纳率、漏报率） |
| 生命周期阶段可视化 | 题4：热点生命周期与介入时机 | 分析 Agent 输出的 `lifecycleStage` 字段，页面用进度条展示 |
| 策略推荐 + 确认/否决 | 题5：人机协同设计 | 运营 Agent 输出的 Strategy 卡片，三个操作按钮 |

### 5.2 RAG 方案：混合检索 + 重排序

- 向量检索（pgvector HNSW）+ 全文检索，RRF 融合
- BGE-Reranker 精排
- 父子 Chunk 粒度（摘要级 + 段落级）

### 5.3 Agent 架构：DAG 编排 + 消息队列解耦

- 感知 → 分析 → 策略生成 → 等待人工确认
- 每个节点独立 Agent，有自己的 Prompt 和工具
- 失败降级 + 人工兜底

### 5.4 技术栈（保持精简）

| 层级 | 技术选型 |
| :--- | :--- |
| **前端** | Next.js 16 + React 19 + TypeScript + Tailwind + Shadcn/ui |
| **后端** | Next.js API Routes / Server Actions |
| **Agent** | Vercel AI SDK + LangGraph |
| **数据** | PostgreSQL + pgvector + Prisma |
| **部署** | Vercel |

---

## 六、MVP 落地调整：用 AI HOT Skill 替代爬虫

### 6.1 数据源策略

MVP 阶段不自研热点爬虫，直接使用 `aihot.virxact.com` 的公开匿名 API 作为热点来源。对应 Skill 文档已保存到 `docs/aihot_SKILL.md`。

这样做的原因：

- 先验证 HotAgent 的核心价值：热点感知、热度分层、生命周期分析、策略生成、人机确认。
- 避免 MVP 被爬虫稳定性、反爬、数据清洗成本拖慢。
- 保持数据源层可插拔，后续可以把 AI HOT 换成抖音、巨量、本地业务库或多源融合。

### 6.2 产品口径调整

原始方向是“抖音热点运营平台”。MVP 阶段建议改成：

**AI 行业热点运营 Agent 工作台**

演示时的解释口径：

> HotAgent 的核心不是某一个数据源，而是一套热点运营 SOP 的 Agent 化抽象。MVP 用 AI HOT 公开数据验证流程；真实业务中，感知 Agent 可以替换为抖音热榜、企业内部数据或竞品监控源。

### 6.3 AI HOT → HotEvent 字段映射

| AI HOT 字段 | HotEvent 字段 | 说明 |
| :--- | :--- | :--- |
| `id` | `id` | 保持原始 cuid 字符串 |
| `title` | `title` | 使用中文标题 |
| `summary` | `summary` | 作为事件摘要 |
| `source` | `rawData.sourceName` / `tags` | 保留来源名 |
| `url` | `rawData.url` | 原文链接 |
| `publishedAt` | `createdAt` | 发布时间 |
| `category` | `eventType` / `tags` | 映射为模型、产品、行业、论文、观点等类型 |
| 无 | `heatScore` | 由 HotAgent 规则计算 |
| 无 | `heatLevel` | 根据分数映射 S/A/B |
| 无 | `lifecycleStage` | 根据发布时间和热度判断 |
| 无 | `riskLevel` | MVP 先用规则判断，默认低风险 |

### 6.4 热度分计算规则（MVP）

由于 AI HOT API 不提供浏览量、点赞、评论等互动指标，MVP 使用代理热度算法：

- 精选池条目有基础加权。
- 发布时间越近，分数越高。
- `ai-models`、`ai-products`、`industry` 权重高于普通观点条目。
- 标题或摘要命中 OpenAI、Anthropic、Google、GPT、Sora、Claude、Agent、融资、发布等关键词时加权。
- 有摘要、原文链接、明确来源时增加可信度分。

分级规则：

- `S`：`heatScore >= 85`，需要优先运营介入。
- `A`：`70 <= heatScore < 85`，建议进入策略生成。
- `B`：`heatScore < 70`，观察或低成本跟进。

### 6.5 当前实现范围

第一版实现：

- `src/lib/aihot.ts`：封装 AI HOT API，统一携带浏览器 User-Agent。
- `src/lib/hot-events.ts`：归一化 `HotEvent`、计算热度分、生成策略建议。
- `src/app/api/hot-events/route.ts`：提供统一热点接口。
- `src/app/page.tsx`：首页读取真实热点数据并展示指标、事件池、策略卡片、Agent DAG。

暂不实现：

- 数据库存储。
- 真实抖音数据接入。
- LangGraph 真实 DAG 执行器。
- 创作者真实撮合 API。

---

## 七、岗位 JD 对齐版 Demo 目标

### 7.1 JD 关键词拆解

| JD 要求 | Demo 必须展示的能力 |
| :--- | :--- |
| 热点线索感知 → 事件挖掘 → 运营/管控 → 复盘 | 页面必须呈现一条完整事件生命周期，而不是资讯列表 |
| 事件看清楚 | 对每条热点展示热度分、分层原因、生命周期、风险、用户情绪和平台导向 |
| 运营动作线上化 | 把运营 SOP 拆成可配置节点：感知、挖掘、策略、管控、复盘 |
| 大模型重构运营工作流 | 用 LLM/规则生成选题、脚本、评论引导、风控提示和分发建议 |
| 通用解决方案 | 不绑定 AI HOT，保留数据源适配层，未来可替换成抖音热点 |
| 指标和 ROI | 展示发现效率、事件生成率、策略采纳率、内容召回、运营转化 ROI |

### 7.2 Demo 页面应回答的问题

面试官看到页面时，需要立刻理解：

1. 这个热点为什么热？
2. 当前处于什么生命周期，应该现在跟还是先观察？
3. 运营要做什么动作，谁来确认，哪里需要风控？
4. 平台如何衡量这套 Agent 工作流是否提升了 ROI？
5. 如果换一个热点源，这套模型是否还能复用？

### 7.3 新增核心模块

- **热度解释器**：把 `heatScore` 拆成来源权重、时效权重、关键词权重、可信度权重。
- **事件挖掘卡**：总结事件类型、用户情绪、平台导向、运营目标。
- **SOP 编排卡**：展示每个节点输入、Agent 动作、输出、状态。
- **内容策略生成器**：生成抖音标题、30 秒脚本、评论区引导、达人建议、风险提示。
- **ROI 估算卡**：展示响应时长、人力节省、预估内容产出、召回效率、预估转化 uplift。

### 7.4 LLM 使用策略

`.env` 中已有 `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`LLM_MODEL` 等配置。MVP 中：

- 优先使用 DeepSeek/OpenAI-compatible Chat Completions 生成运营方案。
- LLM 失败、超时或未配置时，使用规则模板兜底。
- 页面不暴露 Key、端点和调用日志，只展示运营可理解的结果。

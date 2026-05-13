import type { RiskLevel } from "@/lib/hot-events";

const riskConfig: Record<
  RiskLevel,
  { color: string; bg: string; label: string; desc: string }
> = {
  low: {
    color: "bg-green-400",
    bg: "bg-green-50",
    label: "低风险",
    desc: "内容安全可控，可进入常规运营流程",
  },
  medium: {
    color: "bg-yellow-400",
    bg: "bg-yellow-50",
    label: "中风险",
    desc: "需注意事实与观点分离，避免过度解读",
  },
  high: {
    color: "bg-red-500",
    bg: "bg-red-50",
    label: "高风险",
    desc: "执行前必须人工复核来源和敏感表述",
  },
};

export function RiskBlock({
  level,
  className = "",
}: {
  level: RiskLevel;
  className?: string;
}) {
  const config = riskConfig[level];

  return (
    <div className={`rounded-lg ${config.bg} border border-[#e8e5dd] p-4 ${className}`}>
      <p className="text-xs font-semibold text-[#666] mb-2">风险等级</p>
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-lg ${config.color} shadow-sm`} />
        <div>
          <p className="font-semibold text-lg">{config.label}</p>
          <p className="text-xs text-[#666]">{config.desc}</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const routeLabels: Record<string, string> = {
  "/": "工作台",
  "/events": "事件详情",
  "/workflow": "Agent 编排",
  "/review": "复盘指标",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // 构建面包屑路径
  const crumbs = [
    { href: "/", label: "工作台" },
    ...segments.map((_, i) => {
      const href = "/" + segments.slice(0, i + 1).join("/");
      const label = routeLabels[href] ?? segments[i];
      return { href, label };
    }),
  ];

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-xs">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3 text-[#ccc]" />}
          {i === crumbs.length - 1 ? (
            <span className="text-[#999] font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-[#3b82f6] hover:underline font-medium"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

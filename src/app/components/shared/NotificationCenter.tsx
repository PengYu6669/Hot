"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, CheckCircle2, Info, Clock } from "lucide-react";

type Notification = {
  id: string;
  type: "alert" | "success" | "info" | "warning";
  title: string;
  body: string;
  time: string;
  read: boolean;
};

// 静态演示通知
const demoNotifications: Notification[] = [
  {
    id: "n1",
    type: "alert",
    title: "P0 事件到达",
    body: "SANA-WM 模型发布事件热度 97，建议立即介入",
    time: "2 分钟前",
    read: false,
  },
  {
    id: "n2",
    type: "success",
    title: "Agent 分析完成",
    body: "事件「GPT-5 技术报告」已完成策略生成，等待确认",
    time: "8 分钟前",
    read: false,
  },
  {
    id: "n3",
    type: "warning",
    title: "SLA 预警",
    body: "事件「AI 监管新规」已等待确认 8 分钟，剩余 2 分钟",
    time: "15 分钟前",
    read: true,
  },
  {
    id: "n4",
    type: "info",
    title: "复盘建议",
    body: "发现 1 条策略调优建议：萌芽期确认率偏低",
    time: "1 小时前",
    read: true,
  },
];

const typeIcons: Record<string, React.ReactNode> = {
  alert: <AlertTriangle className="size-4 text-red-500" />,
  success: <CheckCircle2 className="size-4 text-green-500" />,
  info: <Info className="size-4 text-blue-500" />,
  warning: <Clock className="size-4 text-yellow-500" />,
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications] = useState(demoNotifications);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative rounded-lg p-2 hover:bg-[#f2f0ea] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Bell className="size-5 text-[#555]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#dcd8cf] bg-white shadow-xl z-50 overflow-hidden"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center justify-between border-b border-[#e8e5dd] px-4 py-3">
              <span className="font-semibold text-sm text-[#111]">通知中心</span>
              <span className="text-[10px] text-[#999]">{unreadCount} 条未读</span>
            </div>

            <div className="max-h-[320px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-b border-[#f2f0ea] hover:bg-[#fbfaf7] transition-colors ${
                      n.read ? "opacity-60" : ""
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">{typeIcons[n.type]}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#111]">{n.title}</p>
                      <p className="text-xs text-[#666] mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-[#999] mt-1">{n.time}</p>
                    </div>
                    {!n.read && (
                      <span className="shrink-0 size-2 rounded-full bg-blue-500 mt-1.5" />
                    )}
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-[#999]">
                  暂无通知
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

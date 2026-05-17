"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GripVertical, ChevronLeft, ChevronRight } from "lucide-react";

export type ShotCard = {
  id: string;
  time: string;
  duration: string;
  visual: string;
  subtitle: string;
  bgm: string;
  camera: string;
};

type StoryboardTimelineProps = {
  shots: ShotCard[];
  totalDuration: string;
  completionRate?: string;
  onAIOptimize?: () => void;
};

export function StoryboardTimeline({
  shots,
  totalDuration,
  completionRate,
  onAIOptimize,
}: StoryboardTimelineProps) {
  const [scrollIndex, setScrollIndex] = useState(0);
  const visibleCount = 4;
  const maxScroll = Math.max(0, shots.length - visibleCount);

  const handleScrollLeft = () => setScrollIndex(Math.max(0, scrollIndex - 1));
  const handleScrollRight = () =>
    setScrollIndex(Math.min(maxScroll, scrollIndex + 1));

  const visibleShots = shots.slice(scrollIndex, scrollIndex + visibleCount);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase text-[#707070]">
            分镜时间轴
          </p>
          <p className="text-xs text-[#999]">横向滚动查看全部 {shots.length} 个分镜</p>
        </div>
        <span className="text-xs text-[#666] font-semibold">
          总时长 {totalDuration} · 完播率预估 {completionRate ?? "--"}
        </span>
      </div>

      {/* Scrollable timeline */}
      <div className="relative">
        {/* Scroll buttons */}
        {scrollIndex > 0 && (
          <button
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 size-7 rounded-full bg-white border border-[#dcd8cf] shadow flex items-center justify-center hover:bg-[#f7f7f4]"
            onClick={handleScrollLeft}
          >
            <ChevronLeft className="size-3.5" />
          </button>
        )}
        {scrollIndex < maxScroll && (
          <button
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 size-7 rounded-full bg-white border border-[#dcd8cf] shadow flex items-center justify-center hover:bg-[#f7f7f4]"
            onClick={handleScrollRight}
          >
            <ChevronRight className="size-3.5" />
          </button>
        )}

        {/* Shot cards */}
        <div className="flex gap-3 overflow-hidden px-1">
          {visibleShots.map((shot, i) => (
            <motion.div
              key={shot.id}
              className="shrink-0 w-[140px] rounded-lg border border-[#e8e5dd] bg-white p-3 shadow-sm hover:border-[#bbb] hover:shadow transition-all cursor-grab active:cursor-grabbing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {/* Drag handle + time */}
              <div className="flex items-center gap-1 mb-2">
                <GripVertical className="size-3 text-[#ccc]" />
                <span className="text-[10px] font-bold text-[#666]">
                  {shot.time}
                </span>
                <span className="text-[10px] text-[#999] ml-auto">
                  {shot.duration}
                </span>
              </div>

              {/* Visual description */}
              <div className="space-y-1.5">
                <div>
                  <p className="text-[10px] text-[#999]">画面</p>
                  <p className="text-xs leading-4 text-[#333] line-clamp-2">
                    {shot.visual}
                  </p>
                </div>

                {/* Subtitle */}
                <div className="rounded bg-yellow-50 px-2 py-1">
                  <p className="text-[10px] text-[#999]">字幕</p>
                  <p className="text-xs leading-4 text-[#333] line-clamp-2">
                    {shot.subtitle}
                  </p>
                </div>

                {/* BGM + Camera */}
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="rounded-full bg-purple-50 text-purple-600 px-1.5 py-0.5">
                    {shot.bgm}
                  </span>
                  <span className="text-[#999] truncate">{shot.camera}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI optimize button */}
      {onAIOptimize && (
        <div className="flex justify-end">
          <button
            className="rounded-lg border border-[#3b82f6] bg-white px-3 py-1.5 text-xs font-semibold text-[#3b82f6] hover:bg-blue-50 transition-colors"
            onClick={onAIOptimize}
          >
            AI 优化
          </button>
        </div>
      )}
    </div>
  );
}

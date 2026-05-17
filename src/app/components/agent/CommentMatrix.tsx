"use client";

import { useState } from "react";

export type UserSegment = {
  id: string;
  label: string;
  replies: string[];
};

export type PinnedComment = {
  id: string;
  text: string;
  expectedEffect: string;
};

type CommentMatrixProps = {
  pinnedComments: PinnedComment[];
  segments: UserSegment[];
  crisisTemplates: string[];
  sensitiveKeywords: string[];
};

export function CommentMatrix({
  pinnedComments,
  segments,
  crisisTemplates,
  sensitiveKeywords,
}: CommentMatrixProps) {
  const [activeSegment, setActiveSegment] = useState(segments[0]?.id ?? "");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase text-[#707070]">
          评论区运营
        </p>
        <p className="text-xs text-[#999]">置顶评论 + 分层话术 + 舆情防火墙</p>
      </div>

      {/* Pinned comments */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-[#999] uppercase">置顶评论</p>
        {pinnedComments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-lg border border-[#e8e5dd] bg-[#fbfaf7] p-3"
          >
            <p className="text-sm text-[#333] leading-5">{comment.text}</p>
            <p className="mt-1 text-[10px] text-green-600">
              预期效果：{comment.expectedEffect}
            </p>
          </div>
        ))}
      </div>

      {/* Segmented replies */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-[#999] uppercase">
          分层引导话术
        </p>

        {/* Segment tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {segments.map((seg) => (
            <button
              key={seg.id}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                activeSegment === seg.id
                  ? "border-[#111] bg-[#111] text-white"
                  : "border-[#dcd8cf] bg-white hover:border-[#999]"
              }`}
              onClick={() => setActiveSegment(seg.id)}
            >
              {seg.label}
            </button>
          ))}
        </div>

        {/* Replies for active segment */}
        {segments
          .filter((s) => s.id === activeSegment)
          .map((seg) => (
            <div key={seg.id} className="space-y-1.5">
              {seg.replies.map((reply, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[#e8e5dd] bg-white p-2.5 text-sm leading-5 text-[#333]"
                >
                  {reply}
                </div>
              ))}
            </div>
          ))}
      </div>

      {/* Crisis firewall */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-[#999] uppercase">
          舆情防火墙
        </p>

        {/* Sensitive keywords */}
        <div className="flex flex-wrap gap-1">
          {sensitiveKeywords.map((kw) => (
            <span
              key={kw}
              className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] text-red-600 font-semibold"
            >
              {kw}
            </span>
          ))}
        </div>

        {/* Crisis reply templates */}
        <div className="space-y-1.5">
          {crisisTemplates.map((template, i) => (
            <div
              key={i}
              className="rounded-lg border border-red-200 bg-red-50/50 p-2.5 text-sm leading-5 text-[#555]"
            >
              {template}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

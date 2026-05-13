"use client";

import { motion } from "framer-motion";

export function ThinkingAnimation({
  label = "Agent 正在分析",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="relative size-14 shrink-0">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#f0a060]"
          animate={{ scale: [1, 1.6, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-[#f0a060]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
        />
        <div className="absolute inset-3 rounded-full bg-[#f0a060]/20 flex items-center justify-center">
          <span className="text-lg">🔍</span>
        </div>
      </div>
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <motion.div
          className="mt-1 flex gap-1"
          initial="start"
          animate="end"
          variants={{
            start: {},
            end: { transition: { staggerChildren: 0.25, repeat: Infinity } },
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="inline-block size-2 rounded-full bg-[#f0a060]"
              variants={{
                start: { opacity: 0.3, scale: 0.8 },
                end: { opacity: 1, scale: 1 },
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function StaggerList({
  children,
  staggerMs = 80,
  className = "",
}: {
  children: ReactNode[];
  staggerMs?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {(Array.isArray(children) ? children : [children]).map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * (staggerMs / 1000), duration: 0.35 }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

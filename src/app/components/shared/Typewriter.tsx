"use client";

import { useEffect, useEffectEvent, useState } from "react";

export function Typewriter({
  text,
  speed = 30,
  onComplete,
  className = "",
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const handleComplete = useEffectEvent(() => {
    onComplete?.();
  });

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setDisplayed("");
      setDone(false);
    }, 0);

    if (!text) {
      const doneTimer = window.setTimeout(() => {
        setDone(true);
        handleComplete();
      }, 0);
      return () => {
        window.clearTimeout(resetTimer);
        window.clearTimeout(doneTimer);
      };
    }

    let i = 0;
    const timer = window.setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(timer);
        setDone(true);
        handleComplete();
      }
    }, speed);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearInterval(timer);
    };
  }, [text, speed]);

  return (
    <span className={className}>
      {displayed}
      {!done && (
        <span className="inline-block w-[2px] h-[1em] bg-current animate-pulse ml-0.5 align-middle" />
      )}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestTimerProps {
  remainingSec: number;
  onExpire: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function TestTimer({ remainingSec: initialRemaining, onExpire }: TestTimerProps) {
  const [remaining, setRemaining] = useState(initialRemaining);
  const isWarning = remaining <= 120;

  useEffect(() => {
    setRemaining(initialRemaining);
  }, [initialRemaining]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining, onExpire]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-4 py-2 font-mono text-lg font-bold",
        isWarning ? "timer-warning bg-danger/10" : "bg-primary/15 text-primary-hover"
      )}
    >
      <Clock className="h-5 w-5" />
      {formatTime(remaining)}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Clock, Loader2, Flame } from "lucide-react";

interface SetupFormProps {
  subject: string;
  subjectName: string;
  maxQuestions: number;
  hardCount: number;
  totalCount: number;
}

export function SetupForm({
  subject,
  subjectName,
  maxQuestions,
  hardCount,
  totalCount,
}: SetupFormProps) {
  const router = useRouter();
  const [count, setCount] = useState(Math.min(20, maxQuestions));
  const [loading, setLoading] = useState(false);

  const timeMinutes = count;

  async function startTest() {
    setLoading(true);
    try {
      const res = await fetch("/api/tests/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, questionCount: count }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to start test");
        return;
      }

      if (data.warning) {
        toast.warning(data.warning);
      }

      router.push(`/test/${data.sessionId}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-lg mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{subjectName}</h1>
        <p className="mt-2 text-muted">Configure your mock test</p>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
        <Flame className="h-4 w-4 shrink-0" />
        <span>
          Tests use the <strong>hardest</strong> questions available (
          {hardCount.toLocaleString()} hard / {totalCount.toLocaleString()} total
          in bank)
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="font-medium">Number of questions</label>
          <span className="text-2xl font-bold text-primary">{count}</span>
        </div>
        <input
          type="range"
          min={5}
          max={maxQuestions}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-primary h-2 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted">
          <span>5</span>
          <span>{maxQuestions}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-3">
        <Clock className="h-5 w-5 text-primary" />
        <span className="font-medium">
          Time limit: <strong>{timeMinutes} minute{timeMinutes !== 1 ? "s" : ""}</strong>{" "}
          (1 min × {count} questions)
        </span>
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={startTest}
        disabled={loading || totalCount < 5}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Preparing hardest questions...
          </>
        ) : totalCount < 5 ? (
          "Question bank not seeded — run npm run db:seed"
        ) : (
          "Start Test"
        )}
      </Button>
    </Card>
  );
}

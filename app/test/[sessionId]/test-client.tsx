"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QuestionCard } from "@/components/question-card";
import { TestTimer } from "@/components/test-timer";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Flag, Loader2 } from "lucide-react";

interface TestQuestion {
  id: string;
  orderIndex: number;
  questionText: string;
  options: { a: string; b: string; c: string; d: string };
  difficulty?: string;
}

interface TestData {
  sessionId: string;
  subject: string;
  subjectName: string;
  questionCount: number;
  remainingSec: number;
  questions: TestQuestion[];
}

export function TestClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tests/${sessionId}`);
        const data = await res.json();

        if (!res.ok) {
          if (data.expired) {
            await submitTest(true);
            return;
          }
          toast.error(data.error ?? "Failed to load test");
          router.push("/");
          return;
        }

        setTest(data);
        const initial: Record<string, string | null> = {};
        data.questions.forEach((q: TestQuestion) => {
          initial[q.id] = null;
        });
        setAnswers(initial);
      } catch {
        toast.error("Failed to load test");
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const submitTest = useCallback(
    async (autoSubmitted = false) => {
      if (submitting || !test) return;
      setSubmitting(true);

      try {
        const answerList = test.questions.map((q) => ({
          questionId: q.id,
          selectedAnswer: answers[q.id] ?? null,
        }));

        const res = await fetch(`/api/tests/${sessionId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: answerList, autoSubmitted }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? "Submission failed");
          setSubmitting(false);
          return;
        }

        if (autoSubmitted) {
          toast.info("Time's up! Test auto-submitted.");
        }

        router.push(`/results/${sessionId}`);
      } catch {
        toast.error("Submission failed");
        setSubmitting(false);
      }
    },
    [answers, sessionId, submitting, test, router]
  );

  const handleExpire = useCallback(() => {
    submitTest(true);
  }, [submitTest]);

  if (loading || !test) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentQuestion = test.questions[currentIndex];
  const answeredCount = Object.values(answers).filter((a) => a !== null).length;

  return (
    <div className="space-y-6">
      <div className="sticky top-[73px] z-40 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card/95 p-4 backdrop-blur-md">
        <div>
          <p className="text-sm font-medium uppercase text-muted">
            {test.subjectName}
          </p>
          <p className="text-xs text-muted">
            {answeredCount}/{test.questionCount} answered
          </p>
        </div>
        <TestTimer remainingSec={test.remainingSec} onExpire={handleExpire} />
        <Button
          variant="danger"
          size="sm"
          onClick={() => setShowConfirm(true)}
          disabled={submitting}
        >
          <Flag className="h-4 w-4" />
          Finish
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {test.questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className={`h-10 w-10 rounded-lg text-sm font-medium transition-all ${
              i === currentIndex
                ? "bg-primary text-white"
                : answers[q.id]
                  ? "bg-success/20 text-success"
                  : "bg-card border border-border text-muted hover:border-primary/50"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <Card>
        <QuestionCard
          index={currentIndex}
          total={test.questionCount}
          questionText={currentQuestion.questionText}
          options={currentQuestion.options}
          selectedAnswer={answers[currentQuestion.id]}
          onSelect={(ans) =>
            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: ans }))
          }
          difficulty={currentQuestion.difficulty}
        />
      </Card>

      <div className="flex justify-between gap-4">
        <Button
          variant="secondary"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        {currentIndex < test.questionCount - 1 ? (
          <Button onClick={() => setCurrentIndex((i) => i + 1)}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setShowConfirm(true)} disabled={submitting}>
            Submit Test
          </Button>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold">Finish test?</h3>
            <p className="text-sm text-muted">
              You&apos;ve answered {answeredCount} of {test.questionCount} questions.
              {answeredCount < test.questionCount &&
                " Unanswered questions will be marked incorrect."}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                Continue
              </Button>
              <Button
                className="flex-1"
                onClick={() => submitTest(false)}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScoreDisplay } from "@/components/score-display";
import { QuestionCard } from "@/components/question-card";
import { Loader2, Home, RotateCcw } from "lucide-react";

interface ResultQuestion {
  orderIndex: number;
  questionId: string;
  questionText: string;
  options: { a: string; b: string; c: string; d: string };
  correctAnswer: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  difficulty: string;
}

interface ResultsData {
  sessionId: string;
  subject: string;
  subjectName: string;
  questionCount: number;
  score: number;
  totalMarks: number;
  percentage: number;
  autoSubmitted: boolean;
  questions: ResultQuestion[];
}

export function ResultsClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/tests/${sessionId}/results`);
      const data = await res.json();
      if (!res.ok) {
        router.push("/");
        return;
      }
      setResults(data);
      setLoading(false);
    }
    load();
  }, [sessionId, router]);

  if (loading || !results) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="text-center space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted">
            {results.subjectName}
          </p>
          <h1 className="mt-2 text-3xl font-bold">Test Complete</h1>
          {results.autoSubmitted && (
            <p className="mt-2 text-sm text-danger">Auto-submitted — time expired</p>
          )}
        </div>

        <ScoreDisplay
          score={results.score}
          total={results.totalMarks}
          percentage={results.percentage}
        />

        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/subjects/${results.subject}/setup`}>
            <Button>
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">
              <Home className="h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>
      </Card>

      <div className="text-center">
        <Button variant="ghost" onClick={() => setShowReview((s) => !s)}>
          {showReview ? "Hide" : "Show"} answer review
        </Button>
      </div>

      {showReview && (
        <div className="space-y-6">
          {results.questions.map((q, i) => (
            <Card key={q.questionId}>
              <div className="mb-4 flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    q.isCorrect
                      ? "bg-success/15 text-success"
                      : "bg-danger/15 text-danger"
                  }`}
                >
                  {q.isCorrect ? "Correct" : "Incorrect"}
                </span>
              </div>
              <QuestionCard
                index={i}
                total={results.questionCount}
                questionText={q.questionText}
                options={q.options}
                selectedAnswer={q.selectedAnswer}
                onSelect={() => {}}
                difficulty={q.difficulty}
                reviewMode
                correctAnswer={q.correctAnswer}
                showResult
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

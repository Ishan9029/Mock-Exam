"use client";

import { MarkdownContent } from "@/components/markdown-content";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  index: number;
  total: number;
  questionText: string;
  options: { a: string; b: string; c: string; d: string };
  selectedAnswer: string | null;
  onSelect: (answer: string) => void;
  difficulty?: string;
  reviewMode?: boolean;
  correctAnswer?: string;
  showResult?: boolean;
}

const optionLabels = ["a", "b", "c", "d"] as const;

export function QuestionCard({
  index,
  total,
  questionText,
  options,
  selectedAnswer,
  onSelect,
  difficulty,
  reviewMode = false,
  correctAnswer,
  showResult = false,
}: QuestionCardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-muted">
          Question {index + 1} of {total}
        </span>
        {difficulty && (
          <span className="rounded-full bg-danger/15 px-3 py-1 text-xs font-semibold uppercase text-danger">
            {difficulty}
          </span>
        )}
      </div>

      <div className="text-lg leading-relaxed">
        <MarkdownContent content={questionText} />
      </div>

      <div className="space-y-3">
        {optionLabels.map((key) => {
          const isSelected = selectedAnswer === key;
          const isCorrect = showResult && correctAnswer === key;
          const isWrong = showResult && isSelected && correctAnswer !== key;

          return (
            <button
              key={key}
              type="button"
              disabled={reviewMode}
              onClick={() => onSelect(key)}
              className={cn(
                "flex w-full items-start gap-4 rounded-xl border border-border p-4 text-left transition-all",
                !reviewMode && "hover:border-primary/50 hover:bg-card-hover cursor-pointer",
                isSelected && !showResult && "option-selected",
                isCorrect && "option-correct",
                isWrong && "option-wrong"
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-sm font-bold uppercase">
                {key}
              </span>
              <div className="flex-1 pt-0.5">
                <MarkdownContent content={options[key]} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

interface ScoreDisplayProps {
  score: number;
  total: number;
  percentage: number;
}

export function ScoreDisplay({ score, total, percentage }: ScoreDisplayProps) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-border"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              "transition-all duration-1000",
              percentage >= 70 ? "text-success" : percentage >= 40 ? "text-primary" : "text-danger"
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{percentage}%</span>
          <span className="text-sm text-muted">Score</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold">
          {score} <span className="text-muted font-normal">/ {total}</span>
        </p>
        <p className="mt-1 text-sm text-muted">marks (1 point each, no negative marking)</p>
      </div>
    </div>
  );
}

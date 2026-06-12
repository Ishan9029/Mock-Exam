export type DifficultyLabel = "hard" | "medium" | "easy";

export const DIFFICULTY_SCORES: Record<DifficultyLabel, number> = {
  hard: 3,
  medium: 2,
  easy: 1,
};

export function normalizeDifficulty(
  raw?: string | null,
  fallback: DifficultyLabel = "hard"
): { label: DifficultyLabel; score: number } {
  if (!raw) {
    return { label: fallback, score: DIFFICULTY_SCORES[fallback] };
  }

  const value = raw.toLowerCase().trim();

  if (
    value.includes("hard") ||
    value.includes("difficult") ||
    value.includes("advanced") ||
    value.includes("tough")
  ) {
    return { label: "hard", score: 3 };
  }

  if (value.includes("easy") || value.includes("simple")) {
    return { label: "easy", score: 1 };
  }

  if (value.includes("medium") || value.includes("moderate")) {
    return { label: "medium", score: 2 };
  }

  return { label: fallback, score: DIFFICULTY_SCORES[fallback] };
}

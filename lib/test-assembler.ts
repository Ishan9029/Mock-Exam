import { prisma } from "@/lib/prisma";
import type { SubjectId } from "@/lib/subjects";

const EXPOSURE_WINDOW = 5;

interface AssembleTestInput {
  userId: string;
  subject: SubjectId;
  questionCount: number;
}

interface AssembleTestResult {
  sessionId: string;
  timeLimitSec: number;
  warning?: string;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function getExcludedQuestionIds(
  userId: string,
  subject: string,
  windowSize: number
): Promise<string[]> {
  const recentSessions = await prisma.testSession.findMany({
    where: {
      userId,
      subject,
      isSubmitted: true,
    },
    orderBy: { endedAt: "desc" },
    take: windowSize,
    select: { id: true },
  });

  if (recentSessions.length === 0) return [];

  const sessionIds = recentSessions.map((s) => s.id);

  const used = await prisma.testSessionQuestion.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { questionId: true },
  });

  return [...new Set(used.map((u) => u.questionId))];
}

async function fetchPool(
  subject: string,
  difficultyScore: number,
  excludedIds: string[],
  examFilter?: string
): Promise<string[]> {
  const rows = await prisma.question.findMany({
    where: {
      subject,
      difficultyScore,
      ...(examFilter ? { exam: examFilter } : {}),
      ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
    },
    select: { id: true },
  });
  return rows.map((q) => q.id);
}

async function selectHardestQuestions(
  subject: string,
  count: number,
  excludedIds: string[]
): Promise<{ questions: { id: string }[]; warning?: string }> {
  const selected: string[] = [];
  let warning: string | undefined;

  // English: prioritize Gaokao sources first
  if (subject === "english") {
    const gaokaoHard = shuffle(await fetchPool(subject, 3, excludedIds, "gaokao"));
    selected.push(...gaokaoHard.slice(0, count));

    if (selected.length < count) {
      const otherHard = shuffle(
        await fetchPool(subject, 3, [...excludedIds, ...selected])
      );
      selected.push(...otherHard.slice(0, count - selected.length));
    }
  } else {
    const hardPool = shuffle(await fetchPool(subject, 3, excludedIds));
    selected.push(...hardPool.slice(0, count));
  }

  if (selected.length < count) {
    const mediumPool = shuffle(
      await fetchPool(subject, 2, [...excludedIds, ...selected])
    );
    selected.push(...mediumPool.slice(0, count - selected.length));
    warning = "Some medium-difficulty questions included — hard pool partially exhausted.";
  }

  if (selected.length < count) {
    const easyPool = shuffle(
      await fetchPool(subject, 1, [...excludedIds, ...selected])
    );
    selected.push(...easyPool.slice(0, count - selected.length));
    warning = "Question pool is limited for this subject — mixed difficulty used.";
  }

  if (selected.length < count) {
    const fallback = await prisma.question.findMany({
      where: {
        subject,
        id: { notIn: [...excludedIds, ...selected] },
      },
      orderBy: [{ difficultyScore: "desc" }],
      take: count - selected.length,
      select: { id: true },
    });
    selected.push(...fallback.map((q) => q.id));
    warning =
      "Limited question bank — some previously seen questions may appear.";
  }

  return {
    questions: shuffle(selected.slice(0, count)).map((id) => ({ id })),
    warning,
  };
}

export async function assembleTest(
  input: AssembleTestInput
): Promise<AssembleTestResult> {
  const { userId, subject, questionCount } = input;

  let excludedIds = await getExcludedQuestionIds(
    userId,
    subject,
    EXPOSURE_WINDOW
  );

  let { questions, warning } = await selectHardestQuestions(
    subject,
    questionCount,
    excludedIds
  );

  if (questions.length < questionCount) {
    excludedIds = await getExcludedQuestionIds(
      userId,
      subject,
      Math.max(1, EXPOSURE_WINDOW - 2)
    );
    const retry = await selectHardestQuestions(
      subject,
      questionCount,
      excludedIds
    );
    questions = retry.questions;
    warning = retry.warning ?? warning;
  }

  if (questions.length < questionCount) {
    throw new Error(
      `Not enough questions available. Found ${questions.length}, need ${questionCount}. Run npm run db:seed first.`
    );
  }

  const timeLimitSec = questionCount * 60;

  const session = await prisma.testSession.create({
    data: {
      userId,
      exam: "mixed",
      subject,
      questionCount,
      timeLimitSec,
      questions: {
        create: questions.map((q, index) => ({
          questionId: q.id,
          orderIndex: index,
        })),
      },
    },
  });

  return {
    sessionId: session.id,
    timeLimitSec,
    warning,
  };
}

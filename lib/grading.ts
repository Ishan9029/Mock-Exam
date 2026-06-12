import { prisma } from "@/lib/prisma";
import { getSubjectDisplayName } from "@/lib/subjects";

interface AnswerInput {
  questionId: string;
  selectedAnswer: string | null;
}

export async function gradeAndSubmitTest(
  sessionId: string,
  userId: string,
  answers: AnswerInput[],
  autoSubmitted = false
) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: {
      questions: {
        include: { question: true },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!session) {
    throw new Error("Test session not found.");
  }

  if (session.userId !== userId) {
    throw new Error("Unauthorized.");
  }

  if (session.isSubmitted) {
    return getResults(sessionId, userId);
  }

  const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedAnswer]));
  let score = 0;

  const gradedAnswers = session.questions.map(({ question }) => {
    const selected = answerMap.get(question.id) ?? null;
    const isCorrect =
      selected !== null &&
      selected.toLowerCase() === question.correctAnswer.toLowerCase();
    if (isCorrect) score += 1;

    return {
      sessionId,
      questionId: question.id,
      selectedAnswer: selected,
      isCorrect,
    };
  });

  await prisma.$transaction([
    ...gradedAnswers.map((a) =>
      prisma.testAnswer.upsert({
        where: {
          sessionId_questionId: {
            sessionId: a.sessionId,
            questionId: a.questionId,
          },
        },
        create: a,
        update: {
          selectedAnswer: a.selectedAnswer,
          isCorrect: a.isCorrect,
        },
      })
    ),
    prisma.testSession.update({
      where: { id: sessionId },
      data: {
        score,
        isSubmitted: true,
        endedAt: new Date(),
      },
    }),
  ]);

  return getResults(sessionId, userId, autoSubmitted);
}

export async function getResults(
  sessionId: string,
  userId: string,
  autoSubmitted = false
) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: {
      answers: {
        include: { question: true },
      },
      questions: {
        include: { question: true },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!session || session.userId !== userId) {
    throw new Error("Results not found.");
  }

  const answerMap = new Map(
    session.answers.map((a) => [a.questionId, a])
  );

  const questions = session.questions.map(({ question, orderIndex }) => {
    const answer = answerMap.get(question.id);
    return {
      orderIndex,
      questionId: question.id,
      questionText: question.questionText,
      options: {
        a: question.optionA,
        b: question.optionB,
        c: question.optionC,
        d: question.optionD,
      },
      correctAnswer: question.correctAnswer,
      selectedAnswer: answer?.selectedAnswer ?? null,
      isCorrect: answer?.isCorrect ?? false,
      explanation: question.explanation,
      difficulty: question.difficulty,
    };
  });

  return {
    sessionId: session.id,
    subject: session.subject,
    subjectName: getSubjectDisplayName(session.subject),
    questionCount: session.questionCount,
    score: session.score ?? 0,
    totalMarks: session.questionCount,
    percentage: session.score
      ? Math.round((session.score / session.questionCount) * 100)
      : 0,
    autoSubmitted,
    endedAt: session.endedAt,
    questions,
  };
}

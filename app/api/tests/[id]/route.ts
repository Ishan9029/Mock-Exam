import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubjectDisplayName } from "@/lib/subjects";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const testSession = await prisma.testSession.findUnique({
    where: { id },
    include: {
      questions: {
        include: { question: true },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!testSession || testSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Test not found." }, { status: 404 });
  }

  if (testSession.isSubmitted) {
    return NextResponse.json({ error: "Test already submitted." }, { status: 400 });
  }

  const elapsedSec = Math.floor(
    (Date.now() - testSession.startedAt.getTime()) / 1000
  );
  const remainingSec = Math.max(0, testSession.timeLimitSec - elapsedSec);

  if (remainingSec === 0) {
    return NextResponse.json({ error: "Time expired.", expired: true }, { status: 400 });
  }

  return NextResponse.json({
    sessionId: testSession.id,
    subject: testSession.subject,
    subjectName: getSubjectDisplayName(testSession.subject),
    questionCount: testSession.questionCount,
    timeLimitSec: testSession.timeLimitSec,
    startedAt: testSession.startedAt.toISOString(),
    remainingSec,
    questions: testSession.questions.map(({ question, orderIndex }) => ({
      id: question.id,
      orderIndex,
      questionText: question.questionText,
      options: {
        a: question.optionA,
        b: question.optionB,
        c: question.optionC,
        d: question.optionD,
      },
      difficulty: question.difficulty,
    })),
  });
}

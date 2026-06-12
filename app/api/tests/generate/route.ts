import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { assembleTest } from "@/lib/test-assembler";
import { getSubject, isValidSubject } from "@/lib/subjects";
import type { SubjectId } from "@/lib/subjects";

const generateSchema = z.object({
  subject: z.enum([
    "mathematics",
    "biology",
    "chemistry",
    "physics",
    "english",
    "general_knowledge",
    "vedic_maths",
  ]),
  questionCount: z.number().int().min(5).max(50),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { subject, questionCount } = parsed.data;

    if (!isValidSubject(subject)) {
      return NextResponse.json({ error: "Invalid subject." }, { status: 400 });
    }

    const subjectConfig = getSubject(subject)!;
    if (questionCount > subjectConfig.maxQuestions) {
      return NextResponse.json(
        {
          error: `Maximum ${subjectConfig.maxQuestions} questions allowed for ${subjectConfig.name}.`,
        },
        { status: 400 }
      );
    }

    const result = await assembleTest({
      userId: session.user.id,
      subject: subject as SubjectId,
      questionCount,
    });

    return NextResponse.json({
      sessionId: result.sessionId,
      timeLimitSec: result.timeLimitSec,
      warning: result.warning,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate test.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

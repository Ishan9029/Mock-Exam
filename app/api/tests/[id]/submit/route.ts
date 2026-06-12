import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { gradeAndSubmitTest } from "@/lib/grading";

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedAnswer: z.string().nullable(),
    })
  ),
  autoSubmitted: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
    }

    const results = await gradeAndSubmitTest(
      id,
      session.user.id,
      parsed.data.answers,
      parsed.data.autoSubmitted ?? false
    );

    return NextResponse.json(results);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Submission failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

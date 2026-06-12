import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidSubject } from "@/lib/subjects";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject");

  if (!subject || !isValidSubject(subject)) {
    return NextResponse.json({ error: "Valid subject required" }, { status: 400 });
  }

  const [total, hard] = await Promise.all([
    prisma.question.count({ where: { subject } }),
    prisma.question.count({
      where: { subject, difficultyScore: 3 },
    }),
  ]);

  return NextResponse.json({ total, hard });
}

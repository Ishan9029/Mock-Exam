import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubject, isValidSubject } from "@/lib/subjects";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "./setup-form";
import { ArrowLeft } from "lucide-react";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: subjectId } = await params;

  if (!isValidSubject(subjectId)) notFound();

  const subject = getSubject(subjectId)!;

  const [totalCount, hardCount] = await Promise.all([
    prisma.question.count({ where: { subject: subjectId } }),
    prisma.question.count({
      where: { subject: subjectId, difficultyScore: 3 },
    }),
  ]);

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to subjects
      </Link>

      <SetupForm
        subject={subjectId}
        subjectName={subject.name}
        maxQuestions={subject.maxQuestions}
        hardCount={hardCount}
        totalCount={totalCount}
      />
    </div>
  );
}

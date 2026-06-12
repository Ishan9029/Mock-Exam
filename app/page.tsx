import Link from "next/link";
import { auth } from "@/lib/auth";
import { SUBJECTS } from "@/lib/subjects";
import { SubjectCard } from "@/components/subject-card";
import { Button } from "@/components/ui/button";
import { Zap, Shield, Shuffle } from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="space-y-12">
      <section className="text-center space-y-6 py-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary-hover">
          <Zap className="h-4 w-4" />
          Hardest questions from the world&apos;s toughest exams
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Master{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Math, Physics, English &amp; more
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted">
          Pick a subject and start a timed mock test. Fresh, challenging
          questions every time. 1 minute per question. No negative marking.
        </p>
        {!session?.user && (
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/auth/register">
              <Button size="lg">Get started free</Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="secondary" size="lg">
                Log in
              </Button>
            </Link>
          </div>
        )}
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(SUBJECTS).map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Feature
          icon={Zap}
          title="Hardest questions"
          description="Every test pulls the toughest available questions for maximum challenge."
        />
        <Feature
          icon={Shuffle}
          title="Never repeat"
          description="Questions won't repeat across your last 5 tests for the same subject."
        />
        <Feature
          icon={Shield}
          title="Timed & fair"
          description="1 min per question. Auto-submit on timeout. 1 mark each, no negatives."
        />
      </section>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card p-5 text-center sm:text-left">
      <Icon className="mx-auto h-8 w-8 text-accent sm:mx-0" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

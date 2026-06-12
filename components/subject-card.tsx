import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { SubjectConfig } from "@/lib/subjects";
import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  ChevronRight,
  Dna,
  FlaskConical,
  Sigma,
} from "lucide-react";

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  mathematics: Sigma,
  biology: Dna,
  chemistry: FlaskConical,
  physics: Atom,
  english: BookOpen,
  general_knowledge: Brain,
  vedic_maths: Calculator,
};

const accents: Record<string, string> = {
  mathematics: "from-violet-500/20 to-purple-500/5 border-violet-500/30",
  biology: "from-emerald-500/20 to-teal-500/5 border-emerald-500/30",
  chemistry: "from-lime-500/20 to-green-500/5 border-lime-500/30",
  physics: "from-indigo-500/20 to-blue-500/5 border-indigo-500/30",
  english: "from-cyan-500/20 to-sky-500/5 border-cyan-500/30",
  general_knowledge: "from-amber-500/20 to-orange-500/5 border-amber-500/30",
  vedic_maths: "from-rose-500/20 to-pink-500/5 border-rose-500/30",
};

export function SubjectCard({ subject }: { subject: SubjectConfig }) {
  const Icon = icons[subject.id] ?? BookOpen;
  const accent = accents[subject.id] ?? accents.physics;

  return (
    <Link href={`/subjects/${subject.id}/setup`} className="group block">
      <Card
        className={`relative overflow-hidden bg-gradient-to-br ${accent} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10`}
      >
        <div className="flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
            <Icon className="h-7 w-7 text-primary-hover" />
          </div>
          <ChevronRight className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
        </div>
        <h2 className="mt-4 text-2xl font-bold">{subject.name}</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">{subject.description}</p>
        <div className="mt-4 inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary-hover">
          Hardest questions
        </div>
      </Card>
    </Link>
  );
}

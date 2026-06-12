export type SubjectId =
  | "mathematics"
  | "biology"
  | "chemistry"
  | "physics"
  | "english"
  | "general_knowledge"
  | "vedic_maths";

export interface SubjectConfig {
  id: SubjectId;
  name: string;
  description: string;
  maxQuestions: number;
}

export const SUBJECTS: Record<SubjectId, SubjectConfig> = {
  mathematics: {
    id: "mathematics",
    name: "Math",
    description: "Advanced mathematics from the world's toughest entrance exams",
    maxQuestions: 50,
  },
  biology: {
    id: "biology",
    name: "Bio",
    description: "Biology MCQs drawn from elite medical entrance question banks",
    maxQuestions: 50,
  },
  chemistry: {
    id: "chemistry",
    name: "Chemistry",
    description: "Chemistry MCQs from top engineering and medical entrance exams",
    maxQuestions: 50,
  },
  physics: {
    id: "physics",
    name: "Physics",
    description: "Physics problems merged from top engineering and medical exams",
    maxQuestions: 50,
  },
  english: {
    id: "english",
    name: "English",
    description: "English comprehension and grammar from Gaokao-level papers",
    maxQuestions: 30,
  },
  general_knowledge: {
    id: "general_knowledge",
    name: "General Knowledge",
    description: "Challenging trivia and knowledge questions from competitive sources",
    maxQuestions: 50,
  },
  vedic_maths: {
    id: "vedic_maths",
    name: "Vedic Maths",
    description: "Mental math and rapid calculation problems",
    maxQuestions: 50,
  },
};

export const SUBJECT_IDS = Object.keys(SUBJECTS) as SubjectId[];

export function getSubject(id: string): SubjectConfig | null {
  return SUBJECTS[id as SubjectId] ?? null;
}

export function isValidSubject(id: string): id is SubjectId {
  return id in SUBJECTS;
}

export function getSubjectDisplayName(id: string): string {
  return getSubject(id)?.name ?? id;
}

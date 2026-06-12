/**
 * Seeds the question bank from open HuggingFace / GitHub datasets.
 * Run: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");

interface QuestionInput {
  exam: string;
  subject: string;
  topic?: string;
  difficulty: string;
  difficultyScore: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string;
  source?: string;
  year?: number;
}

function hashText(text: string): string {
  return createHash("sha256")
    .update(text.toLowerCase().replace(/\s+/g, " ").trim())
    .digest("hex");
}

function parseJsonField<T>(raw: unknown): T | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object") return raw as T;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function indexToAnswer(index: number): string {
  return ["a", "b", "c", "d"][index] ?? "a";
}

function mapModuleToSubject(moduleName: string): string | null {
  const m = moduleName.toUpperCase();
  if (m.includes("PHY")) return "physics";
  if (m.includes("CHEM")) return "chemistry";
  if (m.includes("MATH") || m.includes("MATHS")) return "mathematics";
  if (m.includes("BIO")) return "biology";
  return null;
}

function levelToDifficulty(level: unknown): { label: string; score: number } {
  const n = Number(level);
  if (n >= 3) return { label: "hard", score: 3 };
  if (n === 2) return { label: "hard", score: 3 };
  return { label: "medium", score: 2 };
}

function parseGaokaoMcq(
  question: string,
  answer: unknown
): Omit<QuestionInput, "exam" | "subject" | "source" | "year"> | null {
  const answerArr = Array.isArray(answer) ? answer : [answer];
  const letter = String(answerArr[0] ?? "").toUpperCase().trim();
  const correct = letter.toLowerCase();
  if (!["a", "b", "c", "d"].includes(correct)) return null;

  const patterns = [
    /A\.\s*([\s\S]+?)\s+B\.\s*([\s\S]+?)\s+C\.\s*([\s\S]+?)\s+D\.\s*([\s\S]+?)$/,
    /A\)\s*([\s\S]+?)\s+B\)\s*([\s\S]+?)\s+C\)\s*([\s\S]+?)\s+D\)\s*([\s\S]+?)$/,
  ];

  let optA: string | undefined;
  let optB: string | undefined;
  let optC: string | undefined;
  let optD: string | undefined;

  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match) {
      [, optA, optB, optC, optD] = match.map((s) => s?.trim());
      break;
    }
  }

  if (!optA || !optB || !optC || !optD) return null;

  const stem = question
    .replace(/A\.\s*[\s\S]+$/, "")
    .replace(/A\)\s*[\s\S]+$/, "")
    .trim();

  if (stem.length < 10) return null;

  return {
    difficulty: "hard",
    difficultyScore: 3,
    questionText: stem,
    optionA: optA,
    optionB: optB,
    optionC: optC,
    optionD: optD,
    correctAnswer: correct,
  };
}

async function fetchHfRows(
  dataset: string,
  split: string,
  offset: number,
  length: number,
  config = "default"
): Promise<Record<string, unknown>[]> {
  const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dataset)}&config=${config}&split=${split}&offset=${offset}&length=${length}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { rows?: { row: Record<string, unknown> }[] };
  return data.rows?.map((r) => r.row) ?? [];
}

async function fetchAllHfRows(
  dataset: string,
  split: string,
  config = "default",
  maxRows = 50000,
  batchSize = 100
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  for (let offset = 0; offset < maxRows; offset += batchSize) {
    const batch = await fetchHfRows(dataset, split, offset, batchSize, config);
    if (batch.length === 0) break;
    all.push(...batch);
    process.stdout.write(`\r  Fetched ${all.length} rows from ${dataset}...`);
    if (batch.length < batchSize) break;
  }
  console.log();
  return all;
}

async function insertQuestions(questions: QuestionInput[]): Promise<number> {
  let inserted = 0;
  for (const q of questions) {
    const textHash = hashText(`${q.exam}:${q.questionText}`);
    try {
      await prisma.question.create({
        data: { ...q, textHash },
      });
      inserted++;
    } catch {
      // duplicate
    }
  }
  return inserted;
}

function parseJeeRow(row: Record<string, unknown>): {
  subject: string;
  question: QuestionInput;
} | null {
  const type = String(row.type ?? "");
  if (type && !type.toLowerCase().includes("single")) return null;

  const moduleName = String(row.module_name ?? "");
  const subject = mapModuleToSubject(moduleName);
  if (!subject) return null;

  const questionText = String(row.question ?? "");
  if (questionText.length < 10) return null;

  const optionsRaw = parseJsonField<string[]>(row.options);
  if (!optionsRaw || optionsRaw.length < 4) return null;

  const correctRaw = parseJsonField<number[]>(row.correct_options);
  if (!correctRaw || correctRaw.length === 0) return null;

  const correctIndex = correctRaw[0];
  if (correctIndex < 0 || correctIndex > 3) return null;

  const diff = levelToDifficulty(row.level);

  const base: QuestionInput = {
    exam: "jee",
    subject,
    topic: String(row.chapter_name ?? ""),
    difficulty: diff.label,
    difficultyScore: diff.score,
    questionText,
    optionA: optionsRaw[0],
    optionB: optionsRaw[1],
    optionC: optionsRaw[2],
    optionD: optionsRaw[3],
    correctAnswer: indexToAnswer(correctIndex),
    explanation: row.solution ? String(row.solution) : undefined,
    source: "datavorous/jee-exam-qna",
  };

  return { subject, question: base };
}

async function ingestJeeExamQna(): Promise<number> {
  console.log("\n📥 Ingesting JEE questions (datavorous/jee-exam-qna)...");
  const rows = await fetchAllHfRows("datavorous/jee-exam-qna", "train", "default", 20000);
  const questions: QuestionInput[] = [];

  for (const row of rows) {
    const parsed = parseJeeRow(row);
    if (!parsed) continue;
    questions.push(parsed.question);

    // Also tag physics/chemistry/biology for NEET where applicable
    if (["physics", "chemistry", "biology"].includes(parsed.subject)) {
      questions.push({
        ...parsed.question,
        exam: "neet",
        difficulty: "hard",
        difficultyScore: 3,
      });
    }
  }

  return insertQuestions(questions);
}

async function ingestMedMcqa(): Promise<number> {
  console.log("\n📥 Ingesting NEET Biology/Chemistry (openlifescienceai/medmcqa)...");
  const rows = await fetchAllHfRows("openlifescienceai/medmcqa", "train", "default", 50000);
  const questions: QuestionInput[] = [];

  for (const row of rows) {
    const subjectRaw = String(row.subject_name ?? row.subject ?? "").toLowerCase();
    let subject: string | null = null;
    if (subjectRaw.includes("chem")) subject = "chemistry";
    else if (
      subjectRaw.includes("bio") ||
      subjectRaw.includes("anatomy") ||
      subjectRaw.includes("medicine") ||
      subjectRaw.includes("physiology") ||
      subjectRaw.includes("patho")
    )
      subject = "biology";
    else continue;

    const opa = String(row.opa ?? "");
    const opb = String(row.opb ?? "");
    const opc = String(row.opc ?? "");
    const opd = String(row.opd ?? "");
    if (!opa || !opb || !opc || !opd) continue;

    const questionText = String(row.question ?? "");
    if (questionText.length < 10) continue;

    const cop = Number(row.cop);
    const correct = indexToAnswer(cop);
    if (!correct) continue;

    questions.push({
      exam: "neet",
      subject,
      topic: String(row.topic_name ?? ""),
      difficulty: "hard",
      difficultyScore: 3,
      questionText,
      optionA: opa,
      optionB: opb,
      optionC: opc,
      optionD: opd,
      correctAnswer: correct,
      explanation: row.exp ? String(row.exp) : undefined,
      source: "openlifescienceai/medmcqa",
    });
  }

  return insertQuestions(questions);
}

async function ingestNeetDataset(): Promise<number> {
  console.log("\n📥 Ingesting NEET PYQs (catchshubham/neet-dataset)...");
  const rows = await fetchAllHfRows("catchshubham/neet-dataset", "train", "default", 10000);
  const questions: QuestionInput[] = [];

  for (const row of rows) {
    const messages = row.messages as { role: string; content: string }[] | undefined;
    if (!messages || messages.length < 2) continue;

    const userMsg = messages.find((m) => m.role === "user")?.content ?? "";
    const assistantMsg = messages.find((m) => m.role === "assistant")?.content ?? "";

    const subjectMatch = userMsg.match(/Subject:\s*(\w+)/i);
    const subj = (subjectMatch?.[1] ?? "biology").toLowerCase();
    let subject: string | null = null;
    if (subj.includes("phys")) subject = "physics";
    else if (subj.includes("chem")) subject = "chemistry";
    else subject = "biology";

    const optionMatches = [...userMsg.matchAll(/([A-D])\)\s*(.+?)(?=\n[A-D]\)|\n\n|$)/gs)];
    if (optionMatches.length < 4) continue;

    const questionText = userMsg.split(/[A-D]\)/)[0].replace(/Subject:.*\n/i, "").trim();
    if (questionText.length < 10) continue;

    const answerMatch = assistantMsg.match(/[Cc]orrect\s*[Aa]nswer:\s*([A-D])/);
    const correct = answerMatch?.[1]?.toLowerCase();
    if (!correct || !["a", "b", "c", "d"].includes(correct)) continue;

    questions.push({
      exam: "neet",
      subject,
      difficulty: "hard",
      difficultyScore: 3,
      questionText,
      optionA: optionMatches[0][2].trim(),
      optionB: optionMatches[1][2].trim(),
      optionC: optionMatches[2][2].trim(),
      optionD: optionMatches[3][2].trim(),
      correctAnswer: correct,
      source: "catchshubham/neet-dataset",
    });
  }

  return insertQuestions(questions);
}

async function ingestGaokaoEnglish(): Promise<number> {
  console.log("\n📥 Ingesting Gaokao English (RUCAIBox/gaokao-bench)...");
  const configs = [
    "2010-2013_English_MCQs",
    "2010-2022_English_Reading_Comp",
    "2010-2022_English_Fill_in_Blanks",
    "2012-2022_English_Cloze_Test",
  ];

  const questions: QuestionInput[] = [];

  for (const config of configs) {
    const rows = await fetchAllHfRows("RUCAIBox/gaokao-bench", "test", config, 500);
    for (const row of rows) {
      const questionRaw = String(row.question ?? "");
      const parsed = parseGaokaoMcq(questionRaw, row.answer);
      if (!parsed) continue;

      questions.push({
        exam: "gaokao",
        subject: "english",
        ...parsed,
        explanation: row.analysis ? String(row.analysis) : undefined,
        source: `RUCAIBox/gaokao-bench/${config}`,
        year: row.year ? Number(row.year) : undefined,
      });
    }
  }

  return insertQuestions(questions);
}

async function ingestJeeBench(): Promise<number> {
  console.log("\n📥 Ingesting JEE Advanced hard questions (JEEBench)...");
  const urls = [
    "https://raw.githubusercontent.com/dair-iitd/jeebench/main/data/jeebench.json",
    "https://raw.githubusercontent.com/dair-iitd/jeebench/main/jeebench.json",
  ];

  let data: Record<string, unknown>[] | null = null;
  for (const url of urls) {
    const res = await fetch(url);
    if (res.ok) {
      data = (await res.json()) as Record<string, unknown>[];
      break;
    }
  }

  if (!data) {
    console.log("  Skipped JEEBench (fetch failed)");
    return 0;
  }

  const questions: QuestionInput[] = [];
  const items = Array.isArray(data) ? data : Object.values(data).flat();

  for (const row of items) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const type = String(r.type ?? r.question_type ?? "MCQ");
    if (type && !type.toLowerCase().includes("mcq")) continue;

    const subject = mapModuleToSubject(String(r.subject ?? r.Subject ?? "PHY"));
    if (!subject || subject === "biology") continue;

    const options = r.options as string[] | undefined;
    if (!options || options.length < 4) continue;

    const questionText = String(r.question ?? r.Question ?? "");
    if (questionText.length < 10) continue;

    let correctIndex = 0;
    const ans = r.answer ?? r.correct_answer;
    if (typeof ans === "number") correctIndex = ans;
    else if (typeof ans === "string" && ans.length === 1) {
      correctIndex = "abcd".indexOf(ans.toLowerCase());
    }

    questions.push({
      exam: "jee",
      subject,
      difficulty: "hard",
      difficultyScore: 3,
      questionText,
      optionA: String(options[0]),
      optionB: String(options[1]),
      optionC: String(options[2]),
      optionD: String(options[3]),
      correctAnswer: indexToAnswer(correctIndex),
      source: "dair-iitd/jeebench",
      year: r.year ? Number(r.year) : undefined,
    });
  }

  return insertQuestions(questions);
}

async function ingestGeneralKnowledge(): Promise<number> {
  console.log("\n📥 Ingesting General Knowledge (allenai/openbookqa)...");
  const rows = await fetchAllHfRows("allenai/openbookqa", "train", "main", 10000);
  const questions: QuestionInput[] = [];

  for (const row of rows) {
    const questionText = String(row.question_stem ?? row.question ?? "");
    if (questionText.length < 10) continue;

    const choices = row.choices as
      | { text?: string[]; label?: string[] }
      | string[]
      | undefined;

    let optA: string, optB: string, optC: string, optD: string;

    if (choices && !Array.isArray(choices) && choices.text?.length === 4) {
      [optA, optB, optC, optD] = choices.text.map(String);
    } else if (Array.isArray(choices) && choices.length >= 4) {
      [optA, optB, optC, optD] = choices.slice(0, 4).map(String);
    } else continue;

    const answerKey = String(row.answerKey ?? row.answer ?? "").toUpperCase();
    const labelToIndex: Record<string, string> = {
      A: "a",
      B: "b",
      C: "c",
      D: "d",
      "1": "a",
      "2": "b",
      "3": "c",
      "4": "d",
    };
    const correct = labelToIndex[answerKey] ?? answerKey.toLowerCase();
    if (!["a", "b", "c", "d"].includes(correct)) continue;

    questions.push({
      exam: "trivia",
      subject: "general_knowledge",
      difficulty: "hard",
      difficultyScore: 3,
      questionText,
      optionA: optA,
      optionB: optB,
      optionC: optC,
      optionD: optD,
      correctAnswer: correct,
      source: "allenai/openbookqa",
    });
  }

  return insertQuestions(questions);
}

function generateVedicMathsQuestions(): QuestionInput[] {
  const questions: QuestionInput[] = [];
  const templates: Array<() => QuestionInput | null> = [
    () => {
      const a = Math.floor(Math.random() * 80) + 11;
      const b = Math.floor(Math.random() * 80) + 11;
      const correct = a * b;
      const wrong = [correct + 10, correct - 7, correct + 23].sort(() => Math.random() - 0.5);
      return {
        exam: "vedic",
        subject: "vedic_maths",
        difficulty: "hard",
        difficultyScore: 3,
        questionText: `Using rapid multiplication, what is ${a} × ${b}?`,
        optionA: String(wrong[0]),
        optionB: String(correct),
        optionC: String(wrong[1]),
        optionD: String(wrong[2]),
        correctAnswer: "b",
        source: "vedic-generated",
      };
    },
    () => {
      const n = Math.floor(Math.random() * 40) + 11;
      const correct = n * n;
      const wrong = [correct + n, correct - n, correct + 2 * n];
      return {
        exam: "vedic",
        subject: "vedic_maths",
        difficulty: "hard",
        difficultyScore: 3,
        questionText: `What is ${n}² (square of ${n})?`,
        optionA: String(wrong[0]),
        optionB: String(wrong[1]),
        optionC: String(correct),
        optionD: String(wrong[2]),
        correctAnswer: "c",
        source: "vedic-generated",
      };
    },
    () => {
      const a = Math.floor(Math.random() * 50) + 10;
      const b = Math.floor(Math.random() * 50) + 10;
      const c = Math.floor(Math.random() * 50) + 10;
      const correct = a + b + c;
      return {
        exam: "vedic",
        subject: "vedic_maths",
        difficulty: "hard",
        difficultyScore: 3,
        questionText: `Find the sum using left-to-right addition: ${a} + ${b} + ${c} = ?`,
        optionA: String(correct + 5),
        optionB: String(correct),
        optionC: String(correct - 3),
        optionD: String(correct + 12),
        correctAnswer: "b",
        source: "vedic-generated",
      };
    },
    () => {
      const n = Math.floor(Math.random() * 90) + 10;
      const correct = n * 11;
      return {
        exam: "vedic",
        subject: "vedic_maths",
        difficulty: "hard",
        difficultyScore: 3,
        questionText: `Using the ×11 trick, what is ${n} × 11?`,
        optionA: String(correct + 11),
        optionB: String(correct - 11),
        optionC: String(correct),
        optionD: String(correct + 22),
        correctAnswer: "c",
        source: "vedic-generated",
      };
    },
    () => {
      const a = Math.floor(Math.random() * 200) + 50;
      const b = Math.floor(Math.random() * 40) + 5;
      const correct = a - b;
      return {
        exam: "vedic",
        subject: "vedic_maths",
        difficulty: "hard",
        difficultyScore: 3,
        questionText: `Compute mentally: ${a} − ${b} = ?`,
        optionA: String(correct),
        optionB: String(correct + 9),
        optionC: String(correct - 6),
        optionD: String(correct + 15),
        correctAnswer: "a",
        source: "vedic-generated",
      };
    },
    () => {
      const n = Math.floor(Math.random() * 15) + 2;
      const correct = n * n * n;
      return {
        exam: "vedic",
        subject: "vedic_maths",
        difficulty: "hard",
        difficultyScore: 3,
        questionText: `What is the cube of ${n} (${n}³)?`,
        optionA: String(correct + n),
        optionB: String(correct - n),
        optionC: String(correct),
        optionD: String(correct + 2 * n),
        correctAnswer: "c",
        source: "vedic-generated",
      };
    },
  ];

  for (let i = 0; i < 300; i++) {
    const template = templates[i % templates.length];
    const q = template();
    if (q) questions.push(q);
  }

  return questions;
}

async function ingestVedicMaths(): Promise<number> {
  console.log("\n📥 Generating Vedic Maths questions...");
  return insertQuestions(generateVedicMathsQuestions());
}

async function printSummary() {
  const subjectIds = [
    "mathematics",
    "biology",
    "chemistry",
    "physics",
    "english",
    "general_knowledge",
    "vedic_maths",
  ];
  console.log("\n📊 Question bank summary:");
  for (const subject of subjectIds) {
    const total = await prisma.question.count({ where: { subject } });
    const hard = await prisma.question.count({
      where: { subject, difficultyScore: 3 },
    });
    console.log(`  ${subject}: ${total} total (${hard} hard)`);
  }
  const total = await prisma.question.count();
  console.log(`\n  TOTAL: ${total} questions`);
}

async function main() {
  console.log("🚀 Starting question bank ingestion...");
  console.log("   Hardest questions prioritized for every test.\n");

  const existing = await prisma.question.count();
  if (existing > 1000 && !FORCE) {
    console.log(`Database already has ${existing} questions. Skipping ingestion.`);
    console.log("Run with --force to re-seed: npm run db:seed -- --force");
    await printSummary();
    return;
  }

  if (FORCE && existing > 0) {
    console.log("Clearing existing questions...");
    await prisma.testAnswer.deleteMany();
    await prisma.testSessionQuestion.deleteMany();
    await prisma.testSession.deleteMany();
    await prisma.question.deleteMany();
  }

  const results = await Promise.all([
    ingestJeeExamQna(),
    ingestMedMcqa(),
    ingestNeetDataset(),
    ingestGaokaoEnglish(),
    ingestJeeBench(),
    ingestGeneralKnowledge(),
    ingestVedicMaths(),
  ]);

  const totalInserted = results.reduce((a, b) => a + b, 0);
  console.log(`\n✅ Inserted ${totalInserted} new questions.`);
  await printSummary();
}

main()
  .catch((e) => {
    console.error("Ingestion failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import type { ImportQuestionRow } from "@/types/database";
import { defaultExplanation } from "@/lib/import/template";

// Letters only — numbered "1) ..." / "2. ..." are questions, not options.
const OPTION_LINE =
  /^\s*(?:[\(\[]?\s*)?([A-Da-d])(?:[\)\]\.\:\-])\s*(.+?)\s*$/;
const ANSWER_LINE =
  /^\s*(?:đáp\s*án(?:\s*đúng)?|dap\s*an(?:\s*dung)?|correct(?:\s*answer)?|answer|ans)\s*[:\-–]?\s*([A-Da-d1-4])\s*\.?$/i;
const QUESTION_START =
  /^\s*(?:câu\s*|question\s*|q\s*)?(\d+)\s*[\.\:\)]\s*(.+)$/i;

function normalizeLabel(raw: string): "A" | "B" | "C" | "D" | null {
  const v = raw.trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(v)) return v as "A" | "B" | "C" | "D";
  if (v === "1") return "A";
  if (v === "2") return "B";
  if (v === "3") return "C";
  if (v === "4") return "D";
  return null;
}

function cleanText(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Draft = {
  question: string;
  options: Partial<Record<"A" | "B" | "C" | "D", string>>;
  correct?: string;
};

function flushDraft(
  draft: Draft | null,
  rows: ImportQuestionRow[],
  explanationFallback: (correct: string) => string
) {
  if (!draft?.question) return;
  const A = draft.options.A?.trim() ?? "";
  const B = draft.options.B?.trim() ?? "";
  const C = draft.options.C?.trim() ?? "";
  const D = draft.options.D?.trim() ?? "";
  const correct = normalizeLabel(draft.correct ?? "") ?? "";

  if (!A || !B || !C || !D) return;
  if (!correct) return;

  rows.push({
    Question: draft.question.trim(),
    A,
    B,
    C,
    D,
    "Correct Answer": correct,
    Explanation: explanationFallback(correct),
    "Image URL": "",
  });
}

/**
 * Parse plain text (from DOCX) into import rows.
 * Supports common Vietnamese quiz layouts:
 *
 * Câu 1: ...
 * A. ...
 * B. ...
 * C. ...
 * D. ...
 * Đáp án: B
 */
export function parseQuizTextToRows(
  rawText: string,
  options?: { explanationFactory?: (correct: string) => string }
): ImportQuestionRow[] {
  const explanationFactory = options?.explanationFactory ?? defaultExplanation;
  const text = cleanText(rawText);
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rows: ImportQuestionRow[] = [];
  let draft: Draft | null = null;

  for (const line of lines) {
    const answerMatch = line.match(ANSWER_LINE);
    if (answerMatch) {
      const label = normalizeLabel(answerMatch[1]);
      if (draft && label) draft.correct = label;
      flushDraft(draft, rows, explanationFactory);
      draft = null;
      continue;
    }

    // Numbered question before option letters (avoids "2) ..." becoming option B)
    const questionMatch = line.match(QUESTION_START);
    if (questionMatch) {
      flushDraft(draft, rows, explanationFactory);
      draft = {
        question: questionMatch[2].trim(),
        options: {},
      };
      continue;
    }

    const optionMatch = line.match(OPTION_LINE);
    if (optionMatch) {
      const label = normalizeLabel(optionMatch[1]);
      if (label) {
        if (!draft) draft = { question: "", options: {} };
        draft.options[label] = optionMatch[2].trim();
        continue;
      }
    }

    // Continuation of question text (no option/answer marker)
    if (draft && !draft.options.A) {
      draft.question = `${draft.question} ${line}`.trim();
      continue;
    }

    // New question without numbering: previous block ended after D, next prose starts
    if (
      draft &&
      draft.options.A &&
      draft.options.B &&
      draft.options.C &&
      draft.options.D &&
      draft.correct
    ) {
      flushDraft(draft, rows, explanationFactory);
      draft = { question: line, options: {} };
      continue;
    }

    if (!draft) {
      draft = { question: line, options: {} };
    }
  }

  flushDraft(draft, rows, explanationFactory);
  return rows;
}

export function validateImportRows(rows: ImportQuestionRow[]) {
  const errors: string[] = [];
  rows.forEach((row, index) => {
    const n = index + 1;
    if (!row.Question?.trim()) errors.push(`Dòng ${n}: thiếu Question`);
    if (!row.A?.trim() || !row.B?.trim() || !row.C?.trim() || !row.D?.trim()) {
      errors.push(`Dòng ${n}: thiếu đáp án A/B/C/D`);
    }
    const correct = String(row["Correct Answer"] ?? "")
      .trim()
      .toUpperCase();
    if (!["A", "B", "C", "D"].includes(correct)) {
      errors.push(`Dòng ${n}: Correct Answer phải là A/B/C/D`);
    }
  });
  return errors;
}

import type { ImportQuestionRow } from "@/types/database";

export const IMPORT_COLUMNS = [
  "Question",
  "A",
  "B",
  "C",
  "D",
  "Correct Answer",
  "Explanation",
  "Image URL",
] as const;

export const SAMPLE_IMPORT_ROWS: ImportQuestionRow[] = [
  {
    Question: "15 + 7 = ?",
    A: "21",
    B: "22",
    C: "23",
    D: "24",
    "Correct Answer": "B",
    Explanation: "15 cộng 7 bằng 22.",
    "Image URL": "",
  },
  {
    Question: 'Từ nào đồng nghĩa với "vui vẻ"?',
    A: "Buồn bã",
    B: "Hạnh phúc",
    C: "Giận dữ",
    D: "Mệt mỏi",
    "Correct Answer": "B",
    Explanation: '"Vui vẻ" đồng nghĩa với "hạnh phúc".',
    "Image URL": "",
  },
  {
    Question: 'What is "con mèo" in English?',
    A: "Dog",
    B: "Cat",
    C: "Bird",
    D: "Fish",
    "Correct Answer": "B",
    Explanation: '"Con mèo" là "cat".',
    "Image URL": "",
  },
];

export function defaultExplanation(correct: string) {
  const label = String(correct || "").trim().toUpperCase();
  if (!label) return "Hãy xem lại kiến thức liên quan đến câu hỏi này.";
  return `Đáp án đúng là ${label}.`;
}

export function rowsToCsv(rows: ImportQuestionRow[]) {
  const escape = (value: string | undefined) => {
    const raw = value ?? "";
    if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
    return raw;
  };
  const header = IMPORT_COLUMNS.join(",");
  const body = rows
    .map((row) =>
      IMPORT_COLUMNS.map((col) => escape(String(row[col] ?? ""))).join(",")
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

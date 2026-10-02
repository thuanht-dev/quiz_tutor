import type { OptionLabel } from "@/types/database";

export interface ExplainPromptInput {
  questionContent: string;
  options: { label: OptionLabel; content: string }[];
  correctLabel: OptionLabel;
  studentLabel: OptionLabel | null;
  subjectName?: string;
}

/**
 * Prompt hệ thống cố định — thiết lập vai trò gia sư tiểu học,
 * ngắn gọn, vui vẻ, dễ hiểu.
 */
const SYSTEM_INSTRUCTION = `Bạn là gia sư tiểu học thân thiện, giải thích bài cho học sinh lớp 1-5.
Yêu cầu:
- Trả lời bằng tiếng Việt, giọng vui vẻ, khuyến khích, không phán xét.
- Dùng từ ngữ đơn giản, tránh thuật ngữ khó. Nếu cần thuật ngữ thì giải thích kèm theo.
- Dùng ví dụ thực tế gần gũi (trái cây, đồ chơi, con vật...) để minh họa.
- Giữ tổng cộng dưới 120 từ.
- Trả về JSON hợp lệ theo schema yêu cầu, không kèm giải thích ngoài JSON.`;

export function buildExplainPrompt(input: ExplainPromptInput): {
  system: string;
  user: string;
} {
  const {
    questionContent,
    options,
    correctLabel,
    studentLabel,
    subjectName,
  } = input;

  const optionsText = options
    .map((o) => `${o.label}. ${o.content}`)
    .join("\n");

  const correctOption = options.find((o) => o.label === correctLabel);
  const studentOption = studentLabel
    ? options.find((o) => o.label === studentLabel)
    : null;

  const studentInfo = studentOption
    ? `Học sinh đã chọn: ${studentLabel}. ${studentOption.content}`
    : `Học sinh chưa trả lời câu này.`;

  const userPrompt = `Môn học: ${subjectName ?? "(không rõ)"}

Câu hỏi: ${questionContent}

Các đáp án:
${optionsText}

Đáp án đúng: ${correctLabel}. ${correctOption?.content ?? ""}

${studentInfo}

Hãy trả về JSON đúng schema sau (không kèm text ngoài JSON):
{
  "explanation": "Giải thích ngắn (2-3 câu) tại sao đáp án ${correctLabel} đúng, dùng ví dụ thực tế.",
  "wrong_reason": "${
    studentOption
      ? `Giải thích ngắn (1-2 câu) tại sao đáp án ${studentLabel} sai hoặc không phù hợp nhất.`
      : `Khuyến khích học sinh thử trả lời câu này lần sau (1-2 câu).`
  }"
}`;

  return { system: SYSTEM_INSTRUCTION, user: userPrompt };
}

/** Parse JSON trả về từ Gemini — robust với markdown code block. */
export function parseExplainJson(raw: string): {
  explanation: string;
  wrong_reason: string;
} {
  // Strip markdown fences nếu có
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    const parsed = JSON.parse(cleaned);
    return {
      explanation: String(parsed.explanation ?? "").trim(),
      wrong_reason: String(parsed.wrong_reason ?? "").trim(),
    };
  } catch {
    // Fallback: trả nguyên text
    return { explanation: raw.trim(), wrong_reason: "" };
  }
}
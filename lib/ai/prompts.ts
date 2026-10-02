import type { OptionLabel } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExplainPromptInput {
  questionContent: string;
  options: { label: OptionLabel; content: string }[];
  correctLabel: OptionLabel;
  studentLabel: OptionLabel | null;
  subjectName?: string;
}

/** Một lượt chat trong cuộc trò chuyện với AI. */
export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface ChatPromptInput {
  /** Context toàn bộ quiz — hiển thị cho AI để trả lời chính xác. */
  quizTitle: string;
  subjectName?: string;
  questions: {
    index: number;
    content: string;
    options: { label: OptionLabel; content: string; isCorrect: boolean }[];
  }[];
  /** Câu hỏi hiện tại đang xem (AI có thể nhấn mạnh). */
  currentQuestionIndex?: number;
  /** Lịch sử chat để giữ context. */
  messages: ChatMessage[];
  /** Câu hỏi mới nhất của học sinh. */
  newUserMessage: string;
}

// ---------------------------------------------------------------------------
// System instruction
// ---------------------------------------------------------------------------

/** System instruction dùng chung cho mọi mode. */
const BASE_SYSTEM = `Bạn là gia sư tiểu học thân thiện, giảng bài cho học sinh lớp 1-5.
- Trả lời bằng tiếng Việt, giọng vui vẻ, khuyến khích, không phán xét.
- Dùng từ ngữ đơn giản, tránh thuật ngữ khó; nếu cần dùng thì giải thích kèm.
- Dùng ví dụ thực tế (trái cây, đồ chơi, con vật...) để minh họa.
- Câu trả lời ngắn gọn: dưới 80 từ cho câu hỏi đơn lẻ, dưới 120 từ khi giải thích dài.
- Nếu câu hỏi nằm ngoài quiz, vẫn trả lời đúng bổn phận gia sư.
- Không trả lời bằng JSON — chỉ text thuần túy.`;

const SYSTEM_FOR_CHAT = BASE_SYSTEM + `

Bạn có context đầy đủ của bài quiz bên dưới. Trả lời câu hỏi của học sinh dựa trên context đó. Nếu hỏi về một câu cụ thể, nhớ số câu để trả lời chính xác.`;

const SYSTEM_FOR_EXPLAIN = `${BASE_SYSTEM}

Lần đầu trả lời: trả về đúng JSON schema bên dưới (không kèm text ngoài JSON).`;

// ---------------------------------------------------------------------------
// Explain (lần đầu — structured JSON)
// ---------------------------------------------------------------------------

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

  return { system: SYSTEM_FOR_EXPLAIN, user: userPrompt };
}

// ---------------------------------------------------------------------------
// Chat / Free-form Q&A
// ---------------------------------------------------------------------------

export function buildChatPrompt(input: ChatPromptInput): {
  system: string;
  contents: { role: string; parts: { text: string }[] }[];
} {
  const {
    quizTitle,
    subjectName,
    questions,
    currentQuestionIndex,
    messages,
    newUserMessage,
  } = input;

  // Build quiz context string
  const quizContext = buildQuizContext(quizTitle, subjectName, questions, currentQuestionIndex);

  // Build conversation history for Gemini API
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const msg of messages) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  // Final user message with context prefix
  const finalUser = `${quizContext}\n\nHỏi từ học sinh: ${newUserMessage}`;
  contents.push({ role: "user", parts: [{ text: finalUser }] });

  return { system: SYSTEM_FOR_CHAT, contents };
}

function buildQuizContext(
  title: string,
  subjectName: string | undefined,
  questions: ChatPromptInput["questions"],
  currentIndex: number | undefined
): string {
  const subject = subjectName ? `Môn: ${subjectName}` : "";
  const quizHeader = `📋 Quiz: "${title}"${subject ? ` (${subject})` : ""}`;

  const questionLines = questions.map((q, i) => {
    const marker = i === currentIndex ? "👉 " : "";
    const optionsText = q.options
      .map((o) => `  ${o.label}. ${o.content}${o.isCorrect ? " ✓" : ""}`)
      .join("\n");
    return `${marker}Câu ${i + 1}: ${q.content}\n${optionsText}`;
  });

  return `${quizHeader}\n\n${questionLines.join("\n\n")}`;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Parse JSON trả về từ Gemini — robust với markdown code block + truncated response. */
export function parseExplainJson(raw: string): {
  explanation: string;
  wrong_reason: string;
} {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  // 1. Thử parse JSON hoàn chỉnh
  try {
    const parsed = JSON.parse(cleaned);
    return {
      explanation: unwrapString(parsed.explanation ?? ""),
      wrong_reason: unwrapString(parsed.wrong_reason ?? ""),
    };
  } catch {
    // fall through
  }

  // 2. Fallback: JSON bị truncated — extract bằng regex
  const truncated = extractFromTruncatedJson(cleaned);
  if (truncated.explanation || truncated.wrong_reason) {
    return truncated;
  }

  // 3. Cuối cùng: trả raw (AI có thể trả text thuần do fallback)
  return { explanation: raw.trim(), wrong_reason: "" };
}

/** Parse JSON đang bị cắt dở — dùng regex để cứu vãn. */
function extractFromTruncatedJson(raw: string): {
  explanation: string;
  wrong_reason: string;
} {
  if (!raw.startsWith("{")) {
    return { explanation: "", wrong_reason: "" };
  }
  const result = { explanation: "", wrong_reason: "" };
  for (const key of ["explanation", "wrong_reason"] as const) {
    // Khớp: "key": "..." (chấp nhận xuôi, không cần đóng)
    const re = new RegExp(
      `"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
      "i"
    );
    const m = raw.match(re);
    if (m && m[1]) {
      result[key] = m[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  }
  return result;
}

/** Nếu value là string chứa JSON lồng (AI trả sai format), parse và lấy field. */
function unwrapString(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return trimmed;
  }
  try {
    const nested = JSON.parse(trimmed);
    if (typeof nested.explanation === "string") return nested.explanation;
    if (typeof nested.answer === "string") return nested.answer;
  } catch {
    // Không parse được → trả raw
  }
  return trimmed;
}

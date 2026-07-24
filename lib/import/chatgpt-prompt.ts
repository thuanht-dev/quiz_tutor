import { IMPORT_COLUMNS, SAMPLE_IMPORT_ROWS, rowsToCsv } from "@/lib/import/template";

const CSV_HEADER = IMPORT_COLUMNS.join(",");

const EXAMPLE_CSV = rowsToCsv(SAMPLE_IMPORT_ROWS.slice(0, 1)).trim();

/**
 * Prompt for ChatGPT / Gemini / Claude: convert a quiz into import CSV
 * with a detailed Explanation per question.
 */
export function buildChatGptImportPrompt(quizText: string, options?: {
  language?: "vi" | "en";
  subjectHint?: string;
}) {
  const language = options?.language ?? "vi";
  const subjectLine = options?.subjectHint?.trim()
    ? `- Môn / chủ đề gợi ý: ${options.subjectHint.trim()}\n`
    : "";

  const explanationLang =
    language === "vi"
      ? "Viết Explanation bằng tiếng Việt, rõ ràng, chi tiết (2–5 câu): nêu vì sao đáp án đúng, vì sao các đáp án còn lại sai (nếu hợp lý), và mẹo ghi nhớ ngắn nếu có."
      : "Write detailed Explanations in English (2–5 sentences): why the correct option is right, why others are wrong when useful, plus a short memory tip if helpful.";

  return `Bạn là trợ lý soạn đề trắc nghiệm cho giáo viên.

NHIỆM VỤ
Chuyển toàn bộ câu hỏi bên dưới thành 1 file CSV đúng schema để import vào hệ thống quiz.
${subjectLine}
YÊU CẦU BẮT BUỘC
1. Chỉ trả về CSV thuần (có thể bọc trong \`\`\`csv ... \`\`\`). Không giải thích thêm ngoài CSV.
2. Dòng đầu tiên đúng header (không đổi tên cột, không thêm cột):
${CSV_HEADER}
3. Mỗi câu hỏi = 1 dòng dữ liệu.
4. Correct Answer chỉ được là một trong: A, B, C, D (viết hoa).
5. Image URL để trống trừ khi đề có URL ảnh rõ ràng.
6. ${explanationLang}
7. Giữ nguyên nội dung câu hỏi và 4 lựa chọn; không bịa thêm câu nếu đề không có.
8. Nếu đề đã ghi đáp án đúng thì dùng đáp án đó. Nếu đề không ghi đáp án, hãy suy luận đáp án đúng nhất và giải thích rõ.
9. CSV phải escape đúng chuẩn: ô có dấu phẩy / xuống dòng / dấu " thì bọc bằng " và nhân đôi dấu " bên trong.

VÍ DỤ ĐỊNH DẠNG (1 dòng mẫu — chỉ để tham chiếu schema):
${EXAMPLE_CSV}

--- ĐỀ / CÂU HỎI GỐC ---
${quizText.trim()}
--- HẾT ĐỀ ---

Hãy xuất (chỉ file không cần gửi text) CSV đầy đủ cho tất cả câu hỏi trong đề.`;
}

/** Pull CSV body out of a ChatGPT-style reply (fenced code or raw). */
export function extractCsvFromChatReply(reply: string): string {
  const text = reply.replace(/^\uFEFF/, "").trim();
  if (!text) return "";

  const fenced = text.match(/```(?:csv|text)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const headerIdx = text.search(/^Question\s*,/im);
  if (headerIdx >= 0) return text.slice(headerIdx).trim();

  return text;
}

export const CHATGPT_STEPS = [
  "Dán hoặc tải đề (Word/TXT) để tạo prompt",
  "Sao chép prompt → dán vào ChatGPT",
  "Dán CSV ChatGPT trả về → kiểm tra → nhập",
] as const;

import { GoogleGenerativeAI } from "@google/generative-ai";

/** Model dùng cho tính năng AI giải thích đáp án. */
export const GEMINI_MODEL = "gemini-flash-latest";

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super(
      "AI chưa được cấu hình — hãy vào Cài đặt → AI để nhập Gemini API key."
    );
    this.name = "GeminiNotConfiguredError";
  }
}

/**
 * Tạo Gemini client từ API key.
 * Throw `GeminiNotConfiguredError` nếu key rỗng.
 */
export function createGeminiClient(apiKey: string | null | undefined) {
  const key = (apiKey ?? "").trim();
  if (!key) throw new GeminiNotConfiguredError();
  return new GoogleGenerativeAI(key);
}
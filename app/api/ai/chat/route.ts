import { NextResponse } from "next/server";
import { z } from "zod";
import { createGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini-client";
import { buildChatPrompt } from "@/lib/ai/prompts";
import { loadAISettings } from "@/lib/ai/settings";
import type { OptionLabel } from "@/types/database";

export const dynamic = "force-dynamic";

const chatRequestSchema = z.object({
  question_id: z.string().min(1),
  quiz_context: z
    .object({
      quiz_title: z.string(),
      subject_name: z.string().optional(),
      questions: z.array(
        z.object({
          index: z.number(),
          content: z.string(),
          options: z.array(
            z.object({
              label: z.enum(["A", "B", "C", "D"]),
              content: z.string(),
              is_correct: z.boolean(),
            })
          ),
        })
      ),
      current_question_index: z.number(),
    })
    .nullable()
    .optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "model"]), content: z.string() }))
    .default([]),
  new_message: z.string().min(1).max(500),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Gọi Gemini bằng multi-turn API (contents[] với system instruction).
 * Retry 1 lần nếu lỗi thoáng qua.
 */
async function callGeminiMultiTurn(
  apiKey: string,
  system: string,
  contents: { role: string; parts: { text: string }[] }[]
): Promise<string> {
  const client = createGeminiClient(apiKey);
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: system,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500,
    },
  });

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await model.generateContent(contents as any);
      const text = result.response.text();
      if (text) return text;
    } catch (err: unknown) {
      const isRetryable =
        err instanceof Error &&
        (err.message.includes("503") ||
          err.message.includes("429") ||
          err.message.includes("RESOURCE_EXHAUSTED") ||
          err.message.includes("high demand"));
      lastError = err;
      if (isRetryable && attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000));
      } else if (!isRetryable) {
        break;
      }
    }
  }

  throw lastError ?? new Error("Gemini không trả về nội dung");
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Validate
  let parsed: z.infer<typeof chatRequestSchema>;
  try {
    const body = await request.json();
    const result = chatRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: result.error.flatten() },
        { status: 400 }
      );
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Body phải là JSON" }, { status: 400 });
  }

  // 2. Check AI enabled + key
  const settings = await loadAISettings();
  if (!settings.enabled || !settings.gemini_api_key) {
    return NextResponse.json(
      { error: "AI đang tắt — hãy bật trong Cài đặt → AI." },
      { status: 403 }
    );
  }

  try {
    // 3. Build prompt
    // Client gửi kèm is_correct trong quiz_context → dùng trực tiếp
    const qc = parsed.quiz_context;
    const { system, contents } = buildChatPrompt({
      quizTitle: qc?.quiz_title ?? "Bài quiz",
      subjectName: qc?.subject_name,
      questions:
        qc?.questions.map((q) => ({
          index: q.index,
          content: q.content,
          options: q.options.map((o) => ({
            label: o.label as OptionLabel,
            content: o.content,
            isCorrect: o.is_correct,
          })),
        })) ?? [],
      currentQuestionIndex: qc?.current_question_index,
      messages: parsed.messages.map((m) => ({
        role: m.role as "user" | "model",
        content: m.content,
      })),
      newUserMessage: parsed.new_message,
    });

    // 5. Call Gemini
    const answer = await callGeminiMultiTurn(settings.gemini_api_key, system, contents);

    return NextResponse.json({ answer, model: GEMINI_MODEL });
  } catch (err) {
    console.error("[ai/chat] Lỗi:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `AI không trả lời được: ${message}` },
      { status: 500 }
    );
  }
}

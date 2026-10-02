import { NextResponse } from "next/server";
import { z } from "zod";
import { createGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini-client";
import {
  buildExplainPrompt,
  parseExplainJson,
} from "@/lib/ai/prompts";
import { getGeminiApiKey, loadAISettings } from "@/lib/ai/settings";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const explainRequestSchema = z.object({
  question_id: z.string().min(1),
  student_label: z.enum(["A", "B", "C", "D"]).nullable().optional(),
});

export async function POST(request: Request) {
  // 1. Validate body
  let parsed: z.infer<typeof explainRequestSchema>;
  try {
    const body = await request.json();
    const result = explainRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: result.error.flatten() },
        { status: 400 }
      );
    }
    parsed = result.data;
  } catch {
    return NextResponse.json(
      { error: "Body phải là JSON" },
      { status: 400 }
    );
  }

  // 2. Check AI enabled + lấy API key
  const settings = await loadAISettings();
  if (!settings.enabled) {
    return NextResponse.json(
      { error: "AI đang tắt — hãy bật trong Cài đặt → AI." },
      { status: 403 }
    );
  }
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chưa cấu hình Gemini API key — hãy vào Cài đặt → AI." },
      { status: 403 }
    );
  }

  // 3. Lấy câu hỏi + options + subject
  try {
    const admin = createAdminClient();
    const { data: question, error } = await admin
      .from("questions")
      .select("id, content, subject_id, subject:subjects(name)")
      .eq("id", parsed.question_id)
      .maybeSingle();
    if (error) throw error;
    if (!question) {
      return NextResponse.json(
        { error: "Không tìm thấy câu hỏi" },
        { status: 404 }
      );
    }

    const { data: options, error: optError } = await admin
      .from("options")
      .select("label, content, is_correct")
      .eq("question_id", parsed.question_id)
      .order("sort_order");
    if (optError) throw optError;
    if (!options || options.length === 0) {
      return NextResponse.json(
        { error: "Câu hỏi chưa có đáp án" },
        { status: 400 }
      );
    }

    const correct = options.find((o) => o.is_correct);
    if (!correct) {
      return NextResponse.json(
        { error: "Câu hỏi chưa có đáp án đúng" },
        { status: 400 }
      );
    }

    const subjectName = Array.isArray(question.subject)
      ? question.subject[0]?.name
      : (question as { subject?: { name?: string } }).subject?.name;

    // 4. Build prompt
    const { system, user } = buildExplainPrompt({
      questionContent: question.content,
      options: options.map((o) => ({
        label: o.label as "A" | "B" | "C" | "D",
        content: o.content,
      })),
      correctLabel: correct.label as "A" | "B" | "C" | "D",
      studentLabel: parsed.student_label ?? null,
      subjectName,
    });

    // 5. Gọi Gemini (retry 1 lần nếu lỗi thoáng qua)
    const client = createGeminiClient(apiKey);
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: system,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    });

    let text = "";
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(user);
        const candidate = result.response.candidates?.[0];
        const finishReason = candidate?.finishReason;
        text = result.response.text();
        // Nếu bị truncate vì MAX_TOKENS → retry với prompt ngắn hơn hoặc tăng tokens (đã tăng)
        if (finishReason === "MAX_TOKENS" && attempt < 2) {
          console.warn(`[ai/explain] Bị cắt ở attempt ${attempt + 1}, retry...`);
          continue;
        }
        if (text) break;
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
    if (!text) {
      const message =
        lastError instanceof Error
          ? lastError.message
          : "Gemini không trả về nội dung";
      throw new Error(message);
    }

    const parsed2 = parseExplainJson(text);
    return NextResponse.json({
      explanation: parsed2.explanation,
      wrong_reason: parsed2.wrong_reason,
      model: GEMINI_MODEL,
    });
  } catch (err) {
    console.error("[ai/explain] Lỗi:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Không thể gọi AI: ${message}` },
      { status: 500 }
    );
  }
}
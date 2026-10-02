import { USE_MOCK } from "@/lib/constants";
import { db } from "@/lib/repositories/mock-db";
import { createAdminClient } from "@/lib/supabase/admin";

const AI_SETTINGS_KEY = "ai_settings";

export interface AISettings {
  enabled: boolean;
  /** Gemini API key — lưu trong DB, server-side only. */
  gemini_api_key: string | null;
  updated_at?: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  gemini_api_key: null,
};

function normalizeSettings(raw: unknown): AISettings {
  const value = (raw ?? {}) as Partial<AISettings>;
  return {
    enabled: !!value.enabled,
    gemini_api_key:
      typeof value.gemini_api_key === "string" && value.gemini_api_key.trim()
        ? value.gemini_api_key.trim()
        : null,
    updated_at: value.updated_at,
  };
}

/**
 * Đọc cấu hình AI. Dùng admin client để không phụ thuộc session user.
 * Trả về DEFAULT_AI_SETTINGS nếu lỗi (admin client không cấu hình, v.v.).
 */
export async function loadAISettings(): Promise<AISettings> {
  if (USE_MOCK) {
    return normalizeSettings(db.appSettings[AI_SETTINGS_KEY]);
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", AI_SETTINGS_KEY)
      .maybeSingle();
    if (error) throw error;
    return normalizeSettings(data?.value);
  } catch (err) {
    console.error("[ai] Không đọc được cấu hình AI:", err);
    return DEFAULT_AI_SETTINGS;
  }
}

/** Chỉ lấy API key, dùng nội bộ khi gọi Gemini. */
export async function getGeminiApiKey(): Promise<string | null> {
  const settings = await loadAISettings();
  return settings.gemini_api_key;
}

/** API save — yêu cầu admin session (gọi từ Server Action). */
export async function saveAISettings(
  settings: Partial<AISettings>
): Promise<AISettings> {
  const current = await loadAISettings();
  const next: AISettings = {
    enabled:
      typeof settings.enabled === "boolean" ? settings.enabled : current.enabled,
    gemini_api_key:
      settings.gemini_api_key !== undefined
        ? settings.gemini_api_key?.trim() || null
        : current.gemini_api_key,
    updated_at: new Date().toISOString(),
  };

  if (USE_MOCK) {
    db.appSettings[AI_SETTINGS_KEY] = next;
    return next;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("app_settings").upsert({
    key: AI_SETTINGS_KEY,
    value: next,
    updated_at: next.updated_at,
  });
  if (error) throw error;
  return next;
}
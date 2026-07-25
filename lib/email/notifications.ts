import { USE_MOCK } from "@/lib/constants";
import { db } from "@/lib/repositories/mock-db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Attempt, NotificationSettings } from "@/types/database";

const SETTINGS_KEY = "notifications";

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  recipients: [],
  notify_on_start: true,
  notify_on_submit: true,
};

function normalizeSettings(raw: unknown): NotificationSettings {
  const value = (raw ?? {}) as Partial<NotificationSettings>;
  return {
    enabled: !!value.enabled,
    recipients: Array.isArray(value.recipients)
      ? value.recipients.filter((r): r is string => typeof r === "string")
      : [],
    notify_on_start: value.notify_on_start ?? true,
    notify_on_submit: value.notify_on_submit ?? true,
  };
}

/** Read settings without user session (works for guest flows). */
export async function loadNotificationSettings(): Promise<NotificationSettings> {
  if (USE_MOCK) {
    return normalizeSettings(db.appSettings[SETTINGS_KEY]);
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    if (error) throw error;
    return normalizeSettings(data?.value);
  } catch (err) {
    console.error("[email] Không đọc được cấu hình thông báo:", err);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<NotificationSettings> {
  const clean = normalizeSettings(settings);
  clean.recipients = clean.recipients
    .map((r) => r.trim().toLowerCase())
    .filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));

  if (USE_MOCK) {
    db.appSettings[SETTINGS_KEY] = clean;
    return clean;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("app_settings").upsert({
    key: SETTINGS_KEY,
    value: clean,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return clean;
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

async function sendMail(recipients: string[], subject: string, html: string) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn("[email] Thiếu SMTP_HOST/SMTP_USER/SMTP_PASS — bỏ qua gửi mail");
    return;
  }
  const port = Number(process.env.SMTP_PORT ?? 465);

  const nodemailer = (await import("nodemailer")).default;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? user,
    to: recipients.join(", "),
    subject,
    html,
  });
}

async function getQuizTitle(attempt: Attempt): Promise<string> {
  if (attempt.quiz?.title) return attempt.quiz.title;
  if (USE_MOCK) {
    return (
      db.quizzes.find((q) => q.id === attempt.quiz_id)?.title ?? "Quiz"
    );
  }
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("quizzes")
      .select("title")
      .eq("id", attempt.quiz_id)
      .maybeSingle();
    return data?.title ?? "Quiz";
  } catch {
    return "Quiz";
  }
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });
}

function wrapHtml(title: string, rows: [string, string][]) {
  const trs = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;white-space:nowrap">${k}</td><td style="padding:6px 0;font-weight:600;color:#0f172a">${v}</td></tr>`
    )
    .join("");
  return `<div style="font-family:Arial,sans-serif;max-width:520px">
    <h2 style="color:#0f766e;margin:0 0 12px">${title}</h2>
    <table style="border-collapse:collapse;font-size:14px">${trs}</table>
  </div>`;
}

/** Gửi mail thử — throw để UI hiển thị lỗi SMTP nếu có. */
export async function sendTestEmail() {
  const settings = await loadNotificationSettings();
  if (!settings.recipients.length) {
    throw new Error("Chưa có người nhận nào — lưu cấu hình trước khi gửi thử");
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Thiếu biến môi trường SMTP_HOST / SMTP_USER / SMTP_PASS");
  }
  await sendMail(
    settings.recipients,
    "✅ Email thử từ Tutor Quiz",
    wrapHtml("Cấu hình email hoạt động!", [
      ["Thời gian", fmtTime(new Date().toISOString())],
      ["Người nhận", settings.recipients.join(", ")],
    ])
  );
}

/** Học sinh bắt đầu làm bài. Không throw — chỉ log lỗi. */
export async function notifyAttemptStarted(attempt: Attempt) {
  try {
    const settings = await loadNotificationSettings();
    if (!settings.enabled || !settings.notify_on_start) return;
    if (!settings.recipients.length) return;

    const quizTitle = await getQuizTitle(attempt);
    const name = attempt.guest_name ?? "Học sinh";
    const subject = `📝 ${name} bắt đầu làm "${quizTitle}"`;
    const html = wrapHtml("Học sinh bắt đầu làm bài", [
      ["Học sinh", name],
      ["Quiz", quizTitle],
      ["Loại", attempt.is_retry_wrong ? "Làm lại câu sai" : "Làm bài mới"],
      ["Số câu", String(attempt.total_questions)],
      ["Bắt đầu lúc", fmtTime(attempt.started_at)],
    ]);
    await sendMail(settings.recipients, subject, html);
  } catch (err) {
    console.error("[email] Gửi thông báo bắt đầu thất bại:", err);
  }
}

/** Học sinh nộp bài — kèm kết quả. Không throw — chỉ log lỗi. */
export async function notifyAttemptSubmitted(attempt: Attempt) {
  try {
    const settings = await loadNotificationSettings();
    if (!settings.enabled || !settings.notify_on_submit) return;
    if (!settings.recipients.length) return;

    const quizTitle = await getQuizTitle(attempt);
    const name = attempt.guest_name ?? "Học sinh";
    const percent =
      attempt.max_score > 0
        ? Math.round((attempt.score * 100) / attempt.max_score)
        : 0;
    const passed = attempt.passed
      ? "✅ Đạt"
      : attempt.passed === false
        ? "❌ Chưa đạt"
        : "—";
    const subject = `📊 ${name} nộp "${quizTitle}" — ${attempt.correct_count}/${attempt.total_questions} câu đúng (${percent}%)`;
    const html = wrapHtml("Học sinh đã nộp bài", [
      ["Học sinh", name],
      ["Quiz", quizTitle],
      ["Loại", attempt.is_retry_wrong ? "Làm lại câu sai" : "Làm bài mới"],
      ["Điểm", `${attempt.score}/${attempt.max_score} (${percent}%)`],
      [
        "Số câu đúng",
        `${attempt.correct_count}/${attempt.total_questions}`,
      ],
      ["Kết quả", passed],
      [
        "Thời gian làm",
        attempt.duration_seconds != null
          ? `${Math.floor(attempt.duration_seconds / 60)} phút ${attempt.duration_seconds % 60} giây`
          : "—",
      ],
      ["Nộp lúc", fmtTime(attempt.submitted_at)],
      [
        "Trạng thái",
        attempt.status === "expired" ? "Hết giờ (tự nộp)" : "Nộp bài",
      ],
    ]);
    await sendMail(settings.recipients, subject, html);
  } catch (err) {
    console.error("[email] Gửi thông báo nộp bài thất bại:", err);
  }
}

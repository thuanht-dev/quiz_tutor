export const APP_NAME = "Teddy Quiz";
export const STUDENT_EMAIL_DOMAIN = "students.local";

export function usernameToEmail(username: string) {
  return `${username.toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
}

export const QUIZ_STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  published: "Đã xuất bản",
  archived: "Lưu trữ",
};

export const SUBJECT_COLORS = [
  "#F97316",
  "#22C55E",
  "#0EA5E9",
  "#EAB308",
  "#EF4444",
  "#14B8A6",
  "#EC4899",
  "#6366F1",
];

export const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

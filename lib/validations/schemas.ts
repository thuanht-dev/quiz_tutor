import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Tên đăng nhập tối thiểu 3 ký tự")
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Chỉ dùng chữ, số và gạch dưới"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export const subjectSchema = z.object({
  name: z.string().min(1, "Nhập tên môn học"),
  color: z.string().min(1),
  icon: z.string().optional().nullable(),
  sort_order: z.number().int(),
});

export const quizSchema = z.object({
  title: z.string().min(1, "Nhập tên quiz"),
  subject_id: z.string().min(1, "Chọn môn học"),
  description: z.string().optional().nullable(),
  time_limit_seconds: z.number().int().positive().optional().nullable(),
  pass_percent: z.number().int().min(1).max(100),
  status: z.enum(["draft", "published", "archived"]),
});

export const questionSchema = z.object({
  subject_id: z.string().min(1, "Chọn môn học"),
  content: z.string().min(1, "Nhập nội dung câu hỏi"),
  image_url: z.string().optional().nullable().or(z.literal("")),
  explanation: z.string().optional().nullable(),
  points: z.number().int().positive(),
  option_a: z.string().min(1, "Nhập đáp án A"),
  option_b: z.string().min(1, "Nhập đáp án B"),
  option_c: z.string().min(1, "Nhập đáp án C"),
  option_d: z.string().min(1, "Nhập đáp án D"),
  correct_answer: z.enum(["A", "B", "C", "D"]),
});

export const studentSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/, "Chỉ dùng chữ thường, số và gạch dưới"),
  display_name: z.string().min(1, "Nhập tên hiển thị"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").optional(),
  is_active: z.boolean(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SubjectValues = z.infer<typeof subjectSchema>;
export type QuizValues = z.infer<typeof quizSchema>;
export type QuestionValues = z.infer<typeof questionSchema>;
export type StudentValues = z.infer<typeof studentSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

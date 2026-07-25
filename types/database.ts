export type UserRole = "admin" | "student";
export type QuizStatus = "draft" | "published" | "archived";
export type AttemptStatus = "in_progress" | "submitted" | "expired";
export type OptionLabel = "A" | "B" | "C" | "D";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}

export interface Quiz {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  time_limit_seconds: number | null;
  pass_percent: number;
  auto_advance_on_answer: boolean;
  show_explanation_on_answer: boolean;
  status: QuizStatus;
  created_at: string;
  updated_at?: string;
  subject?: Subject;
  question_count?: number;
}

export interface Question {
  id: string;
  subject_id: string;
  content: string;
  image_url: string | null;
  explanation: string | null;
  points: number;
  created_at: string;
  updated_at?: string;
  options?: Option[];
  subject?: Subject;
}

export interface Option {
  id: string;
  question_id: string;
  label: OptionLabel;
  content: string;
  is_correct: boolean;
  sort_order: number;
}

export interface QuizQuestion {
  quiz_id: string;
  question_id: string;
  sort_order: number;
  question?: Question;
}

export interface Attempt {
  id: string;
  quiz_id: string;
  student_id: string | null;
  guest_name: string | null;
  guest_id: string | null;
  started_at: string;
  submitted_at: string | null;
  score: number;
  max_score: number;
  correct_count: number;
  total_questions: number;
  duration_seconds: number | null;
  status: AttemptStatus;
  passed: boolean | null;
  parent_attempt_id: string | null;
  is_retry_wrong: boolean;
  created_at: string;
  quiz?: Quiz;
  student?: Profile;
  answers?: AttemptAnswer[];
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  selected_option_label: string | null;
  selected_option_content: string | null;
  is_correct: boolean;
  points_awarded: number;
  question?: Question;
  correct_option?: Option;
}

export interface DashboardStats {
  attempt_count: number;
  in_progress_count: number;
  quiz_count: number;
  question_count: number;
  recent_attempts: Attempt[];
}

export interface StudentQuizCard extends Quiz {
  best_score: number | null;
  best_max_score: number | null;
  attempt_count: number;
  completed: boolean;
  best_passed: boolean | null;
}

export interface ImportQuestionRow {
  Question: string;
  A: string;
  B: string;
  C: string;
  D: string;
  "Correct Answer": string;
  Explanation?: string;
  "Image URL"?: string;
}

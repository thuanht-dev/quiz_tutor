"use server";

import { USE_MOCK } from "@/lib/constants";
import {
  db,
  enrichAttempt,
  enrichQuestion,
  enrichQuiz,
  getCorrectOption,
  getQuizQuestionsDetailed,
  uid,
} from "@/lib/repositories/mock-db";
import { createClient } from "@/lib/supabase/server";
import type {
  Attempt,
  DashboardStats,
  ImportQuestionRow,
  Option,
  OptionLabel,
  Question,
  Quiz,
  StudentQuizCard,
  Subject,
} from "@/types/database";
import type {
  QuestionValues,
  QuizValues,
  SubjectValues,
} from "@/lib/validations/schemas";
import { getCurrentProfile } from "@/lib/auth/actions";
import { after } from "next/server";
import {
  loadNotificationSettings,
  notifyAttemptStarted,
  notifyAttemptSubmitted,
  saveNotificationSettings,
} from "@/lib/email/notifications";
import type { NotificationSettings } from "@/types/database";

function delay(_ms = 0) {
  // No artificial latency — mock should feel instant
  return Promise.resolve();
}

/** Keep newest in_progress per guest+quiz; leave submitted/expired untouched. */
function dedupeAttemptsForAdmin(rows: Attempt[]): Attempt[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (b.status === "in_progress" && a.status !== "in_progress") return 1;
    return (
      new Date(b.submitted_at ?? b.started_at).getTime() -
      new Date(a.submitted_at ?? a.started_at).getTime()
    );
  });

  const seen = new Set<string>();
  const out: Attempt[] = [];
  for (const a of sorted) {
    const key =
      a.status === "in_progress"
        ? `ip:${a.guest_id ?? a.guest_name}|${a.quiz_id}|${a.is_retry_wrong ? 1 : 0}|${a.parent_attempt_id ?? ""}`
        : a.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export async function getDashboardStats(): Promise<DashboardStats> {
  if (USE_MOCK) {
    await delay();
    const all = dedupeAttemptsForAdmin(db.attempts.map(enrichAttempt));
    const completed = all.filter((a) => a.status !== "in_progress");
    const inProgress = all.filter((a) => a.status === "in_progress");
    return {
      attempt_count: completed.length,
      in_progress_count: inProgress.length,
      quiz_count: db.quizzes.length,
      question_count: db.questions.length,
      recent_attempts: all.slice(0, 8),
    };
  }

  const supabase = await createClient();
  // One recent fetch covers "đang làm" + hoạt động gần đây (avoid loading all in_progress)
  const [
    { count: attempt_count },
    { count: in_progress_count },
    { count: quiz_count },
    { count: question_count },
    recent,
  ] = await Promise.all([
    supabase
      .from("attempts")
      .select("*", { count: "exact", head: true })
      .neq("status", "in_progress"),
    supabase
      .from("attempts")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress"),
    supabase.from("quizzes").select("*", { count: "exact", head: true }),
    supabase.from("questions").select("*", { count: "exact", head: true }),
    supabase
      .from("attempts")
      .select("*, quiz:quizzes(*, subject:subjects(*)), student:profiles(*)")
      .order("started_at", { ascending: false })
      .limit(24),
  ]);

  const recentRows = dedupeAttemptsForAdmin((recent.data ?? []) as Attempt[]);

  return {
    attempt_count: attempt_count ?? 0,
    in_progress_count: in_progress_count ?? 0,
    quiz_count: quiz_count ?? 0,
    question_count: question_count ?? 0,
    recent_attempts: recentRows.slice(0, 8),
  };
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------
export async function listSubjects(): Promise<Subject[]> {
  if (USE_MOCK) {
    await delay();
    return [...db.subjects].sort((a, b) => a.sort_order - b.sort_order);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data as Subject[];
}

export async function createSubject(values: SubjectValues) {
  if (USE_MOCK) {
    const subject: Subject = {
      id: uid(),
      name: values.name,
      color: values.color,
      icon: values.icon ?? null,
      sort_order: values.sort_order ?? 0,
      created_at: new Date().toISOString(),
    };
    db.subjects.push(subject);
    return subject;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      name: values.name,
      color: values.color,
      icon: values.icon ?? null,
      sort_order: values.sort_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Subject;
}

export async function updateSubject(id: string, values: SubjectValues) {
  if (USE_MOCK) {
    const idx = db.subjects.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error("Không tìm thấy môn học");
    db.subjects[idx] = {
      ...db.subjects[idx],
      name: values.name,
      color: values.color,
      icon: values.icon ?? null,
      sort_order: values.sort_order ?? 0,
    };
    return db.subjects[idx];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .update({
      name: values.name,
      color: values.color,
      icon: values.icon ?? null,
      sort_order: values.sort_order ?? 0,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Subject;
}

export async function deleteSubject(id: string) {
  if (USE_MOCK) {
    db.subjects = db.subjects.filter((s) => s.id !== id);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------
export async function listQuizzes(filters?: {
  subject_id?: string;
  status?: string;
}): Promise<Quiz[]> {
  if (USE_MOCK) {
    await delay();
    return db.quizzes
      .filter((q) => !filters?.subject_id || q.subject_id === filters.subject_id)
      .filter((q) => !filters?.status || q.status === filters.status)
      .map(enrichQuiz)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
  const supabase = await createClient();
  let query = supabase
    .from("quizzes")
    .select("*, subject:subjects(*), quiz_questions(count)")
    .order("created_at", { ascending: false });
  if (filters?.subject_id) query = query.eq("subject_id", filters.subject_id);
  if (filters?.status) query = query.eq("status", filters.status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    question_count: row.quiz_questions?.[0]?.count ?? 0,
  })) as Quiz[];
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  if (USE_MOCK) {
    const quiz = db.quizzes.find((q) => q.id === id);
    return quiz ? enrichQuiz(quiz) : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("*, subject:subjects(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Quiz | null;
}

export async function createQuiz(values: QuizValues) {
  if (USE_MOCK) {
    const quiz: Quiz = {
      id: uid(),
      subject_id: values.subject_id,
      title: values.title,
      description: values.description ?? null,
      time_limit_seconds: values.time_limit_seconds ?? null,
      pass_percent: values.pass_percent ?? 85,
      retry_wrong_after_fails: values.retry_wrong_after_fails ?? 3,
      auto_advance_on_answer: values.auto_advance_on_answer ?? false,
      show_explanation_on_answer: values.show_explanation_on_answer ?? false,
      status: values.status,
      created_at: new Date().toISOString(),
    };
    db.quizzes.push(quiz);
    return enrichQuiz(quiz);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      subject_id: values.subject_id,
      title: values.title,
      description: values.description ?? null,
      time_limit_seconds: values.time_limit_seconds ?? null,
      pass_percent: values.pass_percent ?? 85,
      retry_wrong_after_fails: values.retry_wrong_after_fails ?? 3,
      auto_advance_on_answer: values.auto_advance_on_answer ?? false,
      show_explanation_on_answer: values.show_explanation_on_answer ?? false,
      status: values.status,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Quiz;
}

export async function updateQuiz(id: string, values: QuizValues) {
  if (USE_MOCK) {
    const idx = db.quizzes.findIndex((q) => q.id === id);
    if (idx < 0) throw new Error("Không tìm thấy quiz");
    db.quizzes[idx] = {
      ...db.quizzes[idx],
      ...values,
      description: values.description ?? null,
      time_limit_seconds: values.time_limit_seconds ?? null,
      pass_percent: values.pass_percent ?? 85,
      retry_wrong_after_fails: values.retry_wrong_after_fails ?? 3,
      auto_advance_on_answer: values.auto_advance_on_answer ?? false,
      show_explanation_on_answer: values.show_explanation_on_answer ?? false,
    };
    return enrichQuiz(db.quizzes[idx]);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .update({
      subject_id: values.subject_id,
      title: values.title,
      description: values.description ?? null,
      time_limit_seconds: values.time_limit_seconds ?? null,
      pass_percent: values.pass_percent ?? 85,
      retry_wrong_after_fails: values.retry_wrong_after_fails ?? 3,
      auto_advance_on_answer: values.auto_advance_on_answer ?? false,
      show_explanation_on_answer: values.show_explanation_on_answer ?? false,
      status: values.status,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Quiz;
}

export async function deleteQuiz(id: string) {
  if (USE_MOCK) {
    const attemptIds = db.attempts
      .filter((a) => a.quiz_id === id)
      .map((a) => a.id);
    db.attemptAnswers = db.attemptAnswers.filter(
      (a) => !attemptIds.includes(a.attempt_id)
    );
    db.attempts = db.attempts.filter((a) => a.quiz_id !== id);
    db.quizQuestions = db.quizQuestions.filter((qq) => qq.quiz_id !== id);
    db.quizzes = db.quizzes.filter((q) => q.id !== id);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_quiz", {
    p_quiz_id: id,
  });
  if (error) {
    if (
      error.code === "23503" ||
      error.code === "PGRST202" ||
      /foreign key|violates|could not find the function/i.test(error.message)
    ) {
      throw new Error(
        "Không xoá được quiz vì còn bài làm liên quan. Hãy chạy migration 20260324000006_admin_delete_cascade.sql trên Supabase rồi thử lại."
      );
    }
    throw error;
  }
}

export async function listQuizQuestions(quizId: string): Promise<Question[]> {
  if (USE_MOCK) {
    await delay();
    return getQuizQuestionsDetailed(quizId);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("sort_order, question:questions(*, options(*))")
    .eq("quiz_id", quizId)
    .order("sort_order");
  if (error) throw error;
  const rows = (data ?? []) as unknown as {
    question: Question & { options?: Option[] };
  }[];
  return rows.map((row) => ({
    ...row.question,
    options: (row.question.options ?? []).sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  }));
}

export async function setQuizQuestions(quizId: string, questionIds: string[]) {
  if (USE_MOCK) {
    db.quizQuestions = db.quizQuestions.filter((qq) => qq.quiz_id !== quizId);
    questionIds.forEach((question_id, i) => {
      db.quizQuestions.push({
        quiz_id: quizId,
        question_id,
        sort_order: i + 1,
      });
    });
    return;
  }
  const supabase = await createClient();
  await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);
  if (questionIds.length) {
    const { error } = await supabase.from("quiz_questions").insert(
      questionIds.map((question_id, i) => ({
        quiz_id: quizId,
        question_id,
        sort_order: i + 1,
      }))
    );
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------
export async function listQuestions(filters?: {
  subject_id?: string;
  search?: string;
}): Promise<Question[]> {
  if (USE_MOCK) {
    await delay();
    const search = filters?.search?.toLowerCase().trim();
    return db.questions
      .filter((q) => !filters?.subject_id || q.subject_id === filters.subject_id)
      .filter((q) => !search || q.content.toLowerCase().includes(search))
      .map(enrichQuestion)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
  const supabase = await createClient();
  let query = supabase
    .from("questions")
    .select("*, subject:subjects(*), options(*)")
    .order("created_at", { ascending: false });
  if (filters?.subject_id) query = query.eq("subject_id", filters.subject_id);
  if (filters?.search) query = query.ilike("content", `%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((q) => ({
    ...q,
    options: (q.options ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
    ),
  })) as Question[];
}

export async function getQuestion(id: string): Promise<Question | null> {
  if (USE_MOCK) {
    const q = db.questions.find((x) => x.id === id);
    return q ? enrichQuestion(q) : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .select("*, subject:subjects(*), options(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    options: (data.options ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
    ),
  } as Question;
}

function buildOptionsFromValues(questionId: string, values: QuestionValues) {
  const map: Record<OptionLabel, string> = {
    A: values.option_a,
    B: values.option_b,
    C: values.option_c,
    D: values.option_d,
  };
  return (["A", "B", "C", "D"] as OptionLabel[]).map((label, i) => ({
    id: uid(),
    question_id: questionId,
    label,
    content: map[label],
    is_correct: values.correct_answer === label,
    sort_order: i + 1,
  }));
}

export async function createQuestion(values: QuestionValues) {
  if (USE_MOCK) {
    const id = uid();
    const question: Question = {
      id,
      subject_id: values.subject_id,
      content: values.content,
      image_url: values.image_url || null,
      explanation: values.explanation ?? null,
      points: values.points ?? 1,
      created_at: new Date().toISOString(),
      options: buildOptionsFromValues(id, values),
    };
    db.questions.push(question);
    return enrichQuestion(question);
  }

  const supabase = await createClient();
  const { data: question, error } = await supabase
    .from("questions")
    .insert({
      subject_id: values.subject_id,
      content: values.content,
      image_url: values.image_url || null,
      explanation: values.explanation ?? null,
      points: values.points ?? 1,
    })
    .select()
    .single();
  if (error) throw error;

  const options = (["A", "B", "C", "D"] as OptionLabel[]).map((label, i) => ({
    question_id: question.id,
    label,
    content:
      label === "A"
        ? values.option_a
        : label === "B"
          ? values.option_b
          : label === "C"
            ? values.option_c
            : values.option_d,
    is_correct: values.correct_answer === label,
    sort_order: i + 1,
  }));
  const { error: optError } = await supabase.from("options").insert(options);
  if (optError) throw optError;
  return getQuestion(question.id);
}

export async function updateQuestion(id: string, values: QuestionValues) {
  if (USE_MOCK) {
    const idx = db.questions.findIndex((q) => q.id === id);
    if (idx < 0) throw new Error("Không tìm thấy câu hỏi");
    db.questions[idx] = {
      ...db.questions[idx],
      subject_id: values.subject_id,
      content: values.content,
      image_url: values.image_url || null,
      explanation: values.explanation ?? null,
      points: values.points ?? 1,
      options: buildOptionsFromValues(id, values),
    };
    return enrichQuestion(db.questions[idx]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("questions")
    .update({
      subject_id: values.subject_id,
      content: values.content,
      image_url: values.image_url || null,
      explanation: values.explanation ?? null,
      points: values.points ?? 1,
    })
    .eq("id", id);
  if (error) throw error;

  await supabase.from("options").delete().eq("question_id", id);
  const options = (["A", "B", "C", "D"] as OptionLabel[]).map((label, i) => ({
    question_id: id,
    label,
    content:
      label === "A"
        ? values.option_a
        : label === "B"
          ? values.option_b
          : label === "C"
            ? values.option_c
            : values.option_d,
    is_correct: values.correct_answer === label,
    sort_order: i + 1,
  }));
  const { error: optError } = await supabase.from("options").insert(options);
  if (optError) throw optError;
  return getQuestion(id);
}

export async function deleteQuestion(id: string) {
  if (USE_MOCK) {
    db.attemptAnswers = db.attemptAnswers.filter((a) => a.question_id !== id);
    db.quizQuestions = db.quizQuestions.filter((qq) => qq.question_id !== id);
    db.questions = db.questions.filter((q) => q.id !== id);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_question", {
    p_question_id: id,
  });
  if (error) {
    if (
      error.code === "23503" ||
      error.code === "PGRST202" ||
      /foreign key|violates|could not find the function/i.test(error.message)
    ) {
      throw new Error(
        "Không xoá được câu hỏi vì còn dữ liệu liên quan. Hãy chạy migration 20260324000006_admin_delete_cascade.sql trên Supabase rồi thử lại."
      );
    }
    throw error;
  }
}

/** Append questions to a quiz (keeps existing order, skips duplicates). */
export async function addQuestionsToQuiz(
  quizId: string,
  questionIds: string[]
) {
  const current = await listQuizQuestions(quizId);
  const ids = current.map((q) => q.id);
  for (const id of questionIds) {
    if (!ids.includes(id)) ids.push(id);
  }
  await setQuizQuestions(quizId, ids);
}

export async function copyQuestion(id: string) {
  const source = await getQuestion(id);
  if (!source || !source.options) throw new Error("Không tìm thấy câu hỏi");
  const correct = source.options.find((o) => o.is_correct)?.label ?? "A";
  const map = Object.fromEntries(
    source.options.map((o) => [o.label, o.content])
  ) as Record<OptionLabel, string>;

  return createQuestion({
    subject_id: source.subject_id,
    content: `${source.content} (bản sao)`,
    image_url: source.image_url,
    explanation: source.explanation,
    points: source.points,
    option_a: map.A,
    option_b: map.B,
    option_c: map.C,
    option_d: map.D,
    correct_answer: correct,
  });
}

export async function importQuestions(
  subjectId: string,
  rows: ImportQuestionRow[]
) {
  const created: Question[] = [];
  for (const row of rows) {
    const correct = String(row["Correct Answer"] ?? "")
      .trim()
      .toUpperCase() as OptionLabel;
    if (!["A", "B", "C", "D"].includes(correct)) {
      throw new Error(`Đáp án đúng không hợp lệ: ${row["Correct Answer"]}`);
    }
    const q = await createQuestion({
      subject_id: subjectId,
      content: String(row.Question ?? "").trim(),
      option_a: String(row.A ?? "").trim(),
      option_b: String(row.B ?? "").trim(),
      option_c: String(row.C ?? "").trim(),
      option_d: String(row.D ?? "").trim(),
      correct_answer: correct,
      explanation: row.Explanation ? String(row.Explanation) : null,
      image_url: row["Image URL"] ? String(row["Image URL"]) : null,
      points: 1,
    });
    if (q) created.push(q);
  }
  return created;
}

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------
export async function listAttempts(filters?: {
  guest_name?: string;
  quiz_id?: string;
  status?: Attempt["status"] | "all";
}): Promise<Attempt[]> {
  const statusFilter = filters?.status ?? "all";

  if (USE_MOCK) {
    await delay();
    const name = filters?.guest_name?.trim().toLowerCase();
    return dedupeAttemptsForAdmin(
      db.attempts
        .filter((a) => statusFilter === "all" || a.status === statusFilter)
        .filter(
          (a) =>
            !name ||
            (a.guest_name ?? "").toLowerCase().includes(name)
        )
        .filter((a) => !filters?.quiz_id || a.quiz_id === filters.quiz_id)
        .map(enrichAttempt)
    );
  }
  const supabase = await createClient();
  let query = supabase
    .from("attempts")
    .select("*, quiz:quizzes(*, subject:subjects(*)), student:profiles(*)")
    .order("started_at", { ascending: false });
  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  if (filters?.guest_name?.trim()) {
    query = query.ilike("guest_name", `%${filters.guest_name.trim()}%`);
  }
  if (filters?.quiz_id) query = query.eq("quiz_id", filters.quiz_id);
  const { data, error } = await query;
  if (error) throw error;
  return dedupeAttemptsForAdmin((data ?? []) as Attempt[]);
}

export async function deleteAttempt(id: string) {
  if (USE_MOCK) {
    db.attemptAnswers = db.attemptAnswers.filter((a) => a.attempt_id !== id);
    db.attempts = db.attempts.filter((a) => a.id !== id);
    // Clear parent links from retries that pointed here
    for (const a of db.attempts) {
      if (a.parent_attempt_id === id) a.parent_attempt_id = null;
    }
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("attempts").delete().eq("id", id);
  if (error) {
    if (error.code === "42501" || /policy|permission/i.test(error.message)) {
      throw new Error(
        "Không có quyền xoá bài làm. Hãy chạy migration 20260324000006_admin_delete_cascade.sql trên Supabase."
      );
    }
    throw error;
  }
}

export async function getAttempt(
  id: string,
  guestId?: string | null
): Promise<Attempt | null> {
  if (USE_MOCK) {
    const attempt = db.attempts.find((a) => a.id === id);
    if (!attempt) return null;
    if (guestId && attempt.guest_id !== guestId) return null;
    const answers = db.attemptAnswers
      .filter((ans) => ans.attempt_id === id)
      .map((ans) => {
        const question = db.questions.find((q) => q.id === ans.question_id);
        return {
          ...ans,
          question: question ? enrichQuestion(question) : undefined,
          correct_option: getCorrectOption(ans.question_id),
        };
      });
    return { ...enrichAttempt(attempt), answers };
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (profile?.role === "admin") {
    const { data, error } = await supabase
      .from("attempts")
      .select(
        "*, quiz:quizzes(*, subject:subjects(*)), student:profiles(*), answers:attempt_answers(*, question:questions(*, options(*)))"
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const answers = (data.answers ?? []).map(
      (ans: {
        question_id: string;
        question?: Question & { options?: { is_correct: boolean }[] };
      }) => ({
        ...ans,
        correct_option: ans.question?.options?.find((o) => o.is_correct),
      })
    );

    return { ...data, answers } as Attempt;
  }

  if (!guestId) return null;

  const { data: attempt, error: attemptError } = await supabase.rpc(
    "get_guest_attempt",
    { p_attempt_id: id, p_guest_id: guestId }
  );
  if (attemptError) throw attemptError;
  if (!attempt) return null;

  const [{ data: answers }, { data: quiz }] = await Promise.all([
    supabase.rpc("get_guest_attempt_answers", {
      p_attempt_id: id,
      p_guest_id: guestId,
    }),
    supabase
      .from("quizzes")
      .select("*, subject:subjects(*)")
      .eq("id", (attempt as Attempt).quiz_id)
      .maybeSingle(),
  ]);

  const questionIds = [
    ...new Set(((answers as { question_id: string }[]) ?? []).map((a) => a.question_id)),
  ];
  const { data: questions } =
    questionIds.length > 0
      ? await supabase
          .from("questions")
          .select("*, options(*)")
          .in("id", questionIds)
      : { data: [] as Question[] };

  const questionMap = new Map(
    ((questions ?? []) as Question[]).map((q) => [q.id, q])
  );

  const enrichedAnswers = ((answers as Attempt["answers"]) ?? []).map((ans) => {
    const question = questionMap.get(ans.question_id);
    return {
      ...ans,
      question,
      correct_option: question?.options?.find((o) => o.is_correct),
    };
  });

  return {
    ...(attempt as Attempt),
    quiz: quiz as Quiz | undefined,
    answers: enrichedAnswers,
  };
}

export async function listStudentHomeData(guestId: string) {
  if (USE_MOCK) {
    await delay();
    const quizzes = db.quizzes
      .filter((q) => q.status === "published")
      .map(enrichQuiz)
      .map((quiz) => {
        const attempts = db.attempts.filter(
          (a) =>
            a.guest_id === guestId &&
            a.quiz_id === quiz.id &&
            a.status !== "in_progress" &&
            !a.is_retry_wrong
        );
        const best = attempts.reduce<Attempt | null>((acc, cur) => {
          if (!acc || cur.score > acc.score) return cur;
          return acc;
        }, null);
        const card: StudentQuizCard = {
          ...quiz,
          best_score: best?.score ?? null,
          best_max_score: best?.max_score ?? null,
          attempt_count: attempts.length,
          completed: attempts.length > 0,
          best_passed: best?.passed ?? null,
        };
        return card;
      });

    const recent = db.attempts
      .filter((a) => a.guest_id === guestId && a.status !== "in_progress")
      .map(enrichAttempt)
      .sort(
        (a, b) =>
          new Date(b.submitted_at ?? 0).getTime() -
          new Date(a.submitted_at ?? 0).getTime()
      )
      .slice(0, 5);

    return { quizzes, recent };
  }

  const supabase = await createClient();
  const [{ data: quizzes }, { data: attempts }] = await Promise.all([
    supabase
      .from("quizzes")
      .select("*, subject:subjects(*), quiz_questions(count)")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase.rpc("list_guest_attempts", { p_guest_id: guestId }),
  ]);

  const attemptList = (attempts ?? []) as Attempt[];

  const cards: StudentQuizCard[] = (quizzes ?? []).map((quiz) => {
    const mine = attemptList.filter(
      (a) => a.quiz_id === quiz.id && !a.is_retry_wrong
    );
    const best = mine.reduce<Attempt | null>((acc, cur) => {
      if (!acc || cur.score > acc.score) return cur;
      return acc;
    }, null);
    return {
      ...quiz,
      question_count: quiz.quiz_questions?.[0]?.count ?? 0,
      best_score: best?.score ?? null,
      best_max_score: best?.max_score ?? null,
      attempt_count: mine.length,
      completed: mine.length > 0,
      best_passed: best?.passed ?? null,
    } as StudentQuizCard;
  });

  const quizzesById = new Map(
    (quizzes ?? []).map((q) => [
      q.id,
      {
        ...q,
        question_count: q.quiz_questions?.[0]?.count ?? 0,
      } as Quiz,
    ])
  );

  const recent = attemptList.slice(0, 5).map((a) => ({
    ...a,
    quiz: quizzesById.get(a.quiz_id),
  }));

  return {
    quizzes: cards,
    recent,
  };
}

export async function countFailedFullAttempts(
  quizId: string,
  guestId: string
): Promise<number> {
  if (USE_MOCK) {
    return db.attempts.filter(
      (a) =>
        a.quiz_id === quizId &&
        a.guest_id === guestId &&
        !a.is_retry_wrong &&
        a.status !== "in_progress" &&
        a.passed === false
    ).length;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_guest_attempts", {
    p_guest_id: guestId,
  });
  if (error) throw error;
  return ((data as Attempt[]) ?? []).filter(
    (a) =>
      a.quiz_id === quizId &&
      !a.is_retry_wrong &&
      a.passed === false
  ).length;
}

export async function getRetryWrongEligibility(
  quizId: string,
  guestId: string
): Promise<{
  canRetryWrong: boolean;
  failCount: number;
  requiredFails: number;
}> {
  let requiredFails = 3;
  if (USE_MOCK) {
    requiredFails =
      db.quizzes.find((q) => q.id === quizId)?.retry_wrong_after_fails ?? 3;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("quizzes")
      .select("retry_wrong_after_fails")
      .eq("id", quizId)
      .maybeSingle();
    requiredFails = data?.retry_wrong_after_fails ?? 3;
  }

  const failCount = await countFailedFullAttempts(quizId, guestId);
  return {
    canRetryWrong: requiredFails > 0 && failCount >= requiredFails,
    failCount,
    requiredFails,
  };
}

export async function startAttempt(
  quizId: string,
  opts: {
    guestName: string;
    guestId: string;
    parentAttemptId?: string | null;
  }
): Promise<Attempt> {
  const guestName = opts.guestName.trim();
  const guestId = opts.guestId;
  if (!guestName || !guestId) {
    throw new Error("Cần nhập tên trước khi làm bài");
  }

  if (USE_MOCK) {
    const quiz = db.quizzes.find((q) => q.id === quizId);
    if (!quiz || quiz.status !== "published") {
      throw new Error("Quiz không khả dụng");
    }

    let questions = getQuizQuestionsDetailed(quizId);
    let is_retry_wrong = false;
    let parent_attempt_id: string | null = null;

    if (opts.parentAttemptId) {
      const parent = db.attempts.find(
        (a) =>
          a.id === opts.parentAttemptId &&
          a.guest_id === guestId &&
          a.quiz_id === quizId &&
          a.status !== "in_progress"
      );
      if (!parent) throw new Error("Không tìm thấy bài làm gốc");
      const wrongIds = db.attemptAnswers
        .filter((a) => a.attempt_id === opts.parentAttemptId && !a.is_correct)
        .map((a) => a.question_id);
      if (!wrongIds.length) throw new Error("Không còn câu sai để làm lại");
      questions = questions.filter((q) => wrongIds.includes(q.id));
      is_retry_wrong = true;
      parent_attempt_id = opts.parentAttemptId;
    }

    if (!questions.length) throw new Error("Quiz chưa có câu hỏi");

    // Reuse open attempt for same guest + quiz (avoid spam on refresh)
    const existing = db.attempts
      .filter(
        (a) =>
          a.quiz_id === quizId &&
          a.guest_id === guestId &&
          a.status === "in_progress" &&
          !!a.is_retry_wrong === is_retry_wrong &&
          (a.parent_attempt_id ?? null) === parent_attempt_id
      )
      .sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      )[0];

    if (existing) {
      const keepId = existing.id;
      db.attempts = db.attempts.filter(
        (a) =>
          !(
            a.quiz_id === quizId &&
            a.guest_id === guestId &&
            a.status === "in_progress" &&
            !!a.is_retry_wrong === is_retry_wrong &&
            (a.parent_attempt_id ?? null) === parent_attempt_id &&
            a.id !== keepId
          )
      );
      existing.guest_name = guestName;
      return enrichAttempt(existing);
    }

    if (is_retry_wrong) {
      const required = quiz.retry_wrong_after_fails ?? 3;
      if (required === 0) {
        throw new Error("Quiz này không cho làm lại câu sai");
      }
      const failCount = await countFailedFullAttempts(quizId, guestId);
      if (failCount < required) {
        throw new Error(
          `Cần chưa đạt ${required} lần mới được làm lại câu sai (hiện ${failCount}/${required})`
        );
      }
    }

    const attempt: Attempt = {
      id: uid(),
      quiz_id: quizId,
      student_id: null,
      guest_name: guestName,
      guest_id: guestId,
      started_at: new Date().toISOString(),
      submitted_at: null,
      score: 0,
      max_score: questions.reduce((s, q) => s + q.points, 0),
      correct_count: 0,
      total_questions: questions.length,
      duration_seconds: null,
      status: "in_progress",
      passed: null,
      parent_attempt_id,
      is_retry_wrong,
      created_at: new Date().toISOString(),
    };
    db.attempts.push(attempt);
    const enriched = enrichAttempt(attempt);
    after(() => notifyAttemptStarted(enriched));
    return enriched;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_attempt", {
    p_quiz_id: quizId,
    p_guest_name: guestName,
    p_guest_id: guestId,
    p_parent_attempt_id: opts.parentAttemptId ?? null,
  });
  if (error) throw error;
  const attempt = data as Attempt;

  // RPC may return a reused in-progress attempt (refresh). Only notify when
  // the attempt was just created to avoid spamming on every reload.
  const startedMs = new Date(attempt.started_at).getTime();
  if (Date.now() - startedMs < 10_000) {
    after(() => notifyAttemptStarted(attempt));
  }
  return attempt;
}

export async function submitAttempt(
  attemptId: string,
  answers: { question_id: string; selected_option_id: string | null }[],
  expired = false,
  guestId?: string | null
): Promise<Attempt> {
  if (USE_MOCK) {
    const attempt = db.attempts.find((a) => a.id === attemptId);
    if (!attempt || attempt.status !== "in_progress") {
      throw new Error("Attempt không hợp lệ");
    }
    if (guestId && attempt.guest_id !== guestId) {
      throw new Error("Không được nộp bài này");
    }

    db.attemptAnswers = db.attemptAnswers.filter(
      (a) => a.attempt_id !== attemptId
    );

    let score = 0;
    let correct_count = 0;

    for (const ans of answers) {
      const question = db.questions.find((q) => q.id === ans.question_id);
      if (!question) continue;
      const option = question.options?.find(
        (o) => o.id === ans.selected_option_id
      );
      const is_correct = !!option?.is_correct;
      const points_awarded = is_correct ? question.points : 0;
      if (is_correct) {
        score += points_awarded;
        correct_count += 1;
      }
      db.attemptAnswers.push({
        id: uid(),
        attempt_id: attemptId,
        question_id: ans.question_id,
        selected_option_id: option?.id ?? null,
        selected_option_label: option?.label ?? null,
        selected_option_content: option?.content ?? null,
        is_correct,
        points_awarded,
      });
    }

    const quiz = db.quizzes.find((q) => q.id === attempt.quiz_id);
    const percent =
      attempt.max_score > 0 ? (score * 100) / attempt.max_score : 0;
    attempt.score = score;
    attempt.correct_count = correct_count;
    attempt.submitted_at = new Date().toISOString();
    attempt.duration_seconds = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(attempt.started_at).getTime()) / 1000
      )
    );
    attempt.status = expired ? "expired" : "submitted";
    attempt.passed = percent >= (quiz?.pass_percent ?? 85);
    const enriched = enrichAttempt(attempt);
    after(() => notifyAttemptSubmitted(enriched));
    return enriched;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_attempt", {
    p_attempt_id: attemptId,
    p_answers: answers,
    p_expired: expired,
    p_guest_id: guestId ?? null,
  });
  if (error) throw error;
  const attempt = data as Attempt;
  after(() => notifyAttemptSubmitted(attempt));
  return attempt;
}

export async function getPlayQuiz(
  quizId: string,
  parentAttemptId?: string | null,
  guestId?: string | null
) {
  const quiz = await getQuiz(quizId);
  if (!quiz || quiz.status !== "published") return null;

  let questions = await listQuizQuestions(quizId);

  if (parentAttemptId) {
    const parent = await getAttempt(parentAttemptId, guestId);
    if (!parent || parent.quiz_id !== quizId) return null;
    const wrongIds = new Set(
      (parent.answers ?? [])
        .filter((a) => !a.is_correct)
        .map((a) => a.question_id)
    );
    questions = questions.filter((q) => wrongIds.has(q.id));
    if (!questions.length) return null;
  }

  // Reveal mode needs is_correct client-side for immediate feedback.
  // Otherwise strip it so network payloads don't leak the key during normal play.
  const revealAnswers = quiz.show_explanation_on_answer ?? false;
  const safeQuestions = questions.map((q) => ({
    ...q,
    options: revealAnswers
      ? (q.options ?? [])
      : (q.options?.map(({ is_correct: _omit, ...rest }) => rest) ?? []),
  }));
  return { quiz, questions: safeQuestions as Question[] };
}

// ---------------------------------------------------------------------------
// Notification settings (admin)
// ---------------------------------------------------------------------------
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") throw new Error("Không có quyền");
  return loadNotificationSettings();
}

export async function updateNotificationSettings(
  settings: NotificationSettings
): Promise<NotificationSettings> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") throw new Error("Không có quyền");
  return saveNotificationSettings(settings);
}

/** Gửi email thử tới danh sách người nhận đã cấu hình. */
export async function sendTestNotification(): Promise<void> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") throw new Error("Không có quyền");
  const { sendTestEmail } = await import("@/lib/email/notifications");
  await sendTestEmail();
}

/** One round-trip: load quiz + start/reuse attempt (faster play boot). */
export async function beginPlayQuiz(
  quizId: string,
  opts: {
    guestName: string;
    guestId: string;
    parentAttemptId?: string | null;
  }
) {
  const play = await getPlayQuiz(
    quizId,
    opts.parentAttemptId,
    opts.guestId
  );
  if (!play) return null;
  const attempt = await startAttempt(quizId, opts);
  return { ...play, attempt };
}

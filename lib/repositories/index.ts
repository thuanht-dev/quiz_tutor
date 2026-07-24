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
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/constants";
import type {
  Attempt,
  DashboardStats,
  ImportQuestionRow,
  Option,
  OptionLabel,
  Profile,
  Question,
  Quiz,
  StudentQuizCard,
  Subject,
} from "@/types/database";
import type {
  QuestionValues,
  QuizValues,
  StudentValues,
  SubjectValues,
} from "@/lib/validations/schemas";
import { getCurrentProfile } from "@/lib/auth/actions";

function delay(ms = 120) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export async function getDashboardStats(): Promise<DashboardStats> {
  if (USE_MOCK) {
    await delay();
    return {
      student_count: db.profiles.filter((p) => p.role === "student").length,
      quiz_count: db.quizzes.length,
      question_count: db.questions.length,
      recent_attempts: db.attempts
        .filter((a) => a.status !== "in_progress")
        .sort(
          (a, b) =>
            new Date(b.submitted_at ?? b.started_at).getTime() -
            new Date(a.submitted_at ?? a.started_at).getTime()
        )
        .slice(0, 8)
        .map(enrichAttempt),
    };
  }

  const supabase = await createClient();
  const [{ count: student_count }, { count: quiz_count }, { count: question_count }, recent] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student"),
      supabase.from("quizzes").select("*", { count: "exact", head: true }),
      supabase.from("questions").select("*", { count: "exact", head: true }),
      supabase
        .from("attempts")
        .select("*, quiz:quizzes(*, subject:subjects(*)), student:profiles(*)")
        .neq("status", "in_progress")
        .order("submitted_at", { ascending: false, nullsFirst: false })
        .limit(8),
    ]);

  return {
    student_count: student_count ?? 0,
    quiz_count: quiz_count ?? 0,
    question_count: question_count ?? 0,
    recent_attempts: (recent.data ?? []) as Attempt[],
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
    db.quizzes = db.quizzes.filter((q) => q.id !== id);
    db.quizQuestions = db.quizQuestions.filter((qq) => qq.quiz_id !== id);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  if (error) throw error;
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
    db.questions = db.questions.filter((q) => q.id !== id);
    db.quizQuestions = db.quizQuestions.filter((qq) => qq.question_id !== id);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
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
// Students
// ---------------------------------------------------------------------------
export async function listStudents(): Promise<Profile[]> {
  if (USE_MOCK) {
    await delay();
    return db.profiles
      .filter((p) => p.role === "student")
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("display_name");
  if (error) throw error;
  return data as Profile[];
}

export async function createStudent(values: StudentValues) {
  if (!values.password) throw new Error("Cần mật khẩu khi tạo học sinh");

  if (USE_MOCK) {
    if (db.profiles.some((p) => p.username === values.username)) {
      throw new Error("Username đã tồn tại");
    }
    const profile: Profile = {
      id: uid(),
      username: values.username,
      display_name: values.display_name,
      role: "student",
      avatar_url: null,
      is_active: values.is_active ?? true,
      created_at: new Date().toISOString(),
    };
    db.profiles.push(profile);
    db.passwords[values.username] = values.password;
    return profile;
  }

  const admin = createAdminClient();
  const email = usernameToEmail(values.username);
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: values.password,
    email_confirm: true,
    user_metadata: {
      username: values.username,
      display_name: values.display_name,
      role: "student",
    },
  });
  if (authError) throw authError;

  const { data, error } = await admin
    .from("profiles")
    .upsert({
      id: authData.user.id,
      username: values.username,
      display_name: values.display_name,
      role: "student",
      is_active: values.is_active ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateStudent(id: string, values: StudentValues) {
  if (USE_MOCK) {
    const idx = db.profiles.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error("Không tìm thấy học sinh");
    const oldUsername = db.profiles[idx].username;
    db.profiles[idx] = {
      ...db.profiles[idx],
      username: values.username,
      display_name: values.display_name,
      is_active: values.is_active ?? true,
    };
    if (values.password) {
      delete db.passwords[oldUsername];
      db.passwords[values.username] = values.password;
    } else if (oldUsername !== values.username) {
      db.passwords[values.username] = db.passwords[oldUsername];
      delete db.passwords[oldUsername];
    }
    return db.profiles[idx];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      username: values.username,
      display_name: values.display_name,
      is_active: values.is_active ?? true,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  if (values.password) {
    const { error: pwError } = await admin.auth.admin.updateUserById(id, {
      password: values.password,
      email: usernameToEmail(values.username),
    });
    if (pwError) throw pwError;
  }
  return data as Profile;
}

export async function deleteStudent(id: string) {
  if (USE_MOCK) {
    const profile = db.profiles.find((p) => p.id === id);
    if (profile) {
      profile.is_active = false;
    }
    return;
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw error;
}

export async function resetStudentPassword(id: string, password: string) {
  if (USE_MOCK) {
    const profile = db.profiles.find((p) => p.id === id);
    if (!profile) throw new Error("Không tìm thấy học sinh");
    db.passwords[profile.username] = password;
    return;
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------
export async function listAttempts(filters?: {
  student_id?: string;
  quiz_id?: string;
}): Promise<Attempt[]> {
  if (USE_MOCK) {
    await delay();
    return db.attempts
      .filter((a) => a.status !== "in_progress")
      .filter((a) => !filters?.student_id || a.student_id === filters.student_id)
      .filter((a) => !filters?.quiz_id || a.quiz_id === filters.quiz_id)
      .map(enrichAttempt)
      .sort(
        (a, b) =>
          new Date(b.submitted_at ?? b.started_at).getTime() -
          new Date(a.submitted_at ?? a.started_at).getTime()
      );
  }
  const supabase = await createClient();
  let query = supabase
    .from("attempts")
    .select("*, quiz:quizzes(*, subject:subjects(*)), student:profiles(*)")
    .neq("status", "in_progress")
    .order("submitted_at", { ascending: false });
  if (filters?.student_id) query = query.eq("student_id", filters.student_id);
  if (filters?.quiz_id) query = query.eq("quiz_id", filters.quiz_id);
  const { data, error } = await query;
  if (error) throw error;
  return data as Attempt[];
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  if (USE_MOCK) {
    const attempt = db.attempts.find((a) => a.id === id);
    if (!attempt) return null;
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

export async function listStudentHomeData(studentId: string) {
  if (USE_MOCK) {
    await delay();
    const quizzes = db.quizzes
      .filter((q) => q.status === "published")
      .map(enrichQuiz)
      .map((quiz) => {
        const attempts = db.attempts.filter(
          (a) =>
            a.student_id === studentId &&
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
      .filter((a) => a.student_id === studentId && a.status !== "in_progress")
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
    supabase
      .from("attempts")
      .select("*, quiz:quizzes(*, subject:subjects(*))")
      .eq("student_id", studentId)
      .neq("status", "in_progress")
      .order("submitted_at", { ascending: false }),
  ]);

  const cards: StudentQuizCard[] = (quizzes ?? []).map((quiz) => {
    const mine = (attempts ?? []).filter(
      (a) => a.quiz_id === quiz.id && !a.is_retry_wrong
    );
    const best = mine.reduce<Attempt | null>((acc, cur) => {
      if (!acc || cur.score > acc.score) return cur as Attempt;
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

  return {
    quizzes: cards,
    recent: (attempts ?? []).slice(0, 5) as Attempt[],
  };
}

export async function startAttempt(
  quizId: string,
  parentAttemptId?: string | null
): Promise<Attempt> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "student") {
    throw new Error("Chỉ học sinh mới được làm bài");
  }

  if (USE_MOCK) {
    const quiz = db.quizzes.find((q) => q.id === quizId);
    if (!quiz || quiz.status !== "published") {
      throw new Error("Quiz không khả dụng");
    }

    let questions = getQuizQuestionsDetailed(quizId);
    let is_retry_wrong = false;
    let parent_attempt_id: string | null = null;

    if (parentAttemptId) {
      const parent = db.attempts.find(
        (a) =>
          a.id === parentAttemptId &&
          a.student_id === profile.id &&
          a.quiz_id === quizId &&
          a.status !== "in_progress"
      );
      if (!parent) throw new Error("Không tìm thấy bài làm gốc");
      const wrongIds = db.attemptAnswers
        .filter((a) => a.attempt_id === parentAttemptId && !a.is_correct)
        .map((a) => a.question_id);
      if (!wrongIds.length) throw new Error("Không còn câu sai để làm lại");
      questions = questions.filter((q) => wrongIds.includes(q.id));
      is_retry_wrong = true;
      parent_attempt_id = parentAttemptId;
    }

    if (!questions.length) throw new Error("Quiz chưa có câu hỏi");
    const attempt: Attempt = {
      id: uid(),
      quiz_id: quizId,
      student_id: profile.id,
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
    return enrichAttempt(attempt);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_attempt", {
    p_quiz_id: quizId,
    p_parent_attempt_id: parentAttemptId ?? null,
  });
  if (error) throw error;
  return data as Attempt;
}

export async function submitAttempt(
  attemptId: string,
  answers: { question_id: string; selected_option_id: string | null }[],
  expired = false
): Promise<Attempt> {
  if (USE_MOCK) {
    const attempt = db.attempts.find((a) => a.id === attemptId);
    if (!attempt || attempt.status !== "in_progress") {
      throw new Error("Attempt không hợp lệ");
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
    return enrichAttempt(attempt);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_attempt", {
    p_attempt_id: attemptId,
    p_answers: answers,
    p_expired: expired,
  });
  if (error) throw error;
  return data as Attempt;
}

export async function getPlayQuiz(
  quizId: string,
  parentAttemptId?: string | null
) {
  const quiz = await getQuiz(quizId);
  if (!quiz || quiz.status !== "published") return null;

  let questions = await listQuizQuestions(quizId);

  if (parentAttemptId) {
    const parent = await getAttempt(parentAttemptId);
    if (!parent || parent.quiz_id !== quizId) return null;
    const wrongIds = new Set(
      (parent.answers ?? [])
        .filter((a) => !a.is_correct)
        .map((a) => a.question_id)
    );
    questions = questions.filter((q) => wrongIds.has(q.id));
    if (!questions.length) return null;
  }

  const safeQuestions = questions.map((q) => ({
    ...q,
    options: q.options?.map(({ is_correct: _omit, ...rest }) => rest) ?? [],
  }));
  return { quiz, questions: safeQuestions as Question[] };
}

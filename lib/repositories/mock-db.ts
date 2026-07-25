import {
  getAllOptions,
  mockAttemptAnswers,
  mockAttempts,
  mockPasswords,
  mockProfiles,
  mockQuestions,
  mockQuizQuestions,
  mockQuizzes,
  mockSubjects,
} from "@/lib/mock/data";
import type {
  Attempt,
  AttemptAnswer,
  Option,
  Profile,
  Question,
  Quiz,
  QuizQuestion,
  Subject,
} from "@/types/database";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export const db = {
  profiles: [...mockProfiles] as Profile[],
  subjects: [...mockSubjects] as Subject[],
  quizzes: [...mockQuizzes] as Quiz[],
  questions: clone(mockQuestions) as Question[],
  quizQuestions: [...mockQuizQuestions] as QuizQuestion[],
  attempts: [...mockAttempts] as Attempt[],
  attemptAnswers: [...mockAttemptAnswers] as AttemptAnswer[],
  passwords: { ...mockPasswords } as Record<string, string>,
  sessionUserId: null as string | null,
  appSettings: {} as Record<string, unknown>,
};

export function uid() {
  return crypto.randomUUID();
}

export function enrichQuiz(quiz: Quiz): Quiz {
  const subject = db.subjects.find((s) => s.id === quiz.subject_id);
  const question_count = db.quizQuestions.filter((qq) => qq.quiz_id === quiz.id).length;
  return { ...quiz, subject, question_count };
}

export function enrichQuestion(question: Question): Question {
  const subject = db.subjects.find((s) => s.id === question.subject_id);
  const options =
    question.options ??
    getAllOptions().filter((o) => o.question_id === question.id);
  // Prefer live options from question object
  const live = db.questions.find((q) => q.id === question.id);
  return {
    ...question,
    subject,
    options: live?.options ?? options,
  };
}

export function enrichAttempt(attempt: Attempt): Attempt {
  const quiz = db.quizzes.find((q) => q.id === attempt.quiz_id);
  const student = attempt.student_id
    ? db.profiles.find((p) => p.id === attempt.student_id)
    : undefined;
  return {
    ...attempt,
    quiz: quiz ? enrichQuiz(quiz) : undefined,
    student,
  };
}

export function getQuizQuestionsDetailed(quizId: string): Question[] {
  return db.quizQuestions
    .filter((qq) => qq.quiz_id === quizId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((qq) => {
      const question = db.questions.find((q) => q.id === qq.question_id);
      return question ? enrichQuestion(question) : null;
    })
    .filter(Boolean) as Question[];
}

export function getCorrectOption(questionId: string): Option | undefined {
  const question = db.questions.find((q) => q.id === questionId);
  return question?.options?.find((o) => o.is_correct);
}

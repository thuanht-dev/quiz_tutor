"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Home,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PendingLink } from "@/components/shared/pending-link";
import { cn } from "@/lib/utils";
import { formatDuration, scorePercent } from "@/lib/utils/format";
import type { Attempt, AttemptAnswer } from "@/types/database";

const CONFETTI_COLORS = ["#0EA5E9", "#22C55E", "#F97316", "#EAB308", "#EC4899", "#6366F1"];

function Confetti({ count }: { count: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.6 + Math.random() * 1.2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: 180 + Math.random() * 360,
        width: 5 + Math.random() * 5,
      })),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.width,
            height: p.width * 0.45,
            backgroundColor: p.color,
          }}
          initial={{ y: -20, opacity: 0, rotate: 0 }}
          animate={{ y: 340, opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

function ReviewItem({ index, answer }: { index: number; answer: AttemptAnswer }) {
  const question = answer.question;
  const options = question?.options ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="kid-card space-y-4 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-base font-bold text-slate-800">
          Câu {index + 1}. {question?.content ?? "Câu hỏi"}
        </p>
        <Badge
          className={cn(
            "shrink-0 gap-1",
            answer.is_correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          )}
        >
          {answer.is_correct ? (
            <CheckCircle2 className="size-3.5" />
          ) : (
            <XCircle className="size-3.5" />
          )}
          {answer.is_correct ? "Đúng" : "Sai"}
        </Badge>
      </div>

      {question?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.image_url}
          alt="Hình minh họa"
          className="max-h-56 w-full rounded-2xl bg-sky-50 object-contain"
        />
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = option.id === answer.selected_option_id;
          const isCorrectOption = option.is_correct;
          return (
            <div
              key={option.id}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium",
                isCorrectOption
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : isSelected
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-slate-100 bg-slate-50 text-slate-500"
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-white/70 text-xs font-bold">
                {option.label}
              </span>
              <span className="flex-1">{option.content}</span>
              {isCorrectOption ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : isSelected ? (
                <XCircle className="size-4 shrink-0" />
              ) : null}
            </div>
          );
        })}
      </div>

      {!answer.selected_option_id ? (
        <p className="text-sm italic text-slate-400">Con chưa trả lời câu này.</p>
      ) : null}

      {question?.explanation ? (
        <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <span className="font-bold">Giải thích: </span>
          {question.explanation}
        </div>
      ) : null}
    </motion.div>
  );
}

export function ResultView({ attempt }: { attempt: Attempt }) {
  const percent = scorePercent(attempt.score, attempt.max_score);
  const wrong = Math.max(0, attempt.total_questions - attempt.correct_count);
  const passPercent = attempt.quiz?.pass_percent ?? 85;
  const passed = attempt.passed ?? percent >= passPercent;
  const wrongAnswers = (attempt.answers ?? []).filter((a) => !a.is_correct);
  const ringColor = passed ? "#22C55E" : percent >= 50 ? "#F59E0B" : "#F43F5E";
  const message = passed
    ? "Đạt rồi! Giỏi quá! 🎉"
    : attempt.is_retry_wrong
      ? "Chưa đạt, luyện thêm các câu sai nhé! 💪"
      : "Chưa đạt yêu cầu, làm lại các câu sai nhé! 🌱";

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-10">
      <div className="relative overflow-hidden rounded-3xl">
        <Confetti count={passed ? 46 : 18} />
        <div className="kid-card relative space-y-6 p-6 text-center sm:p-8">
          <div>
            <p className="font-display text-2xl font-bold text-slate-800">{message}</p>
            <p className="mt-1 text-sm text-slate-500">{attempt.quiz?.title}</p>
            {attempt.is_retry_wrong ? (
              <Badge className="mt-2 border-0 bg-amber-100 text-amber-800">
                Bài làm lại câu sai
              </Badge>
            ) : null}
          </div>

          <Badge
            className={cn(
              "mx-auto gap-1 border-0 px-4 py-1.5 text-sm",
              passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            )}
          >
            <Target className="size-4" />
            {passed ? "ĐẠT" : "CHƯA ĐẠT"} · cần ≥ {passPercent}%
          </Badge>

          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
            className="relative mx-auto flex size-40 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(${ringColor} ${percent * 3.6}deg, #e0f2fe ${percent * 3.6}deg)`,
            }}
          >
            <div className="flex size-32 flex-col items-center justify-center rounded-full bg-white shadow-inner">
              <Trophy className="size-6" style={{ color: ringColor }} />
              <span className="font-display text-3xl font-bold text-slate-800">
                {percent}%
              </span>
              <span className="text-xs text-slate-500">
                {attempt.score}/{attempt.max_score} điểm
              </span>
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3">
              <CheckCircle2 className="mx-auto size-5 text-emerald-500" />
              <p className="mt-1 font-display text-lg font-bold text-emerald-700">
                {attempt.correct_count}
              </p>
              <p className="text-xs text-emerald-600">Câu đúng</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-3">
              <XCircle className="mx-auto size-5 text-rose-500" />
              <p className="mt-1 font-display text-lg font-bold text-rose-700">{wrong}</p>
              <p className="text-xs text-rose-600">Câu sai</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-3">
              <Clock className="mx-auto size-5 text-sky-500" />
              <p className="mt-1 font-display text-lg font-bold text-sky-700">
                {formatDuration(attempt.duration_seconds)}
              </p>
              <p className="text-xs text-sky-600">Thời gian</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <PendingLink
              href="/"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "kid-btn gap-2")}
            >
              <Home className="size-4" /> Về trang chủ
            </PendingLink>
            {wrongAnswers.length > 0 ? (
              <PendingLink
                href={`/quizzes/${attempt.quiz_id}/play?retryFrom=${attempt.id}`}
                className="kid-btn inline-flex items-center justify-center gap-2 bg-amber-500 text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-lg active:translate-y-0"
              >
                <RotateCcw className="size-4" /> Làm lại {wrongAnswers.length} câu sai
              </PendingLink>
            ) : null}
            <PendingLink
              href={`/quizzes/${attempt.quiz_id}/play`}
              className="kid-btn inline-flex items-center justify-center gap-2 bg-sky-500 text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-sky-600 hover:shadow-lg active:translate-y-0"
            >
              <RotateCcw className="size-4" /> Làm lại cả bài
            </PendingLink>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-slate-800">
          <Sparkles className="size-5 text-sky-500" /> Xem lại bài làm
        </h2>
        <p className="text-sm text-slate-500">
          Bài làm đã được lưu — giáo viên có thể xem tại mục Bài làm.
        </p>
        {(attempt.answers ?? []).map((answer, i) => (
          <ReviewItem key={answer.id} index={i} answer={answer} />
        ))}
      </div>
    </div>
  );
}

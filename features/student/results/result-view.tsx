"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Home,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Volume2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PendingLink } from "@/components/shared/pending-link";
import { cn } from "@/lib/utils";
import { formatDuration, scorePercent } from "@/lib/utils/format";
import { playEncourageTone, playPassFanfare } from "@/lib/utils/sounds";
import { useQuizSession } from "@/stores/quiz-session";
import type { Attempt, AttemptAnswer } from "@/types/database";

const CONFETTI_COLORS = [
  "#14B8A6",
  "#22C55E",
  "#F97316",
  "#EAB308",
  "#EC4899",
  "#0EA5E9",
  "#F43F5E",
  "#A855F7",
];

function ConfettiBurst({ active, big }: { active: boolean; big: boolean }) {
  const pieces = useMemo(() => {
    if (!active) return [];
    const count = big ? 72 : 20;
    return Array.from({ length: count }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const distance = big ? 120 + Math.random() * 220 : 60 + Math.random() * 100;
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance + (big ? 40 : 20),
        delay: Math.random() * 0.35,
        duration: 1.4 + Math.random() * 1.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: 200 + Math.random() * 520,
        width: 6 + Math.random() * 7,
        round: Math.random() > 0.55,
      };
    });
  }, [active, big]);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className={cn("absolute left-1/2 top-1/3", p.round ? "rounded-full" : "rounded-sm")}
          style={{
            width: p.width,
            height: p.round ? p.width : p.width * 0.4,
            backgroundColor: p.color,
            boxShadow: `0 0 0 1px ${p.color}33`,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{
            x: p.x,
            y: p.y + (big ? 180 : 80),
            opacity: [0, 1, 1, 0],
            scale: [0.4, 1.1, 1, 0.8],
            rotate: p.rotate,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
      {big
        ? Array.from({ length: 36 }).map((_, i) => (
            <motion.span
              key={`fall-${i}`}
              className="absolute top-0 rounded-sm"
              style={{
                left: `${(i * 37) % 100}%`,
                width: 5 + (i % 5),
                height: 3 + (i % 3),
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              }}
              initial={{ y: -24, opacity: 0, rotate: 0 }}
              animate={{
                y: 420,
                opacity: [0, 1, 1, 0],
                rotate: 180 + i * 40,
              }}
              transition={{
                duration: 2 + (i % 5) * 0.25,
                delay: 0.15 + (i % 8) * 0.08,
                ease: "easeIn",
              }}
            />
          ))
        : null}
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
            answer.is_correct
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
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
          className="max-h-56 w-full rounded-2xl bg-teal-50 object-contain"
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
        <div className="rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-800">
          <span className="font-bold">Giải thích: </span>
          {question.explanation}
        </div>
      ) : null}
    </motion.div>
  );
}

export function ResultView({
  attempt,
  retryEligibility,
}: {
  attempt: Attempt;
  retryEligibility?: {
    canRetryWrong: boolean;
    failCount: number;
    requiredFails: number;
  } | null;
}) {
  const percent = scorePercent(attempt.score, attempt.max_score);
  const wrong = Math.max(0, attempt.total_questions - attempt.correct_count);
  const passPercent = attempt.quiz?.pass_percent ?? 85;
  const passed = attempt.passed ?? percent >= passPercent;
  const wrongAnswers = (attempt.answers ?? []).filter((a) => !a.is_correct);
  const ringColor = passed ? "#22C55E" : percent >= 50 ? "#F59E0B" : "#F43F5E";
  const soundEnabled = useQuizSession((s) => s.soundEnabled);
  const celebratedRef = useRef(false);

  const requiredFails =
    retryEligibility?.requiredFails ??
    attempt.quiz?.retry_wrong_after_fails ??
    3;
  const canRetryWrong =
    wrongAnswers.length > 0 &&
    (retryEligibility?.canRetryWrong ?? false);
  const failCount = retryEligibility?.failCount ?? 0;

  const message = passed
    ? "Đạt rồi! Giỏi quá!"
    : attempt.is_retry_wrong
      ? "Chưa đạt, luyện thêm các câu sai nhé!"
      : canRetryWrong
        ? "Chưa đạt yêu cầu, làm lại các câu sai nhé!"
        : requiredFails > 0
          ? `Chưa đạt — làm lại cả bài (làm lại câu sai mở sau ${requiredFails} lần chưa đạt)`
          : "Chưa đạt yêu cầu, hãy làm lại cả bài nhé!";

  useEffect(() => {
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    if (!soundEnabled) return;
    if (passed) playPassFanfare();
    else playEncourageTone();
  }, [passed, soundEnabled]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-10">
      <div className="relative overflow-hidden rounded-3xl">
        <ConfettiBurst active big={passed} />
        <div
          className={cn(
            "kid-card relative space-y-6 p-6 text-center sm:p-8",
            passed && "ring-2 ring-emerald-300/80"
          )}
        >
          {passed ? (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 12 }}
              className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200"
            >
              <Sparkles className="size-7" />
            </motion.div>
          ) : null}

          <div>
            <motion.p
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-display text-2xl font-bold text-slate-800 sm:text-3xl"
            >
              {message}
            </motion.p>
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
            {passed ? (
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-full"
                initial={{ boxShadow: "0 0 0 0 rgba(34,197,94,0.45)" }}
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(34,197,94,0.45)",
                    "0 0 0 18px rgba(34,197,94,0)",
                    "0 0 0 0 rgba(34,197,94,0)",
                  ],
                }}
                transition={{ duration: 1.6, repeat: 2 }}
              />
            ) : null}
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

          {passed ? (
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <Volume2 className="size-4" />
              {soundEnabled
                ? "Chúc mừng đạt rồi!"
                : "Bật loa trên thanh trên để nghe nhạc chúc mừng lần sau"}
            </p>
          ) : null}

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
            <div className="rounded-2xl bg-teal-50 p-3">
              <Clock className="mx-auto size-5 text-teal-500" />
              <p className="mt-1 font-display text-lg font-bold text-teal-700">
                {formatDuration(attempt.duration_seconds)}
              </p>
              <p className="text-xs text-teal-600">Thời gian</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <PendingLink
              href="/"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "kid-btn gap-2"
              )}
            >
              <Home className="size-4" /> Về trang chủ
            </PendingLink>
            {wrongAnswers.length > 0 && canRetryWrong ? (
              <PendingLink
                href={`/quizzes/${attempt.quiz_id}/play?retryFrom=${attempt.id}`}
                className="kid-btn inline-flex items-center justify-center gap-2 bg-amber-500 text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-lg active:translate-y-0"
              >
                <RotateCcw className="size-4" /> Làm lại {wrongAnswers.length} câu sai
              </PendingLink>
            ) : null}
            <PendingLink
              href={`/quizzes/${attempt.quiz_id}/play`}
              className="kid-btn inline-flex items-center justify-center gap-2 bg-teal-500 text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-teal-600 hover:shadow-lg active:translate-y-0"
            >
              <RotateCcw className="size-4" /> Làm lại cả bài
            </PendingLink>
          </div>
          {!passed &&
          wrongAnswers.length > 0 &&
          !canRetryWrong &&
          requiredFails > 0 ? (
            <p className="text-sm text-amber-700">
              Làm lại câu sai mở sau {requiredFails} lần chưa đạt (hiện{" "}
              {failCount}/{requiredFails})
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-slate-800">
          <Sparkles className="size-5 text-teal-500" /> Xem lại bài làm
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

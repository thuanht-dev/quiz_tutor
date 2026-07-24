"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { submitAttempt } from "@/lib/repositories";
import { cn } from "@/lib/utils";
import { formatTimer } from "@/lib/utils/format";
import { useQuizSession } from "@/stores/quiz-session";
import type { OptionLabel, Question, Quiz } from "@/types/database";

const OPTION_STYLES: Record<OptionLabel, { bg: string; text: string }> = {
  A: { bg: "bg-sky-500", text: "text-white" },
  B: { bg: "bg-emerald-500", text: "text-white" },
  C: { bg: "bg-amber-500", text: "text-white" },
  D: { bg: "bg-pink-500", text: "text-white" },
};

function playSelectBeep(ctxRef: RefObject<AudioContext | null>) {
  try {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    if (!ctxRef.current) ctxRef.current = new AudioCtor();
    const ctx = ctxRef.current;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 720;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.18);
  } catch {
    // Web Audio not supported: fail silently, sound is a nice-to-have.
  }
}

export function QuizPlayer({
  quiz,
  questions,
  attemptId,
  timeLimit,
  isRetryWrong = false,
}: {
  quiz: Quiz;
  questions: Question[];
  attemptId: string;
  timeLimit: number | null;
  isRetryWrong?: boolean;
}) {
  const router = useRouter();

  const sessionAttemptId = useQuizSession((s) => s.attemptId);
  const currentIndex = useQuizSession((s) => s.currentIndex);
  const answers = useQuizSession((s) => s.answers);
  const remainingSeconds = useQuizSession((s) => s.remainingSeconds);
  const soundEnabled = useQuizSession((s) => s.soundEnabled);
  const setSession = useQuizSession((s) => s.setSession);
  const setCurrentIndex = useQuizSession((s) => s.setCurrentIndex);
  const setAnswer = useQuizSession((s) => s.setAnswer);
  const tick = useQuizSession((s) => s.tick);
  const reset = useQuizSession((s) => s.reset);

  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (sessionAttemptId !== attemptId) {
      setSession({ attemptId, quizId: quiz.id, remainingSeconds: timeLimit });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const handleSubmit = useCallback(
    async (expired = false) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const latestAnswers = useQuizSession.getState().answers;
        const payload = questions.map((question) => ({
          question_id: question.id,
          selected_option_id: latestAnswers[question.id] ?? null,
        }));
        const result = await submitAttempt(attemptId, payload, expired);
        reset();
        router.push(`/attempts/${result.id}`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Không thể nộp bài, thử lại nhé!"
        );
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [attemptId, questions, reset, router]
  );

  useEffect(() => {
    if (timeLimit == null) return;
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLimit]);

  useEffect(() => {
    if (timeLimit == null) return;
    if (remainingSeconds === 0 && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      toast.warning("Hết giờ rồi! Bài làm đã được nộp tự động.");
      void handleSubmit(true);
    }
  }, [remainingSeconds, timeLimit, handleSubmit]);

  const question = questions[currentIndex];
  const total = questions.length;
  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id]).length,
    [questions, answers]
  );
  const progressPercent = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  const isLast = currentIndex === total - 1;
  const lowTime = timeLimit != null && remainingSeconds != null && remainingSeconds <= 30;

  function selectOption(optionId: string) {
    if (!question) return;
    setAnswer(question.id, optionId);
    if (soundEnabled) playSelectBeep(audioCtxRef);
  }

  function goNext() {
    if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
  }
  function goPrev() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-slate-500">
        Bài trắc nghiệm này chưa có câu hỏi nào.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <div className="kid-card space-y-3 p-4">
        {isRetryWrong ? (
          <div className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
            Đang làm lại các câu sai — cần đạt từ {quiz.pass_percent ?? 85}% trở lên.
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-slate-800">
              {quiz.title}
            </p>
            <p className="text-sm text-slate-500">
              Câu {currentIndex + 1} / {total}
              {!isRetryWrong ? ` · Đạt từ ${quiz.pass_percent ?? 85}%` : null}
            </p>
          </div>
          {timeLimit != null ? (
            <div
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-1.5 font-display text-lg font-bold tabular-nums",
                lowTime ? "animate-pulse bg-rose-100 text-rose-600" : "bg-sky-100 text-sky-600"
              )}
            >
              <Clock className="size-5" />
              {formatTimer(remainingSeconds ?? 0)}
            </div>
          ) : null}
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-sky-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Đi tới câu ${i + 1}`}
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i === currentIndex
                  ? "bg-sky-500 text-white"
                  : answers[q.id]
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="kid-card space-y-5 p-6"
        >
          <p className="font-display text-xl font-bold leading-relaxed text-slate-800">
            {question.content}
          </p>

          {question.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.image_url}
              alt="Hình minh họa"
              className="max-h-64 w-full rounded-2xl bg-sky-50 object-contain"
            />
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {(question.options ?? []).map((option) => {
              const selected = answers[question.id] === option.id;
              const style = OPTION_STYLES[option.label];
              return (
                <motion.button
                  key={option.id}
                  type="button"
                  onClick={() => selectOption(option.id)}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border-2 p-4 text-left text-base font-semibold transition-all",
                    selected
                      ? cn("border-transparent shadow-lg", style.bg, style.text)
                      : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold",
                      selected ? "bg-white/25" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="flex-1">{option.content}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="kid-btn gap-1"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="size-5" /> Câu trước
        </Button>

        <p className="hidden text-sm text-slate-500 sm:block">
          Đã trả lời {answeredCount}/{total}
        </p>

        {isLast ? (
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  type="button"
                  size="lg"
                  className="kid-btn gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600"
                />
              }
            >
              <Send className="size-4" /> Nộp bài
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nộp bài ngay?</DialogTitle>
                <DialogDescription>
                  Bạn đã trả lời {answeredCount}/{total} câu hỏi.
                  {answeredCount < total
                    ? " Những câu chưa trả lời sẽ được tính là sai."
                    : " Con làm tốt lắm, sẵn sàng nộp bài chưa?"}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Làm tiếp
                </DialogClose>
                <Button
                  type="button"
                  className="gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600"
                  disabled={submitting}
                  onClick={() => handleSubmit(false)}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="size-4" /> Nộp bài
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Button
            type="button"
            size="lg"
            className="kid-btn gap-1 bg-sky-500 text-white hover:bg-sky-600"
            onClick={goNext}
          >
            Câu tiếp <ChevronRight className="size-5" />
          </Button>
        )}
      </div>

      {lowTime ? (
        <div className="flex items-center justify-center gap-2 text-sm font-bold text-rose-500">
          <AlertTriangle className="size-4" /> Sắp hết giờ rồi, nhanh lên nào!
        </div>
      ) : null}
    </div>
  );
}

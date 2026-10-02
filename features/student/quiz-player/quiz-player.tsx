"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
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
import { playSelectBeep } from "@/lib/utils/sounds";
import { useQuizSession } from "@/stores/quiz-session";
import type { OptionLabel, Question, Quiz } from "@/types/database";

const OPTION_LABEL_STYLES: Record<
  OptionLabel,
  { bg: string; text: string; border: string }
> = {
  A: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  B: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  C: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
  },
  D: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
};

export function QuizPlayer({
  quiz,
  questions,
  attemptId,
  timeLimit,
  isRetryWrong = false,
  guestId,
}: {
  quiz: Quiz;
  questions: Question[];
  attemptId: string;
  timeLimit: number | null;
  isRetryWrong?: boolean;
  guestId: string;
}) {
  const router = useRouter();
  const autoAdvance = quiz.auto_advance_on_answer ?? false;
  const showExplain = quiz.show_explanation_on_answer ?? false;

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
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sessionAttemptId !== attemptId) {
      setSession({ attemptId, quizId: quiz.id, remainingSeconds: timeLimit });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, [currentIndex]);

  const handleSubmit = useCallback(
    async (expired = false) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      const toastId = toast.loading(
        expired ? "Hết giờ — đang nộp bài..." : "Đang nộp bài..."
      );
      try {
        const latestAnswers = useQuizSession.getState().answers;
        const payload = questions.map((question) => ({
          question_id: question.id,
          selected_option_id: latestAnswers[question.id] ?? null,
        }));
        const result = await submitAttempt(attemptId, payload, expired, guestId);
        toast.success("Đã nộp bài!", { id: toastId });
        reset();
        router.push(`/attempts/${result.id}`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Không thể nộp bài, thử lại nhé!",
          { id: toastId }
        );
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [attemptId, guestId, questions, reset, router]
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

  const selectedOptionId = question ? answers[question.id] : undefined;
  const revealed = Boolean(showExplain && selectedOptionId);
  const correctOption = useMemo(
    () => (question?.options ?? []).find((o) => o.is_correct) ?? null,
    [question]
  );
  const selectedIsCorrect = Boolean(
    selectedOptionId && correctOption && selectedOptionId === correctOption.id
  );

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
  }, [currentIndex, total, setCurrentIndex]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex, setCurrentIndex]);

  const scheduleAutoAdvance = useCallback(() => {
    if (!autoAdvance) return;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    const delay = showExplain ? 2200 : 450;
    advanceTimerRef.current = setTimeout(() => {
      const idx = useQuizSession.getState().currentIndex;
      if (idx < questions.length - 1) {
        setCurrentIndex(idx + 1);
      }
    }, delay);
  }, [autoAdvance, showExplain, questions.length, setCurrentIndex]);

  const selectOption = useCallback(
    (optionId: string) => {
      if (!question) return;
      if (showExplain && answers[question.id]) return;
      setAnswer(question.id, optionId);
      if (soundEnabled) playSelectBeep(audioCtxRef);
      scheduleAutoAdvance();
    },
    [question, showExplain, answers, setAnswer, soundEnabled, scheduleAutoAdvance]
  );

  // Keyboard navigation & option selection
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        if (currentIndex > 0) {
          e.preventDefault();
          setCurrentIndex(currentIndex - 1);
        }
        return;
      }

      if (e.key === "ArrowRight") {
        if (currentIndex < total - 1) {
          e.preventDefault();
          setCurrentIndex(currentIndex + 1);
        }
        return;
      }

      const key = e.key.toUpperCase();
      if (!question) return;
      const opts = question.options ?? [];
      let targetOption = opts.find((o) => o.label === key);
      if (!targetOption && ["1", "2", "3", "4"].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        targetOption = opts[idx];
      }

      if (targetOption) {
        e.preventDefault();
        selectOption(targetOption.id);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, total, question, selectOption, setCurrentIndex]);

  if (!question) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-slate-500">
        Bài trắc nghiệm này chưa có câu hỏi nào.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      {/* Top HUD Card */}
      <div className="kid-card space-y-3.5 p-5 shadow-lg shadow-indigo-100/60">
        {isRetryWrong ? (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3.5 py-2 text-sm font-bold text-amber-800 border border-amber-200/60">
            <Sparkles className="size-4 shrink-0 text-amber-600" />
            <span>Đang làm lại các câu sai — cần đạt từ {quiz.pass_percent ?? 85}% trở lên.</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200/60">
                <HelpCircle className="size-3.5" />
                Câu {currentIndex + 1} / {total}
              </span>
              {!isRetryWrong && quiz.pass_percent ? (
                <span className="text-xs text-slate-400">
                  Cần ≥ {quiz.pass_percent}%
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate font-display text-lg font-bold text-slate-800">
              {quiz.title}
            </p>
          </div>

          {timeLimit != null ? (
            <div
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 py-1.5 font-display text-lg font-bold tabular-nums transition-colors",
                lowTime
                  ? "animate-pulse border-rose-300 bg-rose-50 text-rose-600"
                  : "border-indigo-200/80 bg-indigo-50/80 text-indigo-700"
              )}
            >
              <Clock className="size-5" />
              {formatTimer(remainingSeconds ?? 0)}
            </div>
          ) : null}
        </div>

        {/* Progress bar */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/50">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>

        {/* Question Quick-Jump Navigator */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {questions.map((q, i) => {
            const isCurrent = i === currentIndex;
            const isAnswered = Boolean(answers[q.id]);
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                aria-label={`Đi tới câu ${i + 1}`}
                className={cn(
                  "flex size-7 items-center justify-center rounded-xl text-xs font-bold transition-all",
                  isCurrent
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-300/50 ring-2 ring-indigo-400/80 scale-105"
                    : isAnswered
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-200/60 hover:bg-indigo-200"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.22 }}
          className="kid-card space-y-5 p-6 sm:p-7 shadow-xl shadow-indigo-100/50"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Câu hỏi {currentIndex + 1}
            </span>
            <p className="font-display text-xl sm:text-2xl font-bold leading-relaxed text-slate-800">
              {question.content}
            </p>
          </div>

          {question.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.image_url}
              alt="Hình minh họa"
              className="max-h-64 w-full rounded-2xl border border-slate-100 bg-slate-50 object-contain p-2"
            />
          ) : null}

          {/* Options Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {(question.options ?? []).map((option) => {
              const selected = selectedOptionId === option.id;
              const labelStyle = OPTION_LABEL_STYLES[option.label];
              let revealClass = "";
              if (revealed) {
                if (option.is_correct) {
                  revealClass =
                    "border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-md ring-1 ring-emerald-500/40";
                } else if (selected) {
                  revealClass =
                    "border-rose-400 bg-rose-50/90 text-rose-950 shadow-sm ring-1 ring-rose-400/40";
                } else {
                  revealClass =
                    "border-slate-100 bg-slate-50/60 text-slate-400 opacity-60";
                }
              }

              return (
                <motion.button
                  key={option.id}
                  type="button"
                  onClick={() => selectOption(option.id)}
                  disabled={revealed}
                  whileTap={revealed ? undefined : { scale: 0.98 }}
                  className={cn(
                    "group relative flex items-center gap-3.5 rounded-2xl border-2 p-4 text-left text-base font-semibold transition-all",
                    revealed
                      ? revealClass
                      : selected
                        ? "border-transparent bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.01]"
                        : "border-slate-200/90 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-sm",
                    revealed && "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold transition-all",
                      revealed
                        ? option.is_correct
                          ? "bg-emerald-500 text-white"
                          : selected
                            ? "bg-rose-500 text-white"
                            : "bg-slate-200 text-slate-500"
                        : selected
                          ? "bg-white/20 text-white"
                          : `${labelStyle.bg} ${labelStyle.text} ${labelStyle.border} border group-hover:scale-105`
                    )}
                  >
                    {option.label}
                  </span>

                  <span className="flex-1 leading-snug">{option.content}</span>

                  {/* Indicator or Keyboard Hint */}
                  {!revealed ? (
                    selected ? (
                      <CheckCircle2 className="size-5 shrink-0 text-white" />
                    ) : (
                      <kbd className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 group-hover:text-indigo-600 group-hover:bg-indigo-50">
                        {option.label}
                      </kbd>
                    )
                  ) : option.is_correct ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                  ) : selected ? (
                    <XCircle className="size-5 shrink-0 text-rose-600" />
                  ) : null}
                </motion.button>
              );
            })}
          </div>

          {/* Instant feedback explanation */}
          {revealed ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-2xl border p-4",
                selectedIsCorrect
                  ? "border-emerald-200 bg-emerald-50/90"
                  : "border-rose-200 bg-rose-50/90"
              )}
            >
              <p
                className={cn(
                  "flex items-center gap-2 font-display text-base font-bold",
                  selectedIsCorrect ? "text-emerald-700" : "text-rose-700"
                )}
              >
                {selectedIsCorrect ? (
                  <>
                    <CheckCircle2 className="size-5 text-emerald-600" /> Chính xác! Tuyệt vời lắm!
                  </>
                ) : (
                  <>
                    <XCircle className="size-5 text-rose-600" /> Chưa chính xác rồi
                  </>
                )}
              </p>
              {!selectedIsCorrect && correctOption ? (
                <p className="mt-2.5 rounded-xl bg-white/90 p-3 text-sm font-semibold text-emerald-900 border border-emerald-200 shadow-xs">
                  Đáp án đúng:{" "}
                  <span className="font-display font-bold">
                    {correctOption.label}. {correctOption.content}
                  </span>
                </p>
              ) : null}
              {question.explanation ? (
                <p className="mt-2.5 flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <span>{question.explanation}</span>
                </p>
              ) : null}
              {autoAdvance && !isLast ? (
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Tự chuyển câu tiếp theo sau giây lát…
                </p>
              ) : null}
            </motion.div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="kid-btn gap-1 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="size-5" /> Câu trước
        </Button>

        <p className="hidden text-sm text-slate-500 sm:block">
          Đã trả lời <span className="font-bold text-indigo-600">{answeredCount}</span>/{total}
        </p>

        {isLast ? (
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  type="button"
                  size="lg"
                  className="kid-btn gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-400/30"
                />
              }
            >
              <Send className="size-4" /> Nộp bài
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-slate-800">
                  Sẵn sàng nộp bài?
                </DialogTitle>
                <DialogDescription className="space-y-3 pt-2 text-slate-600">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                    <span>Số câu đã hoàn thành:</span>
                    <span className="font-bold text-slate-900">
                      {answeredCount} / {total} câu
                    </span>
                  </div>
                  {answeredCount < total ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                      <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-bold">Còn {total - answeredCount} câu chưa trả lời!</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Các câu chưa trả lời sẽ được tính là 0 điểm.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 text-sm">
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                      <span>Tuyệt vời! Bạn đã trả lời đủ tất cả các câu hỏi.</span>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose render={<Button type="button" variant="outline" className="rounded-xl" />}>
                  Làm tiếp
                </DialogClose>
                <Button
                  type="button"
                  className="kid-btn gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-300/40"
                  disabled={submitting}
                  onClick={() => handleSubmit(false)}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="size-4" /> Nộp bài ngay
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
            className="kid-btn gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-300/40"
            onClick={goNext}
          >
            Câu tiếp <ChevronRight className="size-5" />
          </Button>
        )}
      </div>

      {/* Helpful keyboard shortcut hints */}
      <div className="hidden sm:flex items-center justify-center gap-4 text-xs text-slate-400">
        <span>💡 Nhấn phím <b>A, B, C, D</b> (hoặc <b>1, 2, 3, 4</b>) để chọn • Phím <b>← / →</b> để chuyển câu</span>
      </div>

      {lowTime ? (
        <div className="flex items-center justify-center gap-2 text-sm font-bold text-rose-500 animate-pulse">
          <AlertTriangle className="size-4" /> Sắp hết giờ rồi, nhanh lên nào!
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Home, Loader2 } from "lucide-react";
import { QuizPlayer } from "@/features/student/quiz-player/quiz-player";
import { ErrorState } from "@/components/shared/states";
import { buttonVariants } from "@/components/ui/button";
import { getPlayQuiz, startAttempt } from "@/lib/repositories";
import { cn } from "@/lib/utils";
import { useGuestSession } from "@/stores/guest-session";
import type { Question, Quiz } from "@/types/database";

export function PlayQuizClient({ quizId }: { quizId: string }) {
  const searchParams = useSearchParams();
  const retryFrom = searchParams.get("retryFrom");
  const guestId = useGuestSession((s) => s.guestId);
  const displayName = useGuestSession((s) => s.displayName);
  const bootKeyRef = useRef<string | null>(null);

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | {
        status: "ready";
        quiz: Quiz;
        questions: Question[];
        attemptId: string;
        isRetryWrong: boolean;
      }
  >({ status: "loading" });

  useEffect(() => {
    if (!guestId || !displayName) return;

    const bootKey = `${guestId}:${quizId}:${retryFrom ?? ""}`;
    // Prevent Strict Mode / remount from starting parallel boots for same session
    if (bootKeyRef.current === bootKey && state.status === "ready") return;
    bootKeyRef.current = bootKey;

    let cancelled = false;
    async function boot() {
      try {
        const play = await getPlayQuiz(quizId, retryFrom, guestId);
        if (!play) {
          if (!cancelled) {
            setState({
              status: "error",
              message: "Không tìm thấy quiz hoặc không còn câu sai.",
            });
          }
          return;
        }
        const attempt = await startAttempt(quizId, {
          guestName: displayName!,
          guestId: guestId!,
          parentAttemptId: retryFrom,
        });
        if (!cancelled) {
          setState({
            status: "ready",
            quiz: play.quiz,
            questions: play.questions,
            attemptId: attempt.id,
            isRetryWrong: !!retryFrom,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Không thể bắt đầu bài làm",
          });
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
    // intentionally omit state.status — only re-boot when identity/quiz changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, retryFrom, guestId, displayName]);

  if (!guestId || !displayName || state.status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-teal-700">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm font-bold">Đang chuẩn bị bài làm...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <ErrorState
          title="Không thể bắt đầu bài làm"
          description={state.message}
        />
        <div className="flex justify-center">
          <Link
            href="/"
            className={cn(buttonVariants({ size: "lg" }), "kid-btn gap-2")}
          >
            <Home className="size-4" /> Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <QuizPlayer
      quiz={state.quiz}
      questions={state.questions}
      attemptId={state.attemptId}
      timeLimit={state.quiz.time_limit_seconds ?? null}
      isRetryWrong={state.isRetryWrong}
      guestId={guestId}
    />
  );
}

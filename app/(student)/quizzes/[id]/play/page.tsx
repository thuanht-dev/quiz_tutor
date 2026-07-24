import Link from "next/link";
import { notFound } from "next/navigation";
import { Home } from "lucide-react";
import { QuizPlayer } from "@/features/student/quiz-player/quiz-player";
import { ErrorState } from "@/components/shared/states";
import { buttonVariants } from "@/components/ui/button";
import { getPlayQuiz, startAttempt } from "@/lib/repositories";
import { cn } from "@/lib/utils";

export const metadata = { title: "Làm bài" };

export default async function PlayQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const play = await getPlayQuiz(id);
  if (!play) notFound();

  try {
    const attempt = await startAttempt(id);
    return (
      <QuizPlayer
        quiz={play.quiz}
        questions={play.questions}
        attemptId={attempt.id}
        timeLimit={play.quiz.time_limit_seconds ?? null}
      />
    );
  } catch (error) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <ErrorState
          title="Không thể bắt đầu bài làm"
          description={
            error instanceof Error ? error.message : "Vui lòng thử lại sau."
          }
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
}

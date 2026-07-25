import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PlayQuizClient } from "@/features/student/quiz-player/play-quiz-client";

export const metadata = { title: "Làm bài" };

export default async function PlayQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-teal-700">
          <Loader2 className="size-8 animate-spin" />
        </div>
      }
    >
      <PlayQuizClient quizId={id} />
    </Suspense>
  );
}

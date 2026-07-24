import { notFound } from "next/navigation";
import { ResultView } from "@/features/student/results/result-view";
import { requireProfile } from "@/lib/auth/actions";
import { getAttempt } from "@/lib/repositories";

export const metadata = { title: "Kết quả bài làm" };

export default async function AttemptResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile("student");
  const { id } = await params;
  const attempt = await getAttempt(id);

  if (!attempt || attempt.student_id !== profile.id || attempt.status === "in_progress") {
    notFound();
  }

  return <ResultView attempt={attempt} />;
}

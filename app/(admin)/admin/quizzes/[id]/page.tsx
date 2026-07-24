import { QuizDetail } from "@/features/admin/quizzes/quiz-detail";

export const metadata = { title: "Chi tiết quiz" };

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuizDetail quizId={id} />;
}

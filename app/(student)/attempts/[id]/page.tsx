import { AttemptResultClient } from "@/features/student/results/attempt-result-client";

export const metadata = { title: "Kết quả bài làm" };

export default async function AttemptResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AttemptResultClient attemptId={id} />;
}

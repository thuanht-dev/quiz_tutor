import { AttemptDetail } from "@/features/admin/attempts/attempt-detail";

export const metadata = { title: "Chi tiết bài làm" };

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AttemptDetail attemptId={id} />;
}

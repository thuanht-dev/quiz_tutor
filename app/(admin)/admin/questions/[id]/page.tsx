import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/states";
import { QuestionForm } from "@/features/admin/questions/question-form";
import { getQuestion } from "@/lib/repositories";

export const metadata = { title: "Sửa câu hỏi" };

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await getQuestion(id);
  if (!question) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/questions"
          className="inline-flex items-center gap-1 text-sm font-bold text-sky-600 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Quay lại ngân hàng câu hỏi
        </Link>
      </div>
      <PageHeader title="Sửa câu hỏi" description="Cập nhật nội dung câu hỏi" />
      <div className="max-w-3xl">
        <QuestionForm question={question} />
      </div>
    </div>
  );
}

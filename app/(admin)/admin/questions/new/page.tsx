import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/states";
import { QuestionForm } from "@/features/admin/questions/question-form";

export const metadata = { title: "Thêm câu hỏi" };

export default function NewQuestionPage() {
  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/questions"
          className="inline-flex items-center gap-1 text-sm font-bold text-teal-600 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Quay lại ngân hàng câu hỏi
        </Link>
      </div>
      <PageHeader title="Thêm câu hỏi" description="Điền thông tin câu hỏi mới" />
      <div className="max-w-3xl">
        <QuestionForm />
      </div>
    </div>
  );
}

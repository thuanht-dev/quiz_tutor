import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/states";
import { QuizForm } from "@/features/admin/quizzes/quiz-form";

export const metadata = { title: "Tạo quiz mới" };

export default function NewQuizPage() {
  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/quizzes"
          className="inline-flex items-center gap-1 text-sm font-bold text-sky-600 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách quiz
        </Link>
      </div>
      <PageHeader title="Tạo quiz mới" description="Điền thông tin để tạo quiz" />
      <div className="max-w-2xl">
        <QuizForm />
      </div>
    </div>
  );
}

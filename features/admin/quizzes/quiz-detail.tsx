"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared/states";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { QuizForm } from "@/features/admin/quizzes/quiz-form";
import {
  getQuiz,
  listQuestions,
  listQuizQuestions,
  setQuizQuestions,
} from "@/lib/repositories";
import { cn } from "@/lib/utils";

export function QuizDetail({ quizId }: { quizId: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const {
    data: quiz,
    isLoading: quizLoading,
    isError: quizError,
    refetch: refetchQuiz,
  } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => getQuiz(quizId),
  });

  const { data: linkedQuestions, isLoading: linkedLoading } = useQuery({
    queryKey: ["quiz-questions", quizId],
    queryFn: () => listQuizQuestions(quizId),
  });

  useEffect(() => {
    if (!initializedRef.current && linkedQuestions) {
      setSelectedIds(new Set(linkedQuestions.map((q) => q.id)));
      initializedRef.current = true;
    }
  }, [linkedQuestions]);

  const { data: bankQuestions, isLoading: bankLoading } = useQuery({
    queryKey: ["questions", { subject_id: quiz?.subject_id, search }],
    queryFn: () =>
      listQuestions({ subject_id: quiz?.subject_id, search: search || undefined }),
    enabled: !!quiz?.subject_id,
  });

  const saveQuestionsMutation = useMutation({
    mutationFn: () => setQuizQuestions(quizId, Array.from(selectedIds)),
    onSuccess: () => {
      toast.success("Đã cập nhật danh sách câu hỏi");
      queryClient.invalidateQueries({ queryKey: ["quiz-questions", quizId] });
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
    onError: (error: Error) => toast.error(error.message || "Có lỗi xảy ra"),
  });

  function toggleQuestion(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (quizLoading) {
    return <TableSkeleton />;
  }

  if (quizError || !quiz) {
    return (
      <ErrorState
        description="Không tìm thấy quiz"
        onRetry={() => refetchQuiz()}
      />
    );
  }

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

      <PageHeader title={quiz.title} description="Chỉnh sửa thông tin và câu hỏi của quiz" />

      <div className="grid gap-6 lg:grid-cols-2">
        <QuizForm quiz={quiz} onSaved={() => refetchQuiz()} />

        <div className="kid-card flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-800">
                Câu hỏi trong quiz
              </h3>
              <p className="text-sm text-slate-500">
                Đã chọn {selectedIds.size} câu hỏi
              </p>
            </div>
            <Button
              onClick={() => saveQuestionsMutation.mutate()}
              disabled={saveQuestionsMutation.isPending || !initializedRef.current}
              className="kid-btn gap-2 bg-emerald-500 hover:bg-emerald-600"
            >
              {saveQuestionsMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Save className="size-4" />
                  Lưu câu hỏi
                </>
              )}
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm câu hỏi trong ngân hàng đề..."
              className="h-11 rounded-xl pl-9"
            />
          </div>

          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {bankLoading || linkedLoading ? (
              <TableSkeleton rows={4} />
            ) : !bankQuestions?.length ? (
              <EmptyState
                title="Không tìm thấy câu hỏi"
                description="Hãy thêm câu hỏi cho môn học này trong ngân hàng câu hỏi"
              />
            ) : (
              bankQuestions.map((question) => (
                <label
                  key={question.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition",
                    selectedIds.has(question.id)
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-sky-100 bg-white hover:bg-sky-50"
                  )}
                >
                  <Checkbox
                    checked={selectedIds.has(question.id)}
                    onCheckedChange={() => toggleQuestion(question.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {question.content}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline">{question.points} điểm</Badge>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

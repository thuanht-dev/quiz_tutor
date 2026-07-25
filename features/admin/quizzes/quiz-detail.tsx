"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Library,
  Loader2,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared/states";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuizForm } from "@/features/admin/quizzes/quiz-form";
import { QuestionForm } from "@/features/admin/questions/question-form";
import {
  addQuestionsToQuiz,
  getQuiz,
  listQuestions,
  listQuizQuestions,
  setQuizQuestions,
} from "@/lib/repositories";
import { QUIZ_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Question } from "@/types/database";

export function QuizDetail({ quizId }: { quizId: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const {
    data: quiz,
    isLoading: quizLoading,
    isError: quizError,
    refetch: refetchQuiz,
  } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => getQuiz(quizId),
  });

  const {
    data: linkedQuestions,
    isLoading: linkedLoading,
    refetch: refetchLinked,
  } = useQuery({
    queryKey: ["quiz-questions", quizId],
    queryFn: () => listQuizQuestions(quizId),
  });

  const linkedIds = useMemo(
    () => new Set((linkedQuestions ?? []).map((q) => q.id)),
    [linkedQuestions]
  );

  const { data: bankQuestions, isLoading: bankLoading } = useQuery({
    queryKey: ["questions", { subject_id: quiz?.subject_id, search }],
    queryFn: () =>
      listQuestions({
        subject_id: quiz?.subject_id,
        search: search || undefined,
      }),
    enabled: !!quiz?.subject_id && showBank,
  });

  function invalidateQuizQuestions() {
    queryClient.invalidateQueries({ queryKey: ["quiz-questions", quizId] });
    queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    queryClient.invalidateQueries({ queryKey: ["questions"] });
  }

  const saveOrderMutation = useMutation({
    mutationFn: (ids: string[]) => setQuizQuestions(quizId, ids),
    onSuccess: () => {
      invalidateQuizQuestions();
      void refetchLinked();
    },
    onError: (error: Error) => toast.error(error.message || "Không thể cập nhật"),
  });

  const addFromBankMutation = useMutation({
    mutationFn: (questionId: string) => addQuestionsToQuiz(quizId, [questionId]),
    onSuccess: () => {
      toast.success("Đã thêm vào quiz");
      invalidateQuizQuestions();
      void refetchLinked();
    },
    onError: (error: Error) => toast.error(error.message || "Không thể thêm"),
  });

  async function handleCreatedQuestion(question: Question | null) {
    if (!question) return;
    try {
      await addQuestionsToQuiz(quizId, [question.id]);
      toast.success("Đã thêm câu hỏi vào quiz");
      invalidateQuizQuestions();
      await refetchLinked();
      setAddOpen(false);
      setFormKey((k) => k + 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể gắn câu hỏi vào quiz"
      );
    }
  }

  function removeFromQuiz(questionId: string) {
    const next = (linkedQuestions ?? [])
      .map((q) => q.id)
      .filter((id) => id !== questionId);
    toast.loading("Đang gỡ khỏi quiz...", { id: "quiz-q-remove" });
    saveOrderMutation.mutate(next, {
      onSuccess: () => toast.success("Đã gỡ khỏi quiz", { id: "quiz-q-remove" }),
      onError: (error: Error) =>
        toast.error(error.message || "Không thể gỡ", { id: "quiz-q-remove" }),
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

  const statusLabel =
    QUIZ_STATUS_LABELS[quiz.status as keyof typeof QUIZ_STATUS_LABELS] ??
    quiz.status;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/quizzes"
          className="inline-flex items-center gap-1 text-sm font-bold text-teal-600 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách quiz
        </Link>
      </div>

      <PageHeader
        title={quiz.title}
        description={`${quiz.subject?.name ?? "Môn học"} · ${statusLabel} · ${(linkedQuestions ?? []).length} câu hỏi`}
        actions={
          <Button
            type="button"
            variant="outline"
            className="kid-btn gap-2"
            onClick={() => setShowSettings((v) => !v)}
          >
            <Settings2 className="size-4" />
            {showSettings ? "Ẩn cài đặt" : "Cài đặt quiz"}
          </Button>
        }
      />

      {showSettings ? (
        <div className="mb-6 max-w-2xl">
          <QuizForm quiz={quiz} onSaved={() => refetchQuiz()} />
        </div>
      ) : null}

      <div className="kid-card space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-800">
              Câu hỏi trong quiz
            </h3>
            <p className="text-sm text-slate-500">
              Thêm câu hỏi mới tại đây — không cần vào Ngân hàng trước.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="kid-btn gap-2"
              onClick={() => setShowBank((v) => !v)}
            >
              <Library className="size-4" />
              {showBank ? "Ẩn ngân hàng" : "Chọn từ ngân hàng"}
            </Button>
            <Button
              type="button"
              className="kid-btn gap-2 bg-emerald-500 hover:bg-emerald-600"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" />
              Thêm câu hỏi
            </Button>
          </div>
        </div>

        {linkedLoading ? (
          <TableSkeleton rows={4} />
        ) : !(linkedQuestions ?? []).length ? (
          <EmptyState
            title="Chưa có câu hỏi"
            description="Bấm “Thêm câu hỏi” để soạn ngay, hoặc chọn từ ngân hàng nếu đã có sẵn."
            action={
              <Button
                type="button"
                className="kid-btn gap-2 bg-emerald-500 hover:bg-emerald-600"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="size-4" />
                Thêm câu hỏi đầu tiên
              </Button>
            }
          />
        ) : (
          <ol className="space-y-2">
            {(linkedQuestions ?? []).map((question, index) => (
              <li
                key={question.id}
                className="flex items-start gap-3 rounded-2xl border border-teal-100 bg-white p-3"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {question.content}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{question.points} điểm</Badge>
                    <Link
                      href={`/admin/questions/${question.id}`}
                      className="text-xs font-medium text-teal-600 hover:underline"
                    >
                      Sửa
                    </Link>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-slate-400 hover:text-rose-600"
                  aria-label="Gỡ khỏi quiz"
                  disabled={saveOrderMutation.isPending}
                  onClick={() => removeFromQuiz(question.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ol>
        )}

        {showBank ? (
          <div className="space-y-3 border-t border-teal-100 pt-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-700">
                Ngân hàng môn {quiz.subject?.name ?? ""}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowBank(false)}
                aria-label="Đóng"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm câu hỏi..."
                className="h-11 rounded-xl pl-9"
              />
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {bankLoading ? (
                <TableSkeleton rows={3} />
              ) : !bankQuestions?.length ? (
                <p className="text-sm text-slate-500">
                  Chưa có câu hỏi trong ngân hàng cho môn này.
                </p>
              ) : (
                bankQuestions.map((question) => {
                  const inQuiz = linkedIds.has(question.id);
                  return (
                    <label
                      key={question.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition",
                        inQuiz
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-teal-100 bg-white hover:bg-teal-50"
                      )}
                    >
                      <Checkbox
                        checked={inQuiz}
                        disabled={
                          addFromBankMutation.isPending ||
                          saveOrderMutation.isPending
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            addFromBankMutation.mutate(question.id);
                          } else {
                            removeFromQuiz(question.id);
                          }
                        }}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {question.content}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {question.points} điểm
                        </Badge>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        {(linkedQuestions ?? []).length > 0 && quiz.status === "draft" ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Tip: mở <strong>Cài đặt quiz</strong> → đổi trạng thái sang{" "}
            <strong>Đã xuất bản</strong> để học sinh thấy bài này.
          </p>
        ) : null}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Thêm câu hỏi vào quiz</DialogTitle>
            <DialogDescription>
              Câu hỏi sẽ tự gắn vào quiz này sau khi lưu.
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-1">
            <QuestionForm
              key={formKey}
              defaultSubjectId={quiz.subject_id}
              lockSubject
              submitLabel="Lưu vào quiz"
              className="border-0 bg-transparent p-0 shadow-none"
              onSaved={handleCreatedQuestion}
            />
          </div>
        </DialogContent>
      </Dialog>

      {saveOrderMutation.isPending || addFromBankMutation.isPending ? (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <Loader2 className="size-4 animate-spin" />
          Đang lưu...
        </div>
      ) : null}
    </div>
  );
}

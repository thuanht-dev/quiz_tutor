"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Library,
  Loader2,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
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
  DialogFooter,
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

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export function QuizDetail({ quizId }: { quizId: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  /** Ordered question ids in the quiz (local draft until Save). */
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  /** Pending checks inside bank dialog (not applied until Áp dụng). */
  const [bankDraft, setBankDraft] = useState<Set<string>>(new Set());

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

  const { data: bankQuestions, isLoading: bankLoading } = useQuery({
    queryKey: ["questions", { subject_id: quiz?.subject_id, search: "" }],
    queryFn: () => listQuestions({ subject_id: quiz?.subject_id }),
    enabled: !!quiz?.subject_id,
  });

  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of bankQuestions ?? []) map.set(q.id, q);
    for (const q of linkedQuestions ?? []) map.set(q.id, q);
    return map;
  }, [bankQuestions, linkedQuestions]);

  const orderedQuestions = useMemo(
    () =>
      orderedIds
        .map((id) => questionMap.get(id))
        .filter((q): q is Question => !!q),
    [orderedIds, questionMap]
  );

  const dirty = !sameOrder(orderedIds, savedIds);

  useEffect(() => {
    if (!linkedQuestions) return;
    const ids = linkedQuestions.map((q) => q.id);
    setOrderedIds(ids);
    setSavedIds(ids);
  }, [linkedQuestions]);

  const filteredBank = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = bankQuestions ?? [];
    if (!q) return list;
    return list.filter((item) => item.content.toLowerCase().includes(q));
  }, [bankQuestions, search]);

  function invalidateQuizQuestions() {
    queryClient.invalidateQueries({ queryKey: ["quiz-questions", quizId] });
    queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    queryClient.invalidateQueries({ queryKey: ["questions"] });
  }

  const saveMutation = useMutation({
    mutationFn: (ids: string[]) => setQuizQuestions(quizId, ids),
    onSuccess: (_data, ids) => {
      setSavedIds(ids);
      toast.success("Đã lưu danh sách câu hỏi");
      invalidateQuizQuestions();
      void refetchLinked();
    },
    onError: (error: Error) =>
      toast.error(error.message || "Không thể lưu câu hỏi"),
  });

  function openBank() {
    setBankDraft(new Set(orderedIds));
    setSearch("");
    setBankOpen(true);
  }

  function toggleBankDraft(id: string, checked: boolean) {
    setBankDraft((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function applyBankDraft() {
    // Keep current order for still-selected; append newly selected at the end
    const kept = orderedIds.filter((id) => bankDraft.has(id));
    const added = Array.from(bankDraft).filter((id) => !orderedIds.includes(id));
    setOrderedIds([...kept, ...added]);
    setBankOpen(false);
    toast.message("Đã cập nhật danh sách — nhớ bấm Lưu");
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= orderedIds.length) return;
    setOrderedIds((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeLocal(id: string) {
    setOrderedIds((prev) => prev.filter((x) => x !== id));
  }

  async function handleCreatedQuestion(question: Question | null) {
    if (!question) return;
    try {
      const next = orderedIds.includes(question.id)
        ? orderedIds
        : [...orderedIds, question.id];
      await setQuizQuestions(quizId, next);
      setOrderedIds(next);
      setSavedIds(next);
      toast.success("Đã thêm câu hỏi vào quiz");
      invalidateQuizQuestions();
      await refetchLinked();
      setAddOpen(false);
      setFormKey((k) => k + 1);
    } catch (error) {
      // Fallback: question exists in bank — still try link via helper
      try {
        await addQuestionsToQuiz(quizId, [question.id]);
        invalidateQuizQuestions();
        await refetchLinked();
        setAddOpen(false);
        toast.success("Đã thêm câu hỏi vào quiz");
      } catch {
        toast.error(
          error instanceof Error
            ? error.message
            : "Không thể gắn câu hỏi vào quiz"
        );
      }
    }
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
    <div className="pb-24">
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
        description={`${quiz.subject?.name ?? "Môn học"} · ${statusLabel} · ${orderedIds.length} câu hỏi`}
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
              Sắp xếp thứ tự câu, rồi bấm <strong>Lưu</strong>. Chọn từ ngân hàng
              bằng cách tích chọn → Áp dụng.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="kid-btn gap-2"
              onClick={openBank}
            >
              <Library className="size-4" />
              Chọn từ ngân hàng
            </Button>
            <Button
              type="button"
              className="kid-btn gap-2 bg-emerald-500 hover:bg-emerald-600"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" />
              Thêm câu mới
            </Button>
          </div>
        </div>

        {linkedLoading ? (
          <TableSkeleton rows={4} />
        ) : !orderedIds.length ? (
          <EmptyState
            title="Chưa có câu hỏi"
            description="Thêm câu mới hoặc chọn nhiều câu từ ngân hàng rồi lưu."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="kid-btn gap-2"
                  onClick={openBank}
                >
                  <Library className="size-4" />
                  Chọn từ ngân hàng
                </Button>
                <Button
                  type="button"
                  className="kid-btn gap-2 bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="size-4" />
                  Thêm câu đầu tiên
                </Button>
              </div>
            }
          />
        ) : (
          <ol className="divide-y divide-teal-50 rounded-2xl border border-teal-100 bg-white">
            {orderedQuestions.map((question, index) => (
              <li
                key={question.id}
                className="flex items-start gap-3 px-3 py-3 sm:px-4"
              >
                <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-teal-600 font-display text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Câu
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-slate-800">
                    {question.content}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{question.points} điểm</Badge>
                    <Link
                      href={`/admin/questions/${question.id}`}
                      className="text-xs font-medium text-teal-600 hover:underline"
                    >
                      Sửa nội dung
                    </Link>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-lg"
                    aria-label="Đưa lên"
                    disabled={index === 0}
                    onClick={() => moveQuestion(index, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-lg"
                    aria-label="Đưa xuống"
                    disabled={index === orderedQuestions.length - 1}
                    onClick={() => moveQuestion(index, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg text-slate-400 hover:text-rose-600"
                    aria-label="Gỡ khỏi quiz"
                    onClick={() => removeLocal(question.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}

        {orderedIds.length > 0 && quiz.status === "draft" ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Tip: mở <strong>Cài đặt quiz</strong> → đổi trạng thái sang{" "}
            <strong>Đã xuất bản</strong> để học sinh thấy bài này.
          </p>
        ) : null}
      </div>

      {/* Sticky save bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 px-4 py-3 backdrop-blur transition",
          dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        )}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Có thay đổi chưa lưu · {orderedIds.length} câu · thứ tự như danh sách
            trên
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="kid-btn"
              disabled={saveMutation.isPending}
              onClick={() => {
                setOrderedIds(savedIds);
              }}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              className="kid-btn gap-2 bg-teal-600 hover:bg-teal-700"
              disabled={saveMutation.isPending || !dirty}
              onClick={() => saveMutation.mutate(orderedIds)}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Lưu câu hỏi
            </Button>
          </div>
        </div>
      </div>

      {/* Bank picker dialog — select then apply (no per-item save) */}
      <Dialog open={bankOpen} onOpenChange={setBankOpen}>
        <DialogContent
          className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
          showCloseButton
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>Chọn câu hỏi từ ngân hàng</DialogTitle>
            <DialogDescription>
              Tích các câu cần đưa vào quiz, rồi bấm <strong>Áp dụng</strong>.
              Thứ tự sẽ giữ các câu đã có; câu mới thêm vào cuối.
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 border-b px-5 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo nội dung..."
                className="h-11 rounded-xl pl-9"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Đã chọn {bankDraft.size} câu · môn {quiz.subject?.name ?? ""}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {bankLoading ? (
              <div className="p-3">
                <TableSkeleton rows={5} />
              </div>
            ) : !filteredBank.length ? (
              <p className="px-3 py-8 text-center text-sm text-slate-500">
                Không tìm thấy câu hỏi phù hợp.
              </p>
            ) : (
              <ul className="space-y-1.5 pb-2">
                {filteredBank.map((question, i) => {
                  const checked = bankDraft.has(question.id);
                  const orderInQuiz = orderedIds.indexOf(question.id);
                  return (
                    <li key={question.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition",
                          checked
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-transparent hover:bg-slate-50"
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            toggleBankDraft(question.id, !!v)
                          }
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">
                              #{i + 1}
                            </span>
                            {orderInQuiz >= 0 ? (
                              <Badge className="border-0 bg-teal-100 text-teal-800">
                                Đang là câu {orderInQuiz + 1}
                              </Badge>
                            ) : null}
                            <Badge variant="outline">{question.points} điểm</Badge>
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {question.content}
                          </p>
                        </div>
                        {checked ? (
                          <Check className="mt-1 size-4 shrink-0 text-emerald-600" />
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t bg-muted/40 px-5 py-3 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setBankOpen(false)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              className="kid-btn gap-2 bg-teal-600 hover:bg-teal-700"
              onClick={applyBankDraft}
            >
              <Check className="size-4" />
              Áp dụng ({bankDraft.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Thêm câu hỏi mới</DialogTitle>
            <DialogDescription>
              Câu hỏi sẽ được tạo và gắn vào cuối quiz.
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
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createQuestion, listSubjects, updateQuestion } from "@/lib/repositories";
import { questionSchema, type QuestionValues } from "@/lib/validations/schemas";
import { cn } from "@/lib/utils";
import type { Question } from "@/types/database";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const OPTION_FIELD_MAP = {
  A: "option_a",
  B: "option_b",
  C: "option_c",
  D: "option_d",
} as const;

export function QuestionForm({
  question,
  onSaved,
}: {
  question?: Question;
  onSaved?: (question: Question | null) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!question;

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => listSubjects(),
  });

  const optionsByLabel = Object.fromEntries(
    (question?.options ?? []).map((o) => [o.label, o.content])
  ) as Record<string, string>;
  const correctLabel =
    question?.options?.find((o) => o.is_correct)?.label ?? "A";

  const form = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    values: {
      subject_id: question?.subject_id ?? "",
      content: question?.content ?? "",
      image_url: question?.image_url ?? "",
      explanation: question?.explanation ?? "",
      points: question?.points ?? 1,
      option_a: optionsByLabel.A ?? "",
      option_b: optionsByLabel.B ?? "",
      option_c: optionsByLabel.C ?? "",
      option_d: optionsByLabel.D ?? "",
      correct_answer: correctLabel as QuestionValues["correct_answer"],
    },
  });

  const mutation = useMutation({
    mutationFn: (values: QuestionValues) =>
      isEdit ? updateQuestion(question!.id, values) : createQuestion(values),
    onMutate: () =>
      toast.loading(isEdit ? "Đang lưu câu hỏi..." : "Đang tạo câu hỏi...", {
        id: "question-form",
      }),
    onSuccess: (result) => {
      toast.success(isEdit ? "Đã lưu thay đổi" : "Đã tạo câu hỏi mới", {
        id: "question-form",
      });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      if (onSaved) {
        onSaved(result ?? null);
      } else {
        router.push("/admin/questions");
      }
    },
    onError: (error: Error) =>
      toast.error(error.message || "Có lỗi xảy ra", { id: "question-form" }),
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="kid-card space-y-5 p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Môn học</Label>
          <Controller
            control={form.control}
            name="subject_id"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v ?? "")}
                items={
                  subjects?.map((subject) => ({
                    value: subject.id,
                    label: subject.name,
                  })) ?? []
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="Chọn môn học" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.subject_id ? (
            <p className="text-sm text-rose-500">
              {form.formState.errors.subject_id.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="question-points">Điểm</Label>
          <Input
            id="question-points"
            type="number"
            min={1}
            className="h-11 rounded-xl"
            {...form.register("points", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="question-content">Nội dung câu hỏi</Label>
        <Textarea
          id="question-content"
          className="min-h-24 rounded-xl"
          placeholder="Nhập nội dung câu hỏi"
          {...form.register("content")}
        />
        {form.formState.errors.content ? (
          <p className="text-sm text-rose-500">
            {form.formState.errors.content.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="question-image">Hình ảnh minh hoạ (URL, tuỳ chọn)</Label>
        <Input
          id="question-image"
          className="h-11 rounded-xl"
          placeholder="https://..."
          {...form.register("image_url")}
        />
        {form.formState.errors.image_url ? (
          <p className="text-sm text-rose-500">
            {form.formState.errors.image_url.message}
          </p>
        ) : null}
      </div>

      <Controller
        control={form.control}
        name="correct_answer"
        render={({ field }) => (
          <div className="space-y-3">
            <Label>Các đáp án (chọn đáp án đúng)</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {OPTION_LABELS.map((label) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3 transition",
                    field.value === label
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-teal-100 bg-white"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => field.onChange(label)}
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition",
                      field.value === label
                        ? "bg-emerald-500 text-white"
                        : "bg-teal-100 text-teal-700"
                    )}
                    aria-label={`Chọn đáp án đúng là ${label}`}
                  >
                    {label}
                  </button>
                  <Input
                    className="h-10 rounded-xl border-0 bg-transparent focus-visible:ring-1"
                    placeholder={`Đáp án ${label}`}
                    {...form.register(OPTION_FIELD_MAP[label])}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      />

      <div className="space-y-2">
        <Label htmlFor="question-explanation">Giải thích (tuỳ chọn)</Label>
        <Textarea
          id="question-explanation"
          className="min-h-20 rounded-xl"
          placeholder="Giải thích vì sao đáp án đúng"
          {...form.register("explanation")}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="kid-btn gap-2 bg-teal-500 hover:bg-teal-600"
        >
          {mutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <Save className="size-4" />
              {isEdit ? "Lưu thay đổi" : "Tạo câu hỏi"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

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
import { createQuiz, listSubjects, updateQuiz } from "@/lib/repositories";
import { QUIZ_STATUS_LABELS } from "@/lib/constants";
import { quizSchema, type QuizValues } from "@/lib/validations/schemas";
import type { Quiz } from "@/types/database";

export function QuizForm({
  quiz,
  onSaved,
}: {
  quiz?: Quiz;
  onSaved?: (quiz: Quiz) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!quiz;

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => listSubjects(),
  });

  const form = useForm<QuizValues>({
    resolver: zodResolver(quizSchema),
    values: {
      title: quiz?.title ?? "",
      subject_id: quiz?.subject_id ?? "",
      description: quiz?.description ?? "",
      time_limit_seconds: quiz?.time_limit_seconds ?? null,
      pass_percent: quiz?.pass_percent ?? 85,
      status: quiz?.status ?? "draft",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: QuizValues) =>
      isEdit ? updateQuiz(quiz!.id, values) : createQuiz(values),
    onMutate: () =>
      toast.loading(isEdit ? "Đang lưu quiz..." : "Đang tạo quiz...", {
        id: "quiz-form",
      }),
    onSuccess: (result) => {
      toast.success(isEdit ? "Đã lưu thay đổi" : "Đã tạo quiz mới", {
        id: "quiz-form",
      });
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["quiz", quiz!.id] });
      if (onSaved) {
        onSaved(result);
      } else {
        router.push("/admin/quizzes");
      }
    },
    onError: (error: Error) =>
      toast.error(error.message || "Có lỗi xảy ra", { id: "quiz-form" }),
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="kid-card space-y-5 p-6"
    >
      <div className="space-y-2">
        <Label htmlFor="quiz-title">Tên quiz</Label>
        <Input
          id="quiz-title"
          className="h-11 rounded-xl"
          placeholder="Ví dụ: Phép cộng lớp 2"
          {...form.register("title")}
        />
        {form.formState.errors.title ? (
          <p className="text-sm text-rose-500">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

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
          <Label>Trạng thái</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v ?? "")}
                items={Object.entries(QUIZ_STATUS_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUIZ_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quiz-description">Mô tả (tuỳ chọn)</Label>
        <Textarea
          id="quiz-description"
          className="min-h-24 rounded-xl"
          placeholder="Mô tả ngắn về nội dung quiz"
          {...form.register("description")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quiz-time-limit">Thời gian làm bài (phút, tuỳ chọn)</Label>
          <Controller
            control={form.control}
            name="time_limit_seconds"
            render={({ field }) => (
              <Input
                id="quiz-time-limit"
                type="number"
                min={1}
                className="h-11 rounded-xl"
                placeholder="Không giới hạn"
                value={field.value ? Math.round(field.value / 60) : ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  field.onChange(
                    raw.trim() === "" ? null : Math.round(Number(raw) * 60)
                  );
                }}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quiz-pass-percent">Điểm đạt (%)</Label>
          <Input
            id="quiz-pass-percent"
            type="number"
            min={1}
            max={100}
            className="h-11 rounded-xl"
            {...form.register("pass_percent", { valueAsNumber: true })}
          />
          <p className="text-xs text-slate-500">
            Học sinh đạt từ mức này trở lên được tính là &quot;Đạt&quot; (mặc định 85%).
          </p>
          {form.formState.errors.pass_percent ? (
            <p className="text-sm text-rose-500">
              {form.formState.errors.pass_percent.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="kid-btn gap-2 bg-sky-500 hover:bg-sky-600"
        >
          {mutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <Save className="size-4" />
              {isEdit ? "Lưu thay đổi" : "Tạo quiz"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared/states";
import { CardGridSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from "@/lib/repositories";
import { SUBJECT_COLORS } from "@/lib/constants";
import { subjectSchema, type SubjectValues } from "@/lib/validations/schemas";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types/database";

function SubjectDialog({
  open,
  onOpenChange,
  subject,
  nextSortOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  nextSortOrder: number;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!subject;

  const form = useForm<SubjectValues>({
    resolver: zodResolver(subjectSchema),
    values: {
      name: subject?.name ?? "",
      color: subject?.color ?? SUBJECT_COLORS[0],
      icon: subject?.icon ?? "",
      sort_order: subject?.sort_order ?? nextSortOrder,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: SubjectValues) =>
      isEdit ? updateSubject(subject!.id, values) : createSubject(values),
    onMutate: () =>
      toast.loading(isEdit ? "Đang lưu môn học..." : "Đang tạo môn học...", {
        id: "subject-form",
      }),
    onSuccess: () => {
      toast.success(isEdit ? "Đã cập nhật môn học" : "Đã tạo môn học mới", {
        id: "subject-form",
      });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra", { id: "subject-form" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa môn học" : "Thêm môn học"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="subject-name">Tên môn học</Label>
            <Input
              id="subject-name"
              className="h-11 rounded-xl"
              placeholder="Ví dụ: Toán"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-sm text-rose-500">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Màu sắc</Label>
            <Controller
              control={form.control}
              name="color"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => field.onChange(color)}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full border-2 transition",
                        field.value === color
                          ? "border-slate-800 scale-110"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={color}
                    >
                      {field.value === color ? (
                        <Check className="size-4 text-white" />
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject-icon">Biểu tượng (tuỳ chọn)</Label>
            <Input
              id="subject-icon"
              className="h-11 rounded-xl"
              placeholder="Ví dụ: 🔢 hoặc calculator"
              {...form.register("icon")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject-order">Thứ tự hiển thị</Label>
            <Input
              id="subject-order"
              type="number"
              className="h-11 rounded-xl"
              {...form.register("sort_order", { valueAsNumber: true })}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="kid-btn"
              onClick={() => onOpenChange(false)}
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="kid-btn bg-sky-500 hover:bg-sky-600"
            >
              {mutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : isEdit ? (
                "Lưu thay đổi"
              ) : (
                "Tạo môn học"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SubjectsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => listSubjects(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onMutate: () => {
      toast.loading("Đang xoá môn học...", { id: "delete-subject" });
    },
    onSuccess: () => {
      toast.success("Đã xoá môn học", { id: "delete-subject" });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể xoá môn học", {
        id: "delete-subject",
      });
    },
  });

  function openCreate() {
    setEditingSubject(null);
    setDialogOpen(true);
  }

  function openEdit(subject: Subject) {
    setEditingSubject(subject);
    setDialogOpen(true);
  }

  function handleDelete(subject: Subject) {
    if (
      window.confirm(
        `Xoá môn học "${subject.name}"? Các quiz và câu hỏi liên quan có thể bị ảnh hưởng.`
      )
    ) {
      deleteMutation.mutate(subject.id);
    }
  }

  return (
    <div>
      <PageHeader
        title="Môn học"
        description="Quản lý các môn học trong hệ thống"
        actions={
          <Button
            onClick={openCreate}
            className="kid-btn gap-2 bg-emerald-500 hover:bg-emerald-600"
          >
            <Plus className="size-5" />
            Thêm môn học
          </Button>
        }
      />

      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : isError ? (
        <ErrorState description="Không thể tải danh sách môn học" onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          icon={BookOpen}
          title="Chưa có môn học nào"
          description="Bấm nút bên trên để thêm môn học đầu tiên"
          action={
            <Button onClick={openCreate} className="kid-btn bg-sky-500 hover:bg-sky-600">
              Thêm môn học
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((subject) => (
            <div key={subject.id} className="kid-card flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <div
                  className="flex size-12 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-md"
                  style={{ backgroundColor: subject.color }}
                >
                  {subject.icon || subject.name.charAt(0)}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                    onClick={() => openEdit(subject)}
                    aria-label="Sửa"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => handleDelete(subject)}
                    disabled={deleteMutation.isPending}
                    aria-label="Xoá"
                  >
                    {deleteMutation.isPending &&
                    deleteMutation.variables === subject.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <p className="font-display text-lg font-bold text-slate-800">
                  {subject.name}
                </p>
                <p className="text-sm text-slate-500">
                  Thứ tự: {subject.sort_order}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <SubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subject={editingSubject}
        nextSortOrder={(data?.length ?? 0) + 1}
      />
    </div>
  );
}

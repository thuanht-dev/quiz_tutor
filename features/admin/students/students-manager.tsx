"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Plus, UserRoundX, Users, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared/states";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createStudent,
  deleteStudent,
  listStudents,
  resetStudentPassword,
  updateStudent,
} from "@/lib/repositories";
import {
  studentSchema,
  resetPasswordSchema,
  type StudentValues,
  type ResetPasswordValues,
} from "@/lib/validations/schemas";
import type { Profile } from "@/types/database";

function StudentDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Profile | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!student;

  const form = useForm<StudentValues>({
    resolver: zodResolver(studentSchema),
    values: {
      username: student?.username ?? "",
      display_name: student?.display_name ?? "",
      password: "",
      is_active: student?.is_active ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: StudentValues) =>
      isEdit
        ? updateStudent(student!.id, {
            ...values,
            password: values.password || undefined,
          })
        : createStudent(values),
    onSuccess: () => {
      toast.success(isEdit ? "Đã cập nhật học sinh" : "Đã tạo tài khoản học sinh");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Có lỗi xảy ra"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa học sinh" : "Thêm học sinh"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="student-display-name">Tên hiển thị</Label>
            <Input
              id="student-display-name"
              className="h-11 rounded-xl"
              placeholder="Ví dụ: Nguyễn Minh"
              {...form.register("display_name")}
            />
            {form.formState.errors.display_name ? (
              <p className="text-sm text-rose-500">
                {form.formState.errors.display_name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-username">Tên đăng nhập</Label>
            <Input
              id="student-username"
              className="h-11 rounded-xl"
              placeholder="vd: minh"
              {...form.register("username")}
            />
            {form.formState.errors.username ? (
              <p className="text-sm text-rose-500">
                {form.formState.errors.username.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-password">
              Mật khẩu {isEdit ? "(để trống nếu không đổi)" : ""}
            </Label>
            <Input
              id="student-password"
              type="password"
              className="h-11 rounded-xl"
              placeholder={isEdit ? "••••••" : "Tối thiểu 6 ký tự"}
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-rose-500">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-xl bg-sky-50 px-4 py-3">
                <Label htmlFor="student-active">Đang hoạt động</Label>
                <Switch
                  id="student-active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

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
                "Tạo tài khoản"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Profile | null;
}) {
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordValues) =>
      resetStudentPassword(student!.id, values.password),
    onSuccess: () => {
      toast.success("Đã đặt lại mật khẩu");
      form.reset({ password: "" });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Không thể đặt lại mật khẩu"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset({ password: "" });
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Đặt lại mật khẩu cho {student?.display_name}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="reset-password">Mật khẩu mới</Label>
            <Input
              id="reset-password"
              type="password"
              className="h-11 rounded-xl"
              placeholder="Tối thiểu 6 ký tự"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-rose-500">
                {form.formState.errors.password.message}
              </p>
            ) : null}
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
              className="kid-btn bg-amber-500 hover:bg-amber-600"
            >
              {mutation.isPending ? <Loader2 className="animate-spin" /> : "Đặt lại"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StudentsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["students"],
    queryFn: () => listStudents(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => {
      toast.success("Đã vô hiệu hoá tài khoản");
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error: Error) => toast.error(error.message || "Có lỗi xảy ra"),
  });

  function openCreate() {
    setSelectedStudent(null);
    setDialogOpen(true);
  }

  function openEdit(student: Profile) {
    setSelectedStudent(student);
    setDialogOpen(true);
  }

  function openReset(student: Profile) {
    setSelectedStudent(student);
    setResetOpen(true);
  }

  function handleDeactivate(student: Profile) {
    if (window.confirm(`Vô hiệu hoá tài khoản của "${student.display_name}"?`)) {
      deleteMutation.mutate(student.id);
    }
  }

  return (
    <div>
      <PageHeader
        title="Học sinh"
        description="Quản lý tài khoản học sinh"
        actions={
          <Button
            onClick={openCreate}
            className="kid-btn gap-2 bg-emerald-500 hover:bg-emerald-600"
          >
            <Plus className="size-5" />
            Thêm học sinh
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState description="Không thể tải danh sách học sinh" onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          icon={Users}
          title="Chưa có học sinh nào"
          description="Thêm tài khoản học sinh đầu tiên"
          action={
            <Button onClick={openCreate} className="kid-btn bg-sky-500 hover:bg-sky-600">
              Thêm học sinh
            </Button>
          }
        />
      ) : (
        <div className="kid-card overflow-hidden p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên hiển thị</TableHead>
                <TableHead>Tên đăng nhập</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-bold text-slate-800">
                    {student.display_name}
                  </TableCell>
                  <TableCell>@{student.username}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        student.is_active
                          ? "border-0 bg-emerald-100 text-emerald-700"
                          : "border-0 bg-slate-200 text-slate-600"
                      }
                    >
                      {student.is_active ? "Đang hoạt động" : "Đã vô hiệu hoá"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl"
                        onClick={() => openEdit(student)}
                        aria-label="Sửa"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl"
                        onClick={() => openReset(student)}
                        aria-label="Đặt lại mật khẩu"
                      >
                        <KeyRound className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => handleDeactivate(student)}
                        aria-label="Vô hiệu hoá"
                      >
                        <UserRoundX className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <StudentDialog open={dialogOpen} onOpenChange={setDialogOpen} student={selectedStudent} />
      <ResetPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        student={selectedStudent}
      />
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  FileUp,
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared/states";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  copyQuestion,
  deleteQuestion,
  importQuestions,
  listQuestions,
  listSubjects,
} from "@/lib/repositories";
import { cn } from "@/lib/utils";
import type { ImportQuestionRow } from "@/types/database";

function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subjectId, setSubjectId] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportQuestionRow[]>([]);
  const [parsing, setParsing] = useState(false);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => listSubjects(),
  });

  const importMutation = useMutation({
    mutationFn: () => importQuestions(subjectId, rows),
    onSuccess: (created) => {
      toast.success(`Đã nhập ${created.length} câu hỏi`);
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      resetAndClose();
    },
    onError: (error: Error) => toast.error(error.message || "Không thể nhập câu hỏi"),
  });

  function resetAndClose() {
    setFileName("");
    setRows([]);
    setSubjectId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  }

  async function handleFile(file: File) {
    setParsing(true);
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "csv") {
        await new Promise<void>((resolve, reject) => {
          Papa.parse<ImportQuestionRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              setRows(results.data.filter((r) => r.Question));
              resolve();
            },
            error: (error) => reject(error),
          });
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<ImportQuestionRow>(sheet);
        setRows(json.filter((r) => r.Question));
      } else {
        toast.error("Chỉ hỗ trợ file .csv hoặc .xlsx");
        setFileName("");
      }
    } catch {
      toast.error("Không thể đọc file, vui lòng kiểm tra định dạng");
      setFileName("");
    } finally {
      setParsing(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAndClose();
        else onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nhập câu hỏi từ file</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            File cần có các cột: Question, A, B, C, D, Correct Answer, Explanation
            (tuỳ chọn), Image URL (tuỳ chọn).
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Môn học áp dụng</label>
            <Select value={subjectId} onValueChange={(v) => setSubjectId(v ?? "")}>
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
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/60 px-4 py-8 text-center transition hover:bg-sky-50"
          >
            <UploadCloud className="size-8 text-sky-500" />
            <span className="text-sm font-bold text-slate-700">
              {fileName || "Chọn file CSV hoặc XLSX"}
            </span>
            <span className="text-xs text-slate-500">Bấm để chọn file</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {parsing ? (
            <p className="text-sm text-slate-500">Đang đọc file...</p>
          ) : rows.length > 0 ? (
            <p className="text-sm font-bold text-emerald-600">
              Tìm thấy {rows.length} câu hỏi sẵn sàng nhập
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="kid-btn" onClick={resetAndClose}>
            Huỷ
          </Button>
          <Button
            type="button"
            disabled={!subjectId || !rows.length || importMutation.isPending}
            onClick={() => importMutation.mutate()}
            className="kid-btn gap-2 bg-emerald-500 hover:bg-emerald-600"
          >
            {importMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <FileUp className="size-4" />
                Nhập {rows.length || ""} câu hỏi
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuestionsManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [importOpen, setImportOpen] = useState(false);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => listSubjects(),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["questions", { subjectFilter, search }],
    queryFn: () =>
      listQuestions({
        subject_id: subjectFilter === "all" ? undefined : subjectFilter,
        search: search || undefined,
      }),
  });

  const copyMutation = useMutation({
    mutationFn: (id: string) => copyQuestion(id),
    onSuccess: () => {
      toast.success("Đã sao chép câu hỏi");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (error: Error) => toast.error(error.message || "Không thể sao chép"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
    onSuccess: () => {
      toast.success("Đã xoá câu hỏi");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (error: Error) => toast.error(error.message || "Không thể xoá câu hỏi"),
  });

  function handleDelete(id: string) {
    if (window.confirm("Xoá câu hỏi này? Hành động này không thể hoàn tác.")) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div>
      <PageHeader
        title="Ngân hàng câu hỏi"
        description="Quản lý toàn bộ câu hỏi trắc nghiệm"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="kid-btn gap-2"
            >
              <FileUp className="size-5" />
              Nhập từ file
            </Button>
            <Link
              href="/admin/questions/new"
              className={cn(
                buttonVariants(),
                "kid-btn gap-2 bg-emerald-500 hover:bg-emerald-600"
              )}
            >
              <Plus className="size-5" />
              Thêm câu hỏi
            </Link>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm câu hỏi..."
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <Select value={subjectFilter} onValueChange={(v) => setSubjectFilter(v ?? "all")}>
          <SelectTrigger className="h-10 min-w-40 rounded-xl">
            <SelectValue placeholder="Môn học" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả môn học</SelectItem>
            {subjects?.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState description="Không thể tải danh sách câu hỏi" onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          icon={HelpCircle}
          title="Chưa có câu hỏi nào"
          description="Thêm câu hỏi mới hoặc nhập từ file để bắt đầu"
          action={
            <Link
              href="/admin/questions/new"
              className={cn(buttonVariants(), "kid-btn bg-sky-500 hover:bg-sky-600")}
            >
              Thêm câu hỏi
            </Link>
          }
        />
      ) : (
        <div className="kid-card overflow-hidden p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nội dung</TableHead>
                <TableHead>Môn học</TableHead>
                <TableHead>Điểm</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((question) => (
                <TableRow key={question.id}>
                  <TableCell className="max-w-md whitespace-normal">
                    <Link
                      href={`/admin/questions/${question.id}`}
                      className="font-semibold text-sky-700 hover:underline"
                    >
                      {question.content}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {question.subject ? (
                      <Badge
                        className="text-white"
                        style={{ backgroundColor: question.subject.color }}
                      >
                        {question.subject.name}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{question.points}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl"
                        onClick={() => copyMutation.mutate(question.id)}
                        aria-label="Sao chép"
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Link
                        href={`/admin/questions/${question.id}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "rounded-xl"
                        )}
                        aria-label="Sửa"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => handleDelete(question.id)}
                        aria-label="Xoá"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

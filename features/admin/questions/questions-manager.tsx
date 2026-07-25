"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Download,
  FileUp,
  FileType2,
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared/states";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  buildChatGptImportPrompt,
  extractCsvFromChatReply,
} from "@/lib/import/chatgpt-prompt";
import {
  parseQuizTextToRows,
  validateImportRows,
} from "@/lib/import/parse-quiz-text";
import {
  SAMPLE_IMPORT_ROWS,
  defaultExplanation,
  downloadTextFile,
  rowsToCsv,
} from "@/lib/import/template";
import { cn } from "@/lib/utils";
import type { ImportQuestionRow } from "@/types/database";

type ImportMode = "file" | "docx" | "chatgpt";

function downloadCsvTemplate() {
  downloadTextFile(
    "questions-import-template.csv",
    rowsToCsv(SAMPLE_IMPORT_ROWS),
    "text/csv;charset=utf-8"
  );
}

function downloadXlsxTemplate() {
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_IMPORT_ROWS);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
  XLSX.writeFile(workbook, "questions-import-template.xlsx");
}

function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const chatgptDocxRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("file");
  const [subjectId, setSubjectId] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportQuestionRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [explanationTemplate, setExplanationTemplate] = useState(
    "Đáp án đúng là {ANSWER}."
  );
  const [chatgptSource, setChatgptSource] = useState("");
  const [chatgptPrompt, setChatgptPrompt] = useState("");
  const [chatgptReply, setChatgptReply] = useState("");

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => listSubjects(),
  });

  const importMutation = useMutation({
    mutationFn: () => importQuestions(subjectId, rows),
    onMutate: () => toast.loading("Đang nhập câu hỏi...", { id: "import-q" }),
    onSuccess: (created) => {
      toast.success(`Đã nhập ${created.length} câu hỏi`, { id: "import-q" });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      resetAndClose();
    },
    onError: (error: Error) =>
      toast.error(error.message || "Không thể nhập câu hỏi", { id: "import-q" }),
  });

  function resetAndClose() {
    setFileName("");
    setRows([]);
    setSubjectId("");
    setMode("file");
    setChatgptSource("");
    setChatgptPrompt("");
    setChatgptReply("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (docxInputRef.current) docxInputRef.current.value = "";
    if (chatgptDocxRef.current) chatgptDocxRef.current.value = "";
    onOpenChange(false);
  }

  function parseCsvText(csvText: string) {
    const cleaned = extractCsvFromChatReply(csvText);
    const results = Papa.parse<ImportQuestionRow>(cleaned, {
      header: true,
      skipEmptyLines: true,
    });
    if (results.errors.length) {
      toast.error(results.errors[0]?.message || "CSV không hợp lệ");
      return;
    }
    applyRows(results.data.filter((r) => r.Question));
  }

  function generateChatGptPrompt() {
    if (!chatgptSource.trim()) {
      toast.error("Hãy dán đề hoặc tải file Word trước");
      return;
    }
    const subjectName = subjects?.find((s) => s.id === subjectId)?.name;
    const prompt = buildChatGptImportPrompt(chatgptSource, {
      subjectHint: subjectName,
    });
    setChatgptPrompt(prompt);
    void navigator.clipboard.writeText(prompt).then(
      () => toast.success("Đã tạo và sao chép prompt vào clipboard"),
      () => toast.success("Đã tạo prompt — bấm Sao chép nếu cần")
    );
  }

  async function loadChatgptDocx(file: File) {
    setParsing(true);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      const text = result.value.trim();
      if (!text) {
        toast.error("File Word không có nội dung chữ");
        return;
      }
      setChatgptSource(text);
      toast.success("Đã đọc đề từ Word — bấm Tạo prompt");
    } catch {
      toast.error("Không thể đọc file Word (.docx)");
    } finally {
      setParsing(false);
    }
  }

  function applyRows(next: ImportQuestionRow[]) {
    const errors = validateImportRows(next);
    if (errors.length) {
      toast.error(errors.slice(0, 3).join(" · "));
      return;
    }
    setRows(next);
    toast.success(`Đã nhận ${next.length} câu hỏi`);
  }

  async function handleCsvOrExcel(file: File) {
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
              applyRows(results.data.filter((r) => r.Question));
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
        applyRows(json.filter((r) => r.Question));
      } else {
        toast.error("Chỉ hỗ trợ file .csv hoặc .xlsx");
        setFileName("");
      }
    } catch {
      toast.error("Không thể đọc file, vui lòng kiểm tra định dạng");
      setFileName("");
      setRows([]);
    } finally {
      setParsing(false);
    }
  }

  async function handleDocx(file: File) {
    setParsing(true);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      const factory = (correct: string) => {
        const filled = explanationTemplate.replace(
          /\{ANSWER\}/gi,
          correct.toUpperCase()
        );
        return filled.trim() || defaultExplanation(correct);
      };
      const parsed = parseQuizTextToRows(result.value, {
        explanationFactory: factory,
      });
      if (!parsed.length) {
        toast.error(
          "Không tìm thấy câu hỏi hợp lệ. Kiểm tra định dạng Word (xem hướng dẫn mẫu)."
        );
        setRows([]);
        return;
      }
      applyRows(parsed);
    } catch {
      toast.error("Không thể đọc file Word (.docx)");
      setFileName("");
      setRows([]);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-teal-700">
            Nhập câu hỏi từ file
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Môn học áp dụng</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => setSubjectId(v ?? "")}
              items={
                subjects?.map((subject) => ({
                  value: subject.id,
                  label: subject.name,
                })) ?? []
              }
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-teal-100">
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

          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-teal-100 bg-teal-50/80 p-1">
            {(
              [
                { id: "file" as const, label: "CSV / Excel" },
                { id: "docx" as const, label: "Word nhanh" },
                { id: "chatgpt" as const, label: "ChatGPT" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "rounded-xl px-2 py-2.5 text-sm font-bold transition",
                  mode === tab.id
                    ? "bg-white text-teal-700 shadow-sm ring-1 ring-teal-100"
                    : "text-slate-500 hover:text-teal-600"
                )}
                onClick={() => setMode(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-white px-3 py-1.5 font-semibold text-teal-700 transition hover:bg-teal-50"
            >
              <Download className="size-3.5" /> CSV mẫu
            </button>
            <button
              type="button"
              onClick={downloadXlsxTemplate}
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-white px-3 py-1.5 font-semibold text-teal-700 transition hover:bg-teal-50"
            >
              <Download className="size-3.5" /> Excel mẫu
            </button>
            <a
              href="/samples/docx-format-huong-dan.txt"
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-white px-3 py-1.5 font-semibold text-teal-700 transition hover:bg-teal-50"
            >
              <FileType2 className="size-3.5" /> HD Word
            </a>
            <a
              href="/samples/chatgpt-import-huong-dan.txt"
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-white px-3 py-1.5 font-semibold text-teal-700 transition hover:bg-teal-50"
            >
              <Sparkles className="size-3.5" /> HD ChatGPT
            </a>
          </div>

          {mode === "file" ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-teal-200 bg-white px-4 py-8 text-center transition hover:border-teal-300 hover:bg-teal-50/50"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
                  <UploadCloud className="size-6" />
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {fileName || "Chọn file CSV hoặc XLSX"}
                </span>
                <span className="text-xs text-slate-500">
                  Cột: Question, A–D, Correct Answer, Explanation
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleCsvOrExcel(file);
                }}
              />
            </>
          ) : mode === "docx" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="explanation-template">
                  Explanation mặc định
                </Label>
                <Textarea
                  id="explanation-template"
                  className="min-h-16 rounded-xl border-teal-100"
                  value={explanationTemplate}
                  onChange={(e) => setExplanationTemplate(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Dùng{" "}
                  <code className="rounded-md bg-teal-50 px-1.5 py-0.5 text-teal-700">
                    {"{ANSWER}"}
                  </code>{" "}
                  để chèn đáp án đúng.
                </p>
              </div>
              <button
                type="button"
                onClick={() => docxInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-teal-200 bg-white px-4 py-8 text-center transition hover:border-teal-300 hover:bg-teal-50/50"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
                  <FileType2 className="size-6" />
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {fileName || "Chọn file Word (.docx)"}
                </span>
                <span className="text-xs text-slate-500">
                  Tách câu hỏi + tạo Explanation đơn giản
                </span>
              </button>
              <input
                ref={docxInputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleDocx(file);
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-teal-100 bg-teal-50/60 px-3.5 py-3">
                <p className="mb-2 text-xs font-bold text-teal-800">
                  3 bước lấy giải thích chi tiết
                </p>
                <div className="flex flex-col gap-1.5 text-xs text-slate-600 sm:flex-row sm:gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-white">
                      1
                    </span>
                    Dán đề / tải Word
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-white">
                      2
                    </span>
                    Prompt → ChatGPT
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-white">
                      3
                    </span>
                    Dán CSV về đây
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="chatgpt-source">Nội dung đề</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-xl border-teal-100 text-teal-700 hover:bg-teal-50"
                    onClick={() => chatgptDocxRef.current?.click()}
                  >
                    <FileType2 className="size-3.5" /> Tải Word / TXT
                  </Button>
                  <input
                    ref={chatgptDocxRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const ext = file.name.split(".").pop()?.toLowerCase();
                      if (ext === "txt") {
                        void file.text().then((t) => {
                          setChatgptSource(t);
                          setFileName(file.name);
                          toast.success("Đã đọc file TXT");
                        });
                        return;
                      }
                      void loadChatgptDocx(file);
                    }}
                  />
                </div>
                <Textarea
                  id="chatgpt-source"
                  className="min-h-24 rounded-xl border-teal-100 text-sm"
                  placeholder="Dán đề thi / câu hỏi (A B C D + đáp án nếu có)..."
                  value={chatgptSource}
                  onChange={(e) => setChatgptSource(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="gap-2 rounded-xl bg-teal-500 text-white hover:bg-teal-600"
                  onClick={generateChatGptPrompt}
                >
                  <Sparkles className="size-4" /> Tạo &amp; sao chép prompt
                </Button>
                <a
                  href="https://chatgpt.com/"
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "rounded-xl border-teal-100 text-teal-700 hover:bg-teal-50"
                  )}
                >
                  Mở ChatGPT
                </a>
              </div>

              {chatgptPrompt ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Prompt đã tạo</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-xl border-teal-100 text-teal-700 hover:bg-teal-50"
                      onClick={() => {
                        void navigator.clipboard.writeText(chatgptPrompt).then(
                          () => toast.success("Đã sao chép prompt"),
                          () => toast.error("Không sao chép được")
                        );
                      }}
                    >
                      <Copy className="size-3.5" /> Sao chép lại
                    </Button>
                  </div>
                  <Textarea
                    className="min-h-20 rounded-xl border-teal-100 bg-slate-50/80 font-mono text-[11px] text-slate-600"
                    value={chatgptPrompt}
                    readOnly
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="chatgpt-reply">CSV từ ChatGPT</Label>
                <Textarea
                  id="chatgpt-reply"
                  className="min-h-24 rounded-xl border-teal-100 text-sm"
                  placeholder="Dán CSV ChatGPT trả về (kể cả khối code)..."
                  value={chatgptReply}
                  onChange={(e) => setChatgptReply(e.target.value)}
                />
                <Button
                  type="button"
                  className="gap-2 rounded-xl bg-teal-500 text-white hover:bg-teal-600"
                  disabled={!chatgptReply.trim()}
                  onClick={() => parseCsvText(chatgptReply)}
                >
                  <FileUp className="size-4" /> Phân tích CSV
                </Button>
              </div>
            </div>
          )}

          {parsing ? (
            <p className="flex items-center gap-2 text-sm text-teal-600">
              <Loader2 className="size-4 animate-spin" /> Đang đọc file...
            </p>
          ) : rows.length > 0 ? (
            <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-emerald-700">
                  Sẵn sàng: {rows.length} câu hỏi
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() =>
                    downloadTextFile(
                      mode === "chatgpt"
                        ? "questions-from-chatgpt.csv"
                        : "questions-from-docx.csv",
                      rowsToCsv(rows),
                      "text/csv;charset=utf-8"
                    )
                  }
                >
                  <Download className="size-3.5" /> Tải CSV
                </Button>
              </div>
              <div className="max-h-48 overflow-auto rounded-xl border border-white bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Câu hỏi</TableHead>
                      <TableHead>Đúng</TableHead>
                      <TableHead>Explanation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 8).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-[220px] truncate text-sm">
                          {row.Question}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-teal-100 text-xs font-bold text-teal-700">
                            {row["Correct Answer"]}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs text-slate-500">
                          {row.Explanation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 8 ? (
                <p className="text-xs text-slate-500">
                  Đang xem 8/{rows.length} câu — import sẽ lấy đủ.
                </p>
              ) : null}
            </div>
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
            className="kid-btn gap-2 bg-emerald-500 text-white hover:bg-emerald-600"
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
    onMutate: () => toast.loading("Đang sao chép...", { id: "copy-question" }),
    onSuccess: () => {
      toast.success("Đã sao chép câu hỏi", { id: "copy-question" });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (error: Error) =>
      toast.error(error.message || "Không thể sao chép", { id: "copy-question" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
    onMutate: () => toast.loading("Đang xoá câu hỏi...", { id: "delete-question" }),
    onSuccess: () => {
      toast.success("Đã xoá câu hỏi", { id: "delete-question" });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (error: Error) =>
      toast.error(error.message || "Không thể xoá câu hỏi", {
        id: "delete-question",
      }),
  });

  function handleDelete(id: string) {
    if (
      window.confirm(
        "Xoá câu hỏi này?\n\nCâu hỏi sẽ bị gỡ khỏi mọi quiz; đáp án trong bài làm cũ cũng bị xoá. Không thể hoàn tác."
      )
    ) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div>
      <PageHeader
        title="Ngân hàng câu hỏi"
        description="Nhập hàng loạt hoặc dùng lại câu hỏi giữa các quiz. Cách nhanh: thêm câu hỏi ngay trong trang quiz."
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
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm câu hỏi..."
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <Select
          value={subjectFilter}
          onValueChange={(v) => setSubjectFilter(v ?? "all")}
          items={[
            { value: "all", label: "Tất cả môn học" },
            ...(subjects?.map((subject) => ({
              value: subject.id,
              label: subject.name,
            })) ?? []),
          ]}
        >
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
              className={cn(buttonVariants(), "kid-btn bg-teal-500 hover:bg-teal-600")}
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
                      className="font-semibold text-teal-700 hover:underline"
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
                        disabled={copyMutation.isPending || deleteMutation.isPending}
                        aria-label="Sao chép"
                      >
                        {copyMutation.isPending &&
                        copyMutation.variables === question.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Copy className="size-4" />
                        )}
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
                        disabled={deleteMutation.isPending || copyMutation.isPending}
                        aria-label="Xoá"
                      >
                        {deleteMutation.isPending &&
                        deleteMutation.variables === question.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
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

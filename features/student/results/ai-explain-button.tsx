"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { OptionLabel } from "@/types/database";

interface ExplainResponse {
  explanation: string;
  wrong_reason: string;
  model: string;
}

interface AIExplainButtonProps {
  questionId: string;
  studentLabel: OptionLabel | null;
  /** Học sinh có trả lời đúng không — dùng để đổi label nút. */
  isCorrect: boolean;
  /** Disabled khi API key chưa cấu hình. */
  disabled?: boolean;
  /** Lý do disabled (hiện tooltip) */
  disabledReason?: string;
}

async function fetchExplanation(
  questionId: string,
  studentLabel: OptionLabel | null
): Promise<ExplainResponse> {
  const safeLabel: "A" | "B" | "C" | "D" | null =
    studentLabel === "A" ||
    studentLabel === "B" ||
    studentLabel === "C" ||
    studentLabel === "D"
      ? studentLabel
      : null;

  const res = await fetch("/api/ai/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question_id: questionId,
      student_label: safeLabel,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "AI không phản hồi");
  }
  return data as ExplainResponse;
}

export function AIExplainButton({
  questionId,
  studentLabel,
  isCorrect,
  disabled,
  disabledReason,
}: AIExplainButtonProps) {
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => fetchExplanation(questionId, studentLabel),
    onError: (err: Error) => {
      toast.error(err.message || "Không thể gọi AI");
    },
  });

  function handleClick() {
    if (disabled) {
      toast.error(disabledReason || "Tính năng AI chưa sẵn sàng");
      return;
    }
    setOpen(true);
    if (!mutation.data) {
      mutation.mutate();
    }
  }

  const buttonLabel = isCorrect
    ? "Xem giải thích thêm"
    : studentLabel
      ? "Hỏi AI vì sao sai"
      : "Hỏi AI gợi ý";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "gap-1.5 rounded-xl border-indigo-200 bg-indigo-50 text-indigo-700",
          "hover:bg-indigo-100 hover:text-indigo-800",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        <Sparkles className="size-3.5" />
        {buttonLabel}
      </Button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="kid-card relative w-full max-w-lg space-y-4 bg-white p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-slate-800">
                    Gia sư AI
                  </p>
                  <p className="text-xs text-slate-500">
                    Giải thích ngắn gọn, dễ hiểu
                  </p>
                </div>
              </div>

              {mutation.isPending ? (
                <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
                  <Loader2 className="size-8 animate-spin text-indigo-500" />
                  <p className="text-sm">Đang hỏi AI...</p>
                </div>
              ) : mutation.data ? (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Vì sao đáp án đúng?
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {mutation.data.explanation}
                    </p>
                  </div>
                  {mutation.data.wrong_reason ? (
                    <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-rose-700">
                        {studentLabel ? "Vì sao con chọn sai?" : "Gợi ý"}
                      </p>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {mutation.data.wrong_reason}
                      </p>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => mutation.mutate()}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Hỏi lại để có câu trả lời khác
                  </button>
                </div>
              ) : mutation.isError ? (
                <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
                  {(mutation.error as Error).message}
                </div>
              ) : null}

              <div className="flex justify-end pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="rounded-xl"
                >
                  Đóng
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
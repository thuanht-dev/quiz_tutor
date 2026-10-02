"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { OptionLabel } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExplainResponse {
  explanation: string;
  wrong_reason: string;
  model: string;
}

interface ChatResponse {
  answer: string;
  model: string;
}

/** Một lượt chat. */
export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
}

interface AIExplainButtonProps {
  questionId: string;
  studentLabel: OptionLabel | null;
  isCorrect: boolean;
  /** Quiz context để gửi cho AI khi hỏi tự do. */
  quizContext?: {
    quizTitle: string;
    subjectName?: string;
    questions: {
      index: number;
      content: string;
      options: { label: OptionLabel; content: string; isCorrect: boolean }[];
    }[];
    currentQuestionIndex: number;
  };
  disabled?: boolean;
  disabledReason?: string;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function fetchExplanation(
  questionId: string,
  studentLabel: OptionLabel | null
): Promise<ExplainResponse> {
  const res = await fetch("/api/ai/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_id: questionId, student_label: studentLabel }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "AI không phản hồi");
  return data as ExplainResponse;
}

async function fetchChat(
  questionId: string,
  quizContext: AIExplainButtonProps["quizContext"],
  messages: ChatMessage[],
  newMessage: string
): Promise<ChatResponse> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question_id: questionId,
      quiz_context: quizContext ?? null,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      new_message: newMessage,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "AI không phản hồi");
  return data as ChatResponse;
}

// ---------------------------------------------------------------------------
// ChatBubble
// ---------------------------------------------------------------------------

function ChatBubble({
  message,
}: {
  message: ChatMessage;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-indigo-500 text-white"
            : "rounded-bl-sm bg-slate-100 text-slate-800"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AIExplainButton({
  questionId,
  studentLabel,
  isCorrect,
  quizContext,
  disabled,
  disabledReason,
}: AIExplainButtonProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Lần đầu: fetch explanation
  const explainMutation = useMutation({
    mutationFn: () => fetchExplanation(questionId, studentLabel),
    onError: (err: Error) => toast.error(err.message || "Không thể gọi AI"),
  });

  // Chat follow-up
  const chatMutation = useMutation({
    mutationFn: (msg: string) =>
      fetchChat(questionId, quizContext, messages, msg),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "model", content: data.answer },
      ]);
    },
    onError: (err: Error) => toast.error(err.message || "AI không trả lời được"),
  });

  function openModal() {
    if (disabled) {
      toast.error(disabledReason || "Tính năng AI chưa sẵn sàng");
      return;
    }
    setOpen(true);
    if (!explainMutation.data && !explainMutation.isPending) {
      explainMutation.mutate();
    }
  }

  function handleSendChat() {
    const text = chatInput.trim();
    if (!text || chatMutation.isPending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    chatMutation.mutate(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  }

  // Scroll to bottom when messages change
  const messagesRef = useRef<HTMLDivElement>(null);

  const initialAnswer = explainMutation.data;

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
        onClick={openModal}
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
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="kid-card relative flex w-full max-w-md flex-col overflow-hidden bg-white sm:max-w-lg"
              style={{ maxHeight: "85vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-sm">
                  <Sparkles className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="font-display font-bold text-slate-800">
                    Gia sư AI
                  </p>
                  <p className="text-xs text-slate-500">Hỏi tự do về bài này</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Đóng"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Scrollable chat area */}
              <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {/* Initial explanation */}
                {explainMutation.isPending ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="size-4 animate-spin" />
                    Đang hỏi AI...
                  </div>
                ) : explainMutation.isError ? (
                  <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-800">
                    {(explainMutation.error as Error).message}
                  </div>
                ) : initialAnswer ? (
                  <>
                    <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                        Vì sao đáp án đúng?
                      </p>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {initialAnswer.explanation}
                      </p>
                    </div>
                    {initialAnswer.wrong_reason ? (
                      <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-rose-700">
                          Vì sao con chọn sai?
                        </p>
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {initialAnswer.wrong_reason}
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {/* Chat messages */}
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}

                {/* Loading indicator */}
                {chatMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="size-4 animate-spin" />
                    AI đang suy nghĩ...
                  </div>
                )}

              </div>

              {/* Input area */}
              <div className="border-t border-slate-100 px-4 py-3">
                <div className="flex items-end gap-2">
                  <div className="relative flex-1">
                    <textarea
                      rows={1}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Hỏi thêm về bài này..."
                      disabled={chatMutation.isPending}
                      className={cn(
                        "scrollbar-none w-full resize-none rounded-xl border border-slate-200 bg-slate-50",
                        "px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400",
                        "outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100",
                        "disabled:cursor-not-allowed disabled:opacity-60"
                      )}
                      style={{ minHeight: "40px", maxHeight: "120px" }}
                      onInput={(e) => {
                        const t = e.currentTarget;
                        t.style.height = "auto";
                        t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                      }}
                    />
                  </div>
                  <Button
                    size="icon-sm"
                    onClick={handleSendChat}
                    disabled={
                      !chatInput.trim() ||
                      chatMutation.isPending ||
                      explainMutation.isPending
                    }
                    className="shrink-0 rounded-xl bg-indigo-500 text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-indigo-600 active:translate-y-0 disabled:opacity-50"
                    aria-label="Gửi"
                  >
                    {chatMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                  </Button>
                </div>
                <p className="mt-1.5 text-center text-xs text-slate-400">
                  Hỏi tự do — AI trả lời dựa trên nội dung bài quiz
                </p>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

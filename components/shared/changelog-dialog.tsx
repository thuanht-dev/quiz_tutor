"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChangelogItem {
  version: string;
  date: string;
  features: string[];
}

const CHANGELOG: ChangelogItem[] = [
  {
    version: "1.1.0",
    date: "30/08/2026",
    features: [
      "🔀 Xáo trộn câu hỏi & đáp án khi làm lại bài (từ lần 2 trở đi)",
      "🔊 Âm thanh động khi chọn đáp án và hoàn thành bài",
      "🎯 Làm lại chỉ các câu sai sau một số lần chưa đạt",
      "✨ Cải thiện giao diện kết quả bài làm",
    ],
  },
];

const STORAGE_KEY = "quiz_tutor_last_seen_version";

export function ChangelogDialog() {
  const [open, setOpen] = useState(false);
  const latestVersion = CHANGELOG[0]?.version;

  useEffect(() => {
    if (!latestVersion) return;
    
    const lastSeenVersion = localStorage.getItem(STORAGE_KEY);
    
    // Show dialog if user hasn't seen this version yet
    if (lastSeenVersion !== latestVersion) {
      // Delay showing to avoid conflicting with other startup dialogs
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [latestVersion]);

  const handleClose = () => {
    if (latestVersion) {
      localStorage.setItem(STORAGE_KEY, latestVersion);
    }
    setOpen(false);
  };

  if (!CHANGELOG.length) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500">
              <Sparkles className="size-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Tính năng mới!</DialogTitle>
              <DialogDescription>
                Phiên bản {CHANGELOG[0].version} · {CHANGELOG[0].date}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {CHANGELOG.map((changelog, idx) => (
              <motion.div
                key={changelog.version}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 p-4"
              >
                <ul className="space-y-2.5">
                  {changelog.features.map((feature, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                      className="flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      <span className="text-sm font-medium text-slate-700">
                        {feature}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={handleClose}
              className="kid-btn bg-teal-500 text-white hover:bg-teal-600"
            >
              <Sparkles className="size-4" />
              Tuyệt vời!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import Link from "next/link";
import { LogIn, Pencil, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { useGuestSession } from "@/stores/guest-session";
import { useQuizSession } from "@/stores/quiz-session";
import { GuestNameGate } from "@/features/student/guest-name-gate";

export function StudentShell({ children }: { children: React.ReactNode }) {
  const displayName = useGuestSession((s) => s.displayName);
  const clearGuest = useGuestSession((s) => s.clearGuest);
  const soundEnabled = useQuizSession((s) => s.soundEnabled);
  const toggleSound = useQuizSession((s) => s.toggleSound);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-teal-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-teal-600 font-display text-lg font-bold text-white shadow-md shadow-teal-200">
              T
            </span>
            <div>
              <p className="font-display text-xl font-bold text-teal-600">
                {APP_NAME}
              </p>
              <p className="text-xs text-slate-500">
                {displayName ? `Xin chào, ${displayName}!` : "Học sinh"}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={toggleSound}
              aria-label="Bật/tắt âm thanh"
            >
              {soundEnabled ? <Volume2 /> : <VolumeX />}
            </Button>
            {displayName ? (
              <Button
                type="button"
                variant="outline"
                className="h-8 gap-1.5 rounded-xl px-2.5 text-sm"
                onClick={() => clearGuest()}
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline">Đổi tên</span>
              </Button>
            ) : null}
            <Link
              href="/login"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
              title="Đăng nhập giáo viên"
            >
              <LogIn className="size-4" />
              <span className="hidden sm:inline">GV</span>
            </Link>
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <GuestNameGate>{children}</GuestNameGate>
      </main>
    </div>
  );
}

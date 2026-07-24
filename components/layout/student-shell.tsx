"use client";

import Link from "next/link";
import { LogOut, Home, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { signOutAction } from "@/lib/auth/actions";
import { useQuizSession } from "@/stores/quiz-session";
import type { Profile } from "@/types/database";

export function StudentShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const soundEnabled = useQuizSession((s) => s.soundEnabled);
  const toggleSound = useQuizSession((s) => s.toggleSound);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-sky-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-sky-500 text-lg text-white shadow-md shadow-sky-200">
              🐻
            </span>
            <div>
              <p className="font-display text-xl font-bold text-sky-600">
                {APP_NAME}
              </p>
              <p className="text-xs text-slate-500">
                Xin chào, {profile.display_name}!
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
            <Link
              href="/"
              className="inline-flex h-8 items-center gap-2 rounded-xl border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
            >
              <Home className="size-4" />
              <span className="hidden sm:inline">Trang chủ</span>
            </Link>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="rounded-xl"
                aria-label="Đăng xuất"
              >
                <LogOut />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

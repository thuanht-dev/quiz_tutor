"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  GraduationCap,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { signOutAction } from "@/lib/auth/actions";
import type { Profile } from "@/types/database";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/subjects", label: "Môn học", icon: BookOpen },
  { href: "/admin/quizzes", label: "Quiz", icon: ClipboardList },
  { href: "/admin/questions", label: "Ngân hàng", icon: HelpCircle },
  { href: "/admin/attempts", label: "Bài làm", icon: GraduationCap },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition",
              active
                ? "bg-teal-600 text-white shadow-md shadow-teal-200/80"
                : "text-slate-600 hover:bg-teal-50 hover:text-teal-800"
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-teal-100 bg-white/80 p-5 lg:block">
        <div className="mb-8">
          <p className="font-display text-2xl font-bold text-teal-700">
            {APP_NAME}
          </p>
          <p className="text-sm text-slate-500">Quản trị gia sư</p>
        </div>
        <NavLinks />
        <form action={signOutAction} className="mt-8">
          <div className="rounded-2xl bg-teal-50 p-4">
            <p className="font-bold text-slate-800">{profile.display_name}</p>
            <p className="text-xs text-slate-500">@{profile.username}</p>
            <Button
              type="submit"
              variant="ghost"
              className="mt-3 w-full justify-start gap-2 text-slate-600"
            >
              <LogOut className="size-4" />
              Đăng xuất
            </Button>
          </div>
        </form>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-teal-100 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
          <p className="font-display text-xl font-bold text-teal-600">
            {APP_NAME}
          </p>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="rounded-xl" />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-5">
              <p className="mb-6 font-display text-xl font-bold text-teal-600">
                Menu
              </p>
              <NavLinks onNavigate={() => setOpen(false)} />
              <form action={signOutAction} className="mt-6">
                <Button type="submit" variant="outline" className="w-full gap-2">
                  <LogOut className="size-4" />
                  Đăng xuất
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </header>
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

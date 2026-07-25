"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USE_MOCK, usernameToEmail } from "@/lib/constants";
import { db } from "@/lib/repositories/mock-db";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

const MOCK_SESSION_COOKIE = "tq_mock_session";

export async function getCurrentProfile(): Promise<Profile | null> {
  if (USE_MOCK) {
    const cookieStore = await cookies();
    const userId = cookieStore.get(MOCK_SESSION_COOKIE)?.value;
    if (!userId) return null;
    const profile = db.profiles.find((p) => p.id === userId && p.is_active) ?? null;
    if (profile && profile.role !== "admin") return null;
    return profile;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data || data.role !== "admin") return null;
  return data as Profile;
}

export async function requireProfile(role: "admin" = "admin") {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (role && profile.role !== role) {
    redirect("/login");
  }
  return profile;
}

export async function signInAction(username: string, password: string) {
  const normalized = username.toLowerCase().trim();

  if (USE_MOCK) {
    const profile = db.profiles.find(
      (p) => p.username === normalized && p.is_active && p.role === "admin"
    );
    if (!profile || db.passwords[normalized] !== password) {
      return { error: "Sai tên đăng nhập hoặc mật khẩu" };
    }
    const cookieStore = await cookies();
    cookieStore.set(MOCK_SESSION_COOKIE, profile.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return { ok: true as const, role: "admin" as const };
  }

  const supabase = await createClient();
  const { data: email, error: lookupError } = await supabase.rpc(
    "get_login_email",
    { p_username: normalized }
  );

  const loginEmail =
    !lookupError && email ? (email as string) : usernameToEmail(normalized);

  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password,
  });
  if (error) return { error: "Sai tên đăng nhập hoặc mật khẩu" };

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Tài khoản này không phải quản trị viên" };
  }
  return { ok: true as const, role: "admin" as const };
}

export async function signOutAction() {
  if (USE_MOCK) {
    const cookieStore = await cookies();
    cookieStore.delete(MOCK_SESSION_COOKIE);
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

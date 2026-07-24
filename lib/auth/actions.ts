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
    return db.profiles.find((p) => p.id === userId && p.is_active) ?? null;
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

  return data as Profile | null;
}

export async function requireProfile(role?: "admin" | "student") {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (role && profile.role !== role) {
    redirect(profile.role === "admin" ? "/admin" : "/");
  }
  return profile;
}

export async function signInAction(username: string, password: string) {
  const normalized = username.toLowerCase().trim();

  if (USE_MOCK) {
    const profile = db.profiles.find((p) => p.username === normalized && p.is_active);
    if (!profile || db.passwords[normalized] !== password) {
      return { error: "Sai tên đăng nhập hoặc mật khẩu" };
    }
    const cookieStore = await cookies();
    cookieStore.set(MOCK_SESSION_COOKIE, profile.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return {
      ok: true as const,
      role: profile.role,
    };
  }

  const supabase = await createClient();
  const { data: email, error: lookupError } = await supabase.rpc(
    "get_login_email",
    { p_username: normalized }
  );

  if (lookupError || !email) {
    // Fallback: construct student email domain
    const fallbackEmail = usernameToEmail(normalized);
    const { error } = await supabase.auth.signInWithPassword({
      email: fallbackEmail,
      password,
    });
    if (error) return { error: "Sai tên đăng nhập hoặc mật khẩu" };
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email: email as string,
      password,
    });
    if (error) return { error: "Sai tên đăng nhập hoặc mật khẩu" };
  }

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Không tìm thấy hồ sơ người dùng" };
  return { ok: true as const, role: profile.role };
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

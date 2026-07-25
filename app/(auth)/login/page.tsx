import { LoginForm } from "@/features/auth/login-form";
import { getCurrentProfile } from "@/lib/auth/actions";
import { redirect } from "next/navigation";

export const metadata = { title: "Đăng nhập" };

export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect("/admin");
  }
  return <LoginForm />;
}

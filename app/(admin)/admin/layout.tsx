import { AdminShell } from "@/components/layout/admin-shell";
import { requireProfile } from "@/lib/auth/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile("admin");
  return <AdminShell profile={profile}>{children}</AdminShell>;
}

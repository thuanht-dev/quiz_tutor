import { StudentShell } from "@/components/layout/student-shell";
import { requireProfile } from "@/lib/auth/actions";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile("student");
  return <StudentShell profile={profile}>{children}</StudentShell>;
}

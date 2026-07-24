import { HomeView } from "@/features/student/home/home-view";
import { requireProfile } from "@/lib/auth/actions";
import { listStudentHomeData } from "@/lib/repositories";

export const metadata = { title: "Trang chủ" };

export default async function StudentHomePage() {
  const profile = await requireProfile("student");
  const { quizzes, recent } = await listStudentHomeData(profile.id);

  return <HomeView profile={profile} quizzes={quizzes} recent={recent} />;
}

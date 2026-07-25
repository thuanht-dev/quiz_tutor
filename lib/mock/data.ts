import type {
  Attempt,
  AttemptAnswer,
  Option,
  Profile,
  Question,
  Quiz,
  QuizQuestion,
  Subject,
} from "@/types/database";

export const MOCK_ADMIN_ID = "11111111-1111-1111-1111-111111111111";
export const MOCK_GUEST_IDS = {
  minh: "33333333-3333-3333-3333-333333333331",
  lan: "33333333-3333-3333-3333-333333333332",
} as const;

export const mockProfiles: Profile[] = [
  {
    id: MOCK_ADMIN_ID,
    username: "admin",
    display_name: "Cô Mai",
    role: "admin",
    avatar_url: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];

export const mockSubjects: Subject[] = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    name: "Toán",
    color: "#F97316",
    icon: "calculator",
    sort_order: 1,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
    name: "Tiếng Việt",
    color: "#22C55E",
    icon: "book-open",
    sort_order: 2,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
    name: "Tiếng Anh",
    color: "#0EA5E9",
    icon: "languages",
    sort_order: 3,
    created_at: "2026-01-01T00:00:00Z",
  },
];

export const mockQuizzes: Quiz[] = [
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
    subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    title: "Phép cộng lớp 2",
    description: "Luyện phép cộng trong phạm vi 100",
    time_limit_seconds: 600,
    pass_percent: 85,
    retry_wrong_after_fails: 3,
    auto_advance_on_answer: false,
    show_explanation_on_answer: false,
    status: "published",
    created_at: "2026-01-05T00:00:00Z",
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
    subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
    title: "Từ đồng nghĩa",
    description: "Chọn từ đồng nghĩa phù hợp",
    time_limit_seconds: null,
    pass_percent: 85,
    retry_wrong_after_fails: 3,
    auto_advance_on_answer: false,
    show_explanation_on_answer: false,
    status: "published",
    created_at: "2026-01-06T00:00:00Z",
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3",
    subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
    title: "Animals vocabulary",
    description: "Nhận biết tên động vật bằng tiếng Anh",
    time_limit_seconds: 300,
    pass_percent: 85,
    retry_wrong_after_fails: 3,
    auto_advance_on_answer: false,
    show_explanation_on_answer: false,
    status: "draft",
    created_at: "2026-01-07T00:00:00Z",
  },
];

const q = (
  id: string,
  subject_id: string,
  content: string,
  explanation: string,
  points: number,
  options: [string, string, string, string],
  correct: "A" | "B" | "C" | "D"
): Question => ({
  id,
  subject_id,
  content,
  image_url: null,
  explanation,
  points,
  created_at: "2026-01-05T00:00:00Z",
  options: (["A", "B", "C", "D"] as const).map((label, i) => ({
    id: `${id}-opt-${label}`,
    question_id: id,
    label,
    content: options[i],
    is_correct: label === correct,
    sort_order: i + 1,
  })),
});

export const mockQuestions: Question[] = [
  q(
    "cccccccc-cccc-cccc-cccc-ccccccccccc1",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    "15 + 7 = ?",
    "15 cộng 7 bằng 22.",
    1,
    ["21", "22", "23", "24"],
    "B"
  ),
  q(
    "cccccccc-cccc-cccc-cccc-ccccccccccc2",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    "20 + 30 = ?",
    "20 cộng 30 bằng 50.",
    1,
    ["40", "50", "60", "70"],
    "B"
  ),
  q(
    "cccccccc-cccc-cccc-cccc-ccccccccccc3",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    "8 + 9 = ?",
    "8 cộng 9 bằng 17.",
    1,
    ["16", "17", "18", "19"],
    "B"
  ),
  q(
    "cccccccc-cccc-cccc-cccc-ccccccccccc4",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    "12 + 18 = ?",
    "12 cộng 18 bằng 30.",
    2,
    ["28", "29", "30", "32"],
    "C"
  ),
  q(
    "cccccccc-cccc-cccc-cccc-ccccccccccc5",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
    'Từ nào đồng nghĩa với "vui vẻ"?',
    '"Vui vẻ" đồng nghĩa với "hạnh phúc".',
    1,
    ["Buồn bã", "Hạnh phúc", "Giận dữ", "Mệt mỏi"],
    "B"
  ),
  q(
    "cccccccc-cccc-cccc-cccc-ccccccccccc6",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
    'Từ nào đồng nghĩa với "nhanh"?',
    '"Nhanh" đồng nghĩa với "mau".',
    1,
    ["Chậm", "Mau", "Yếu", "Xa"],
    "B"
  ),
  q(
    "cccccccc-cccc-cccc-cccc-ccccccccccc7",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
    'Từ nào đồng nghĩa với "đẹp"?',
    '"Đẹp" đồng nghĩa với "xinh".',
    1,
    ["Xấu", "Xinh", "To", "Cao"],
    "B"
  ),
  q(
    "cccccccc-cccc-cccc-cccc-ccccccccccc8",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
    'What is "con mèo" in English?',
    '"Con mèo" là "cat".',
    1,
    ["Dog", "Cat", "Bird", "Fish"],
    "B"
  ),
  q(
    "cccccccc-cccc-cccc-cccc-ccccccccccc9",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
    'What is "con chó" in English?',
    '"Con chó" là "dog".',
    1,
    ["Cat", "Dog", "Cow", "Pig"],
    "B"
  ),
];

export const mockQuizQuestions: QuizQuestion[] = [
  { quiz_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1", question_id: "cccccccc-cccc-cccc-cccc-ccccccccccc1", sort_order: 1 },
  { quiz_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1", question_id: "cccccccc-cccc-cccc-cccc-ccccccccccc2", sort_order: 2 },
  { quiz_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1", question_id: "cccccccc-cccc-cccc-cccc-ccccccccccc3", sort_order: 3 },
  { quiz_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1", question_id: "cccccccc-cccc-cccc-cccc-ccccccccccc4", sort_order: 4 },
  { quiz_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", question_id: "cccccccc-cccc-cccc-cccc-ccccccccccc5", sort_order: 1 },
  { quiz_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", question_id: "cccccccc-cccc-cccc-cccc-ccccccccccc6", sort_order: 2 },
  { quiz_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", question_id: "cccccccc-cccc-cccc-cccc-ccccccccccc7", sort_order: 3 },
  { quiz_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3", question_id: "cccccccc-cccc-cccc-cccc-ccccccccccc8", sort_order: 1 },
  { quiz_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3", question_id: "cccccccc-cccc-cccc-cccc-ccccccccccc9", sort_order: 2 },
];

export let mockAttempts: Attempt[] = [
  {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1",
    quiz_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
    student_id: null,
    guest_name: "Nguyễn Minh",
    guest_id: MOCK_GUEST_IDS.minh,
    started_at: "2026-03-20T08:00:00Z",
    submitted_at: "2026-03-20T08:08:00Z",
    score: 4,
    max_score: 5,
    correct_count: 3,
    total_questions: 4,
    duration_seconds: 480,
    status: "submitted",
    passed: false,
    parent_attempt_id: null,
    is_retry_wrong: false,
    created_at: "2026-03-20T08:00:00Z",
  },
  {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2",
    quiz_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
    student_id: null,
    guest_name: "Trần Lan",
    guest_id: MOCK_GUEST_IDS.lan,
    started_at: "2026-03-21T09:00:00Z",
    submitted_at: "2026-03-21T09:05:00Z",
    score: 3,
    max_score: 3,
    correct_count: 3,
    total_questions: 3,
    duration_seconds: 300,
    status: "submitted",
    passed: true,
    parent_attempt_id: null,
    is_retry_wrong: false,
    created_at: "2026-03-21T09:00:00Z",
  },
  {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3",
    quiz_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
    student_id: null,
    guest_name: "Lê Hùng",
    guest_id: "gggggggg-gggg-gggg-gggg-ggggggggggg3",
    started_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    submitted_at: null,
    score: 0,
    max_score: 0,
    correct_count: 0,
    total_questions: 0,
    duration_seconds: null,
    status: "in_progress",
    passed: false,
    parent_attempt_id: null,
    is_retry_wrong: false,
    created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
];

export let mockAttemptAnswers: AttemptAnswer[] = [];

export const mockPasswords: Record<string, string> = {
  admin: "admin123",
};

export function getAllOptions(): Option[] {
  return mockQuestions.flatMap((question) => question.options ?? []);
}

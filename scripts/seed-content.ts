/**
 * Seed subjects / quizzes / questions / options (mirrors supabase/seed.sql)
 * Usage: npx tsx scripts/seed-content.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function main() {
  const { error: subjectsError } = await admin.from("subjects").upsert([
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      name: "Toán",
      color: "#F97316",
      icon: "calculator",
      sort_order: 1,
    },
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
      name: "Tiếng Việt",
      color: "#22C55E",
      icon: "book-open",
      sort_order: 2,
    },
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
      name: "Tiếng Anh",
      color: "#0EA5E9",
      icon: "languages",
      sort_order: 3,
    },
  ]);
  if (subjectsError) throw subjectsError;
  console.log("subjects upserted");

  const { error: quizzesError } = await admin.from("quizzes").upsert([
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
      subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      title: "Phép cộng lớp 2",
      description: "Luyện phép cộng trong phạm vi 100",
      time_limit_seconds: 600,
      status: "published",
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
      subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
      title: "Từ đồng nghĩa",
      description: "Chọn từ đồng nghĩa phù hợp",
      time_limit_seconds: null,
      status: "published",
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3",
      subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
      title: "Animals vocabulary",
      description: "Nhận biết tên động vật bằng tiếng Anh",
      time_limit_seconds: 300,
      status: "draft",
    },
  ]);
  if (quizzesError) throw quizzesError;
  console.log("quizzes upserted");

  const questions = [
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc1",
      subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      content: "15 + 7 = ?",
      explanation: "15 cộng 7 bằng 22.",
      points: 1,
      options: [
        ["A", "21", false],
        ["B", "22", true],
        ["C", "23", false],
        ["D", "24", false],
      ] as const,
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc2",
      subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      content: "20 + 30 = ?",
      explanation: "20 cộng 30 bằng 50.",
      points: 1,
      options: [
        ["A", "40", false],
        ["B", "50", true],
        ["C", "60", false],
        ["D", "70", false],
      ] as const,
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc3",
      subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      content: "8 + 9 = ?",
      explanation: "8 cộng 9 bằng 17.",
      points: 1,
      options: [
        ["A", "16", false],
        ["B", "17", true],
        ["C", "18", false],
        ["D", "19", false],
      ] as const,
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc4",
      subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      content: "12 + 18 = ?",
      explanation: "12 cộng 18 bằng 30.",
      points: 2,
      options: [
        ["A", "28", false],
        ["B", "29", false],
        ["C", "30", true],
        ["D", "32", false],
      ] as const,
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc5",
      subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
      content: 'Từ nào đồng nghĩa với "vui vẻ"?',
      explanation: '"Vui vẻ" đồng nghĩa với "hạnh phúc".',
      points: 1,
      options: [
        ["A", "Buồn bã", false],
        ["B", "Hạnh phúc", true],
        ["C", "Giận dữ", false],
        ["D", "Mệt mỏi", false],
      ] as const,
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc6",
      subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
      content: 'Từ nào đồng nghĩa với "nhanh"?',
      explanation: '"Nhanh" đồng nghĩa với "mau".',
      points: 1,
      options: [
        ["A", "Chậm", false],
        ["B", "Mau", true],
        ["C", "Yếu", false],
        ["D", "Xa", false],
      ] as const,
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc7",
      subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
      content: 'Từ nào đồng nghĩa với "đẹp"?',
      explanation: '"Đẹp" đồng nghĩa với "xinh".',
      points: 1,
      options: [
        ["A", "Xấu", false],
        ["B", "Xinh", true],
        ["C", "To", false],
        ["D", "Cao", false],
      ] as const,
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc8",
      subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
      content: 'What is "con mèo" in English?',
      explanation: '"Con mèo" là "cat".',
      points: 1,
      options: [
        ["A", "Dog", false],
        ["B", "Cat", true],
        ["C", "Bird", false],
        ["D", "Fish", false],
      ] as const,
    },
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc9",
      subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
      content: 'What is "con chó" in English?',
      explanation: '"Con chó" là "dog".',
      points: 1,
      options: [
        ["A", "Cat", false],
        ["B", "Dog", true],
        ["C", "Cow", false],
        ["D", "Pig", false],
      ] as const,
    },
  ];

  for (const q of questions) {
    const { error: qError } = await admin.from("questions").upsert({
      id: q.id,
      subject_id: q.subject_id,
      content: q.content,
      explanation: q.explanation,
      points: q.points,
      image_url: null,
    });
    if (qError) throw qError;

    await admin.from("options").delete().eq("question_id", q.id);
    const { error: oError } = await admin.from("options").insert(
      q.options.map(([label, content, is_correct], i) => ({
        question_id: q.id,
        label,
        content,
        is_correct,
        sort_order: i + 1,
      }))
    );
    if (oError) throw oError;
  }
  console.log("questions + options upserted");

  const links = [
    ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1", "cccccccc-cccc-cccc-cccc-ccccccccccc1", 1],
    ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1", "cccccccc-cccc-cccc-cccc-ccccccccccc2", 2],
    ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1", "cccccccc-cccc-cccc-cccc-ccccccccccc3", 3],
    ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1", "cccccccc-cccc-cccc-cccc-ccccccccccc4", 4],
    ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", "cccccccc-cccc-cccc-cccc-ccccccccccc5", 1],
    ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", "cccccccc-cccc-cccc-cccc-ccccccccccc6", 2],
    ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", "cccccccc-cccc-cccc-cccc-ccccccccccc7", 3],
    ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3", "cccccccc-cccc-cccc-cccc-ccccccccccc8", 1],
    ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3", "cccccccc-cccc-cccc-cccc-ccccccccccc9", 2],
  ] as const;

  const { error: linkError } = await admin.from("quiz_questions").upsert(
    links.map(([quiz_id, question_id, sort_order]) => ({
      quiz_id,
      question_id,
      sort_order,
    }))
  );
  if (linkError) throw linkError;
  console.log("quiz_questions upserted");
  console.log("Done seeding content.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

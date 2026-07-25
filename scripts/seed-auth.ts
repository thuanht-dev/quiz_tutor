/**
 * Bootstrap admin Auth user + profile for Teddy Quiz.
 * Usage: npx tsx scripts/seed-auth.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_USE_MOCK=false
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  {
    username: "admin",
    display_name: "Cô Mai",
    role: "admin" as const,
    password: "admin123",
  },
];

async function ensureUser(user: (typeof USERS)[number]) {
  const email = `${user.username}@students.local`;

  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = listed?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  let userId = existing?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
    });
    if (error) throw new Error(`Create ${user.username}: ${error.message}`);
    userId = data.user.id;
    console.log(`Created auth user: ${user.username}`);
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: user.password,
      email_confirm: true,
      user_metadata: {
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
    });
    if (error) throw new Error(`Update ${user.username}: ${error.message}`);
    console.log(`Updated auth user: ${user.username}`);
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    is_active: true,
  });
  if (profileError) {
    throw new Error(`Profile ${user.username}: ${profileError.message}`);
  }
  console.log(`Upserted profile: ${user.username} (${user.role})`);
}

async function checkSchema() {
  const { error } = await admin.from("subjects").select("id").limit(1);
  if (error) {
    console.error("\nSchema check failed:", error.message);
    console.error(
      "→ Hãy chạy các file SQL trong supabase/migrations/ trên Supabase SQL Editor."
    );
    process.exit(1);
  }
  console.log("Schema OK (subjects table reachable)");
}

async function main() {
  console.log("Checking schema...");
  await checkSchema();
  console.log("\nSeeding admin auth user + profile...");
  for (const user of USERS) {
    await ensureUser(user);
  }
  console.log("\nDone. Admin login: admin / admin123");
  console.log("Học sinh: mở trang chủ, nhập tên (không cần tài khoản).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

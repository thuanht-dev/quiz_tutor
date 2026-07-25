# Teddy Quiz — Quiz Web for Tutor

Website trắc nghiệm dành cho gia sư và học sinh tiểu học.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- TanStack Query + Zustand
- React Hook Form + Zod
- Supabase (Auth, PostgreSQL, Storage, RLS) — mặc định chạy **mock mode** không cần Supabase

## Chạy nhanh (mock)

```bash
npm install
npm run dev
```

- **Học sinh:** mở [http://localhost:3000](http://localhost:3000) → nhập tên → làm quiz (tên lưu local).
- **Giáo viên:** [http://localhost:3000/login](http://localhost:3000/login)

| Vai trò | Username | Password |
|---------|----------|----------|
| Admin   | `admin`  | `admin123` |

## Kết nối Supabase

1. Tạo project Supabase và điền `.env.local`:

```env
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

2. Chạy SQL (Supabase Dashboard → SQL Editor), theo thứ tự:
   - `supabase/migrations/20260324000001_init_schema.sql`
   - `supabase/migrations/20260324000002_rls_and_rpc.sql`
   - `supabase/migrations/20260324000003_pass_and_retry.sql`
   - `supabase/migrations/20260324000004_quiz_play_options.sql`
   - `supabase/migrations/20260324000005_guest_attempts.sql`
   - `supabase/migrations/20260324000006_admin_delete_cascade.sql`
   - `supabase/migrations/20260324000007_reuse_in_progress_attempt.sql`
   - `supabase/seed.sql` (môn / quiz / câu hỏi mẫu)

3. Seed dữ liệu:

```bash
npm run seed:all
```

- `seed:auth` → admin `admin/admin123`
- `seed:content` → môn / quiz / câu hỏi mẫu
- `check:db` → đếm số dòng các bảng

4. Auth settings (Dashboard → Authentication → Providers → Email):
   - Tắt **Confirm email**

5. Restart app:

```bash
npm run dev
```

## Mô hình người dùng

- Chỉ **1 tài khoản admin** đăng nhập để soạn đề / xem bài làm.
- **Học sinh không có tài khoản** — nhập tên trên trang chủ (localStorage: `guest_id` + tên). Mỗi bài làm lưu `guest_name` + `guest_id` trên attempt.

## Cấu trúc chính

```
app/                 # routes (auth, admin, student)
features/            # UI theo feature
lib/repositories/    # data access (mock + Supabase)
lib/auth/            # đăng nhập admin
supabase/migrations/ # schema + RLS + RPC
stores/              # Zustand quiz + guest session
```

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — chạy build
- `npm run lint` — ESLint

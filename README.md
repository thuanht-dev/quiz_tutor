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

Mở [http://localhost:3000/login](http://localhost:3000/login)

| Vai trò | Username | Password |
|---------|----------|----------|
| Admin   | `admin`  | `admin123` |
| Học sinh | `minh`  | `minh123` |
| Học sinh | `lan`   | `lan123` |
| Học sinh | `tuan`  | `tuan123` |

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
   - `supabase/seed.sql` (môn / quiz / câu hỏi mẫu)

3. Tạo user Auth + profiles:

```bash
npm run seed:auth
```

Tạo: `admin/admin123`, `minh/minh123`, `lan/lan123`, `tuan/tuan123`  
(Email nội bộ dạng `{username}@students.local`)

4. Auth settings (Dashboard → Authentication → Providers → Email):
   - Tắt **Confirm email** (hoặc confirm sẵn qua Admin API — script đã `email_confirm: true`)

5. `npm run dev` → `/login`

## Cấu trúc chính

```
app/                 # routes (auth, admin, student)
features/            # UI theo feature
lib/repositories/    # data access (mock + Supabase)
lib/auth/            # đăng nhập / session
supabase/migrations/ # schema + RLS + RPC
stores/              # Zustand quiz session
```

## Import câu hỏi

CSV/Excel cột: `Question, A, B, C, D, Correct Answer, Explanation, Image URL`

Xem mẫu: `public/samples/questions-import.csv`

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — chạy build
- `npm run lint` — ESLint

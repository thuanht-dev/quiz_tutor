-- App settings (key/value) — dùng cho cấu hình thông báo email.
-- Server đọc bằng service role; admin UI đọc/ghi qua RLS.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "Admin full app_settings" on public.app_settings;
create policy "Admin full app_settings"
  on public.app_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Quiz Web for Tutor — initial schema
-- Single-tutor model

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'student');
create type public.quiz_status as enum ('draft', 'published', 'archived');
create type public.attempt_status as enum ('in_progress', 'submitted', 'expired');

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  role public.user_role not null default 'student',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,32}$')
);

create index profiles_role_idx on public.profiles (role);
create index profiles_is_active_idx on public.profiles (is_active);

-- ---------------------------------------------------------------------------
-- Subjects
-- ---------------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#0EA5E9',
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Quizzes
-- ---------------------------------------------------------------------------
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  title text not null,
  description text,
  time_limit_seconds int,
  status public.quiz_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_limit_positive check (
    time_limit_seconds is null or time_limit_seconds > 0
  )
);

create index quizzes_subject_id_idx on public.quizzes (subject_id);
create index quizzes_status_subject_idx on public.quizzes (status, subject_id);

-- ---------------------------------------------------------------------------
-- Questions (question bank)
-- ---------------------------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  content text not null,
  image_url text,
  explanation text,
  points int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint points_positive check (points > 0)
);

create index questions_subject_id_idx on public.questions (subject_id);
create index questions_content_trgm_idx on public.questions using gin (to_tsvector('simple', content));

-- ---------------------------------------------------------------------------
-- Options (exactly 4 per question in app; DB allows 2+)
-- ---------------------------------------------------------------------------
create table public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  label text not null,
  content text not null,
  is_correct boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint label_ab_cd check (label in ('A', 'B', 'C', 'D'))
);

create index options_question_id_idx on public.options (question_id);

-- One correct option per question
create unique index options_one_correct_per_question
  on public.options (question_id)
  where is_correct = true;

create unique index options_unique_label_per_question
  on public.options (question_id, label);

-- ---------------------------------------------------------------------------
-- Quiz ↔ Questions (M:N)
-- ---------------------------------------------------------------------------
create table public.quiz_questions (
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  sort_order int not null default 0,
  primary key (quiz_id, question_id)
);

create index quiz_questions_question_id_idx on public.quiz_questions (question_id);

-- ---------------------------------------------------------------------------
-- Attempts
-- ---------------------------------------------------------------------------
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete restrict,
  student_id uuid not null references public.profiles (id) on delete restrict,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score int not null default 0,
  max_score int not null default 0,
  correct_count int not null default 0,
  total_questions int not null default 0,
  duration_seconds int,
  status public.attempt_status not null default 'in_progress',
  created_at timestamptz not null default now()
);

create index attempts_student_quiz_idx on public.attempts (student_id, quiz_id);
create index attempts_quiz_id_idx on public.attempts (quiz_id);
create index attempts_submitted_at_idx on public.attempts (submitted_at desc nulls last);

-- ---------------------------------------------------------------------------
-- Attempt answers (snapshots)
-- ---------------------------------------------------------------------------
create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  selected_option_id uuid references public.options (id) on delete set null,
  selected_option_label text,
  selected_option_content text,
  is_correct boolean not null default false,
  points_awarded int not null default 0,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index attempt_answers_attempt_id_idx on public.attempt_answers (attempt_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger subjects_set_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

create trigger quizzes_set_updated_at
  before update on public.quizzes
  for each row execute function public.set_updated_at();

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth helper: create profile on signup (optional; admin usually creates users)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Role helpers for RLS
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create or replace function public.is_active_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'student' and is_active = true
  );
$$;

-- Lookup email by username (for login) — callable by anon via RPC with care
create or replace function public.get_login_email(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = lower(p_username)
    and p.is_active = true
  limit 1;
$$;

grant execute on function public.get_login_email(text) to anon, authenticated;

-- Quiz play behavior options
alter table public.quizzes
  add column if not exists auto_advance_on_answer boolean not null default false;

alter table public.quizzes
  add column if not exists show_explanation_on_answer boolean not null default false;

-- Allow admin to delete quizzes/questions that have attempts.
-- Root cause: attempts/attempt_answers only had SELECT for admin, so
-- client deletes were blocked by RLS and quiz delete hit FK 23503.

-- ---------------------------------------------------------------------------
-- Admin write policies
-- ---------------------------------------------------------------------------
drop policy if exists "Admin full attempts" on public.attempts;
create policy "Admin full attempts"
  on public.attempts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin full attempt_answers" on public.attempt_answers;
create policy "Admin full attempt_answers"
  on public.attempt_answers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Keep read policies; overlapping permissive policies are fine in Postgres RLS.

-- ---------------------------------------------------------------------------
-- Cascade FKs so deleting quiz/question cleans related rows at DB level
-- ---------------------------------------------------------------------------
alter table public.attempts
  drop constraint if exists attempts_quiz_id_fkey;

alter table public.attempts
  add constraint attempts_quiz_id_fkey
  foreign key (quiz_id) references public.quizzes (id) on delete cascade;

alter table public.attempt_answers
  drop constraint if exists attempt_answers_question_id_fkey;

alter table public.attempt_answers
  add constraint attempt_answers_question_id_fkey
  foreign key (question_id) references public.questions (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Security-definer RPCs (bypass any remaining RLS edge cases)
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_quiz(p_quiz_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete quizzes';
  end if;

  -- Explicit cleanup (CASCADE also handles this after FK change)
  delete from public.attempts where quiz_id = p_quiz_id;
  delete from public.quizzes where id = p_quiz_id;
end;
$$;

create or replace function public.admin_delete_question(p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete questions';
  end if;

  delete from public.attempt_answers where question_id = p_question_id;
  delete from public.questions where id = p_question_id;
end;
$$;

grant execute on function public.admin_delete_quiz(uuid) to authenticated;
grant execute on function public.admin_delete_question(uuid) to authenticated;

-- Pass threshold + retry-wrong support

alter table public.quizzes
  add column if not exists pass_percent int not null default 85
    constraint quizzes_pass_percent_range check (pass_percent >= 1 and pass_percent <= 100);

alter table public.attempts
  add column if not exists passed boolean,
  add column if not exists parent_attempt_id uuid references public.attempts (id) on delete set null,
  add column if not exists is_retry_wrong boolean not null default false;

create index if not exists attempts_parent_attempt_id_idx
  on public.attempts (parent_attempt_id);

-- Drop old single-arg overload so one-arg calls use the new defaulted signature
drop function if exists public.start_attempt(uuid);

-- ---------------------------------------------------------------------------
-- start_attempt: optional parent for retry-wrong subset
-- ---------------------------------------------------------------------------
create or replace function public.start_attempt(
  p_quiz_id uuid,
  p_parent_attempt_id uuid default null
)
returns public.attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.quizzes;
  v_parent public.attempts;
  v_attempt public.attempts;
  v_total int;
  v_max int;
  v_question_ids uuid[];
begin
  if not public.is_active_student() then
    raise exception 'Only active students can start attempts';
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if v_quiz.id is null then
    raise exception 'Quiz not found';
  end if;
  if v_quiz.status <> 'published' then
    raise exception 'Quiz is not published';
  end if;

  if p_parent_attempt_id is not null then
    select * into v_parent
    from public.attempts
    where id = p_parent_attempt_id
      and student_id = auth.uid()
      and quiz_id = p_quiz_id
      and status in ('submitted', 'expired');

    if v_parent.id is null then
      raise exception 'Parent attempt not found';
    end if;

    select coalesce(array_agg(aa.question_id), '{}'::uuid[])
      into v_question_ids
    from public.attempt_answers aa
    where aa.attempt_id = p_parent_attempt_id
      and aa.is_correct = false;

    if coalesce(array_length(v_question_ids, 1), 0) = 0 then
      raise exception 'No wrong answers to retry';
    end if;

    select count(*), coalesce(sum(q.points), 0)
      into v_total, v_max
    from public.questions q
    where q.id = any (v_question_ids);

    insert into public.attempts (
      quiz_id, student_id, total_questions, max_score, status,
      parent_attempt_id, is_retry_wrong
    ) values (
      p_quiz_id, auth.uid(), v_total, v_max, 'in_progress',
      p_parent_attempt_id, true
    )
    returning * into v_attempt;

    return v_attempt;
  end if;

  select count(*), coalesce(sum(q.points), 0)
    into v_total, v_max
  from public.quiz_questions qq
  join public.questions q on q.id = qq.question_id
  where qq.quiz_id = p_quiz_id;

  if v_total = 0 then
    raise exception 'Quiz has no questions';
  end if;

  insert into public.attempts (
    quiz_id, student_id, total_questions, max_score, status,
    parent_attempt_id, is_retry_wrong
  ) values (
    p_quiz_id, auth.uid(), v_total, v_max, 'in_progress',
    null, false
  )
  returning * into v_attempt;

  return v_attempt;
end;
$$;

grant execute on function public.start_attempt(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_attempt: set passed from quiz.pass_percent
-- ---------------------------------------------------------------------------
create or replace function public.submit_attempt(
  p_attempt_id uuid,
  p_answers jsonb,
  p_expired boolean default false
)
returns public.attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_quiz public.quizzes;
  v_answer jsonb;
  v_question_id uuid;
  v_option_id uuid;
  v_option public.options;
  v_question public.questions;
  v_score int := 0;
  v_correct int := 0;
  v_points int;
  v_is_correct boolean;
  v_percent numeric;
  v_passed boolean;
  v_allowed_question_ids uuid[];
begin
  select * into v_attempt
  from public.attempts
  where id = p_attempt_id
  for update;

  if v_attempt.id is null then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.student_id <> auth.uid() and not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception 'Attempt already submitted';
  end if;

  select * into v_quiz from public.quizzes where id = v_attempt.quiz_id;

  if v_attempt.is_retry_wrong and v_attempt.parent_attempt_id is not null then
    select coalesce(array_agg(aa.question_id), '{}'::uuid[])
      into v_allowed_question_ids
    from public.attempt_answers aa
    where aa.attempt_id = v_attempt.parent_attempt_id
      and aa.is_correct = false;
  else
    select coalesce(array_agg(qq.question_id), '{}'::uuid[])
      into v_allowed_question_ids
    from public.quiz_questions qq
    where qq.quiz_id = v_attempt.quiz_id;
  end if;

  delete from public.attempt_answers where attempt_id = p_attempt_id;

  for v_answer in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    v_question_id := (v_answer->>'question_id')::uuid;
    v_option_id := nullif(v_answer->>'selected_option_id', '')::uuid;

    if not (v_question_id = any (v_allowed_question_ids)) then
      continue;
    end if;

    select * into v_question from public.questions where id = v_question_id;
    v_is_correct := false;
    v_points := 0;

    if v_option_id is not null then
      select * into v_option
      from public.options
      where id = v_option_id and question_id = v_question_id;

      if v_option.id is not null then
        v_is_correct := v_option.is_correct;
        if v_is_correct then
          v_points := v_question.points;
          v_score := v_score + v_points;
          v_correct := v_correct + 1;
        end if;

        insert into public.attempt_answers (
          attempt_id, question_id, selected_option_id,
          selected_option_label, selected_option_content,
          is_correct, points_awarded
        ) values (
          p_attempt_id, v_question_id, v_option.id,
          v_option.label, v_option.content,
          v_is_correct, v_points
        );
      end if;
    else
      insert into public.attempt_answers (
        attempt_id, question_id, selected_option_id,
        selected_option_label, selected_option_content,
        is_correct, points_awarded
      ) values (
        p_attempt_id, v_question_id, null,
        null, null,
        false, 0
      );
    end if;
  end loop;

  if v_attempt.max_score > 0 then
    v_percent := (v_score::numeric * 100) / v_attempt.max_score;
  else
    v_percent := 0;
  end if;

  v_passed := v_percent >= coalesce(v_quiz.pass_percent, 85);

  update public.attempts
  set
    score = v_score,
    correct_count = v_correct,
    submitted_at = now(),
    duration_seconds = greatest(0, extract(epoch from (now() - started_at))::int),
    status = case when p_expired then 'expired'::public.attempt_status else 'submitted'::public.attempt_status end,
    passed = v_passed
  where id = p_attempt_id
  returning * into v_attempt;

  return v_attempt;
end;
$$;

grant execute on function public.submit_attempt(uuid, jsonb, boolean) to authenticated;

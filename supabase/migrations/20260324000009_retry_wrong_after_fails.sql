-- Unlock "làm lại câu sai" only after N failed full attempts (configurable per quiz).
-- 0 = tắt tính năng; mặc định 3.

alter table public.quizzes
  add column if not exists retry_wrong_after_fails integer not null default 3
    check (retry_wrong_after_fails >= 0);

comment on column public.quizzes.retry_wrong_after_fails is
  'Số lần làm bài đầy đủ không đạt trước khi mở "làm lại câu sai". 0 = tắt.';

-- Gate retry-wrong in start_attempt
create or replace function public.start_attempt(
  p_quiz_id uuid,
  p_guest_name text,
  p_guest_id uuid,
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
  v_name text;
  v_fail_count int;
  v_required int;
begin
  v_name := trim(coalesce(p_guest_name, ''));
  if v_name = '' or p_guest_id is null then
    raise exception 'Guest name and guest_id are required';
  end if;
  if char_length(v_name) > 64 then
    raise exception 'Guest name too long';
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if v_quiz.id is null then
    raise exception 'Quiz not found';
  end if;
  if v_quiz.status <> 'published' then
    raise exception 'Quiz is not published';
  end if;

  -- Retry-wrong flow
  if p_parent_attempt_id is not null then
    select * into v_parent
    from public.attempts
    where id = p_parent_attempt_id
      and guest_id = p_guest_id
      and quiz_id = p_quiz_id
      and status in ('submitted', 'expired');

    if v_parent.id is null then
      raise exception 'Parent attempt not found';
    end if;

    -- Reuse open retry for same parent
    select * into v_attempt
    from public.attempts
    where quiz_id = p_quiz_id
      and guest_id = p_guest_id
      and status = 'in_progress'
      and is_retry_wrong = true
      and parent_attempt_id = p_parent_attempt_id
    order by started_at desc
    limit 1;

    if v_attempt.id is not null then
      delete from public.attempts
      where quiz_id = p_quiz_id
        and guest_id = p_guest_id
        and status = 'in_progress'
        and is_retry_wrong = true
        and parent_attempt_id = p_parent_attempt_id
        and id <> v_attempt.id;

      update public.attempts
      set guest_name = v_name
      where id = v_attempt.id
      returning * into v_attempt;

      return v_attempt;
    end if;

    -- Unlock after N failed full attempts (not counting retry-wrong)
    v_required := coalesce(v_quiz.retry_wrong_after_fails, 3);
    if v_required = 0 then
      raise exception 'Retry wrong is disabled for this quiz';
    end if;

    select count(*)::int into v_fail_count
    from public.attempts
    where quiz_id = p_quiz_id
      and guest_id = p_guest_id
      and coalesce(is_retry_wrong, false) = false
      and status in ('submitted', 'expired')
      and passed = false;

    if v_fail_count < v_required then
      raise exception
        'Need % failed attempts before retrying wrong questions (have %)',
        v_required, v_fail_count;
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
      quiz_id, student_id, guest_name, guest_id,
      total_questions, max_score, status,
      parent_attempt_id, is_retry_wrong
    ) values (
      p_quiz_id, null, v_name, p_guest_id,
      v_total, v_max, 'in_progress',
      p_parent_attempt_id, true
    )
    returning * into v_attempt;

    return v_attempt;
  end if;

  -- Normal play: reuse open attempt
  select * into v_attempt
  from public.attempts
  where quiz_id = p_quiz_id
    and guest_id = p_guest_id
    and status = 'in_progress'
    and coalesce(is_retry_wrong, false) = false
  order by started_at desc
  limit 1;

  if v_attempt.id is not null then
    delete from public.attempts
    where quiz_id = p_quiz_id
      and guest_id = p_guest_id
      and status = 'in_progress'
      and coalesce(is_retry_wrong, false) = false
      and id <> v_attempt.id;

    update public.attempts
    set guest_name = v_name
    where id = v_attempt.id
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
    quiz_id, student_id, guest_name, guest_id,
    total_questions, max_score, status,
    parent_attempt_id, is_retry_wrong
  ) values (
    p_quiz_id, null, v_name, p_guest_id,
    v_total, v_max, 'in_progress',
    null, false
  )
  returning * into v_attempt;

  return v_attempt;
end;
$$;

grant execute on function public.start_attempt(uuid, text, uuid, uuid) to anon, authenticated;

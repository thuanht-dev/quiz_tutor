  -- Guest student attempts (no student accounts)
  -- Run on Supabase after deploy.

  -- ---------------------------------------------------------------------------
  -- Schema
  -- ---------------------------------------------------------------------------
  alter table public.attempts
    alter column student_id drop not null;

  alter table public.attempts
    add column if not exists guest_name text,
    add column if not exists guest_id uuid;

  alter table public.attempts
    drop constraint if exists attempts_identity_check;

  alter table public.attempts
    add constraint attempts_identity_check check (
      student_id is not null
      or (
        guest_id is not null
        and guest_name is not null
        and length(trim(guest_name)) > 0
      )
    );

  create index if not exists attempts_guest_id_idx
    on public.attempts (guest_id)
    where guest_id is not null;

  create index if not exists attempts_guest_name_idx
    on public.attempts (guest_name)
    where guest_name is not null;

  -- ---------------------------------------------------------------------------
  -- Anon read published content
  -- ---------------------------------------------------------------------------
  drop policy if exists "Anon read subjects" on public.subjects;
  create policy "Anon read subjects"
    on public.subjects for select
    to anon
    using (true);

  drop policy if exists "Anon read published quizzes" on public.quizzes;
  create policy "Anon read published quizzes"
    on public.quizzes for select
    to anon
    using (status = 'published');

  drop policy if exists "Anon read quiz_questions for published" on public.quiz_questions;
  create policy "Anon read quiz_questions for published"
    on public.quiz_questions for select
    to anon
    using (
      exists (
        select 1 from public.quizzes q
        where q.id = quiz_id and q.status = 'published'
      )
    );

  drop policy if exists "Anon read published quiz questions" on public.questions;
  create policy "Anon read published quiz questions"
    on public.questions for select
    to anon
    using (
      exists (
        select 1
        from public.quiz_questions qq
        join public.quizzes q on q.id = qq.quiz_id
        where qq.question_id = questions.id
          and q.status = 'published'
      )
    );

  drop policy if exists "Anon read options of published quiz questions" on public.options;
  create policy "Anon read options of published quiz questions"
    on public.options for select
    to anon
    using (
      exists (
        select 1
        from public.quiz_questions qq
        join public.quizzes q on q.id = qq.quiz_id
        where qq.question_id = options.question_id
          and q.status = 'published'
      )
    );

  -- Guests cannot SELECT attempts directly (UUIDs + RPCs); admin keeps full access.
  -- Optional: allow reading own finished attempt answers via security definer helpers below.

-- Drop old start_attempt / submit_attempt overloads
drop function if exists public.start_attempt(uuid);
drop function if exists public.start_attempt(uuid, uuid);
drop function if exists public.submit_attempt(uuid, jsonb, boolean);

  -- ---------------------------------------------------------------------------
  -- start_attempt for guests
  -- ---------------------------------------------------------------------------
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

  -- ---------------------------------------------------------------------------
  -- submit_attempt: guest or admin
  -- ---------------------------------------------------------------------------
  create or replace function public.submit_attempt(
    p_attempt_id uuid,
    p_answers jsonb,
    p_expired boolean default false,
    p_guest_id uuid default null
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

    if public.is_admin() then
      null;
    elsif v_attempt.guest_id is not null then
      if p_guest_id is null or v_attempt.guest_id <> p_guest_id then
        raise exception 'Not allowed';
      end if;
    elsif v_attempt.student_id is not null and v_attempt.student_id = auth.uid() then
      null;
    else
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

grant execute on function public.submit_attempt(uuid, jsonb, boolean, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Guest helpers: home data + fetch attempt
-- ---------------------------------------------------------------------------
  create or replace function public.get_guest_attempt(
    p_attempt_id uuid,
    p_guest_id uuid
  )
  returns public.attempts
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_attempt public.attempts;
  begin
    if p_guest_id is null then
      raise exception 'guest_id required';
    end if;

    select * into v_attempt
    from public.attempts
    where id = p_attempt_id
      and guest_id = p_guest_id;

    if v_attempt.id is null then
      raise exception 'Attempt not found';
    end if;

    return v_attempt;
  end;
  $$;

  grant execute on function public.get_guest_attempt(uuid, uuid) to anon, authenticated;

  create or replace function public.list_guest_attempts(
    p_guest_id uuid
  )
  returns setof public.attempts
  language sql
  security definer
  set search_path = public
  as $$
    select *
    from public.attempts
    where guest_id = p_guest_id
      and status in ('submitted', 'expired')
    order by submitted_at desc nulls last;
  $$;

  grant execute on function public.list_guest_attempts(uuid) to anon, authenticated;

  create or replace function public.get_guest_attempt_answers(
    p_attempt_id uuid,
    p_guest_id uuid
  )
  returns setof public.attempt_answers
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    if not exists (
      select 1 from public.attempts a
      where a.id = p_attempt_id and a.guest_id = p_guest_id
    ) then
      raise exception 'Attempt not found';
    end if;

    return query
    select aa.*
    from public.attempt_answers aa
    where aa.attempt_id = p_attempt_id;
  end;
  $$;

  grant execute on function public.get_guest_attempt_answers(uuid, uuid) to anon, authenticated;

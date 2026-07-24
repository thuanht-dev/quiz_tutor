-- RLS policies + Storage + submit_attempt RPC

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "Admin can insert profiles"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

create policy "Admin can update profiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can update own display fields"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
  );

create policy "Admin can delete profiles"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Subjects
-- ---------------------------------------------------------------------------
create policy "Authenticated can read subjects"
  on public.subjects for select
  to authenticated
  using (public.is_admin() or public.is_active_student());

create policy "Admin manage subjects"
  on public.subjects for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Quizzes
-- ---------------------------------------------------------------------------
create policy "Admin full quizzes"
  on public.quizzes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Students read published quizzes"
  on public.quizzes for select
  to authenticated
  using (
    public.is_active_student()
    and status = 'published'
  );

-- ---------------------------------------------------------------------------
-- Questions
-- ---------------------------------------------------------------------------
create policy "Admin full questions"
  on public.questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Students can read questions that belong to a published quiz
create policy "Students read published quiz questions"
  on public.questions for select
  to authenticated
  using (
    public.is_active_student()
    and exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.question_id = questions.id
        and q.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- Options — students can read content but NOT rely on is_correct client-side
-- (is_correct visible; scoring still done server-side via RPC for integrity)
-- For stricter security we expose a view without is_correct for play mode.
-- ---------------------------------------------------------------------------
create policy "Admin full options"
  on public.options for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Students read options of published quiz questions"
  on public.options for select
  to authenticated
  using (
    public.is_active_student()
    and exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.question_id = options.question_id
        and q.status = 'published'
    )
  );

-- Play-safe view (hides is_correct)
create or replace view public.quiz_options_play as
select
  o.id,
  o.question_id,
  o.label,
  o.content,
  o.sort_order
from public.options o
where exists (
  select 1
  from public.quiz_questions qq
  join public.quizzes q on q.id = qq.quiz_id
  where qq.question_id = o.question_id
    and q.status = 'published'
);

grant select on public.quiz_options_play to authenticated;

-- ---------------------------------------------------------------------------
-- Quiz questions
-- ---------------------------------------------------------------------------
create policy "Admin full quiz_questions"
  on public.quiz_questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Students read quiz_questions for published"
  on public.quiz_questions for select
  to authenticated
  using (
    public.is_active_student()
    and exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id
        and q.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- Attempts
-- ---------------------------------------------------------------------------
create policy "Admin read all attempts"
  on public.attempts for select
  to authenticated
  using (public.is_admin());

create policy "Students read own attempts"
  on public.attempts for select
  to authenticated
  using (student_id = auth.uid());

create policy "Students insert own attempts"
  on public.attempts for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and public.is_active_student()
  );

create policy "Students update own in_progress attempts"
  on public.attempts for update
  to authenticated
  using (
    student_id = auth.uid()
    and status = 'in_progress'
  )
  with check (student_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Attempt answers
-- ---------------------------------------------------------------------------
create policy "Admin read all attempt_answers"
  on public.attempt_answers for select
  to authenticated
  using (public.is_admin());

create policy "Students read own attempt_answers"
  on public.attempt_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.attempts a
      where a.id = attempt_answers.attempt_id
        and a.student_id = auth.uid()
    )
  );

-- Inserts/updates for answers go through submit_attempt RPC (security definer)
-- Allow students to write only while attempt in progress (optional interim saves)
create policy "Students insert own attempt_answers"
  on public.attempt_answers for insert
  to authenticated
  with check (
    exists (
      select 1 from public.attempts a
      where a.id = attempt_answers.attempt_id
        and a.student_id = auth.uid()
        and a.status = 'in_progress'
    )
  );

create policy "Students update own attempt_answers"
  on public.attempt_answers for update
  to authenticated
  using (
    exists (
      select 1 from public.attempts a
      where a.id = attempt_answers.attempt_id
        and a.student_id = auth.uid()
        and a.status = 'in_progress'
    )
  )
  with check (
    exists (
      select 1 from public.attempts a
      where a.id = attempt_answers.attempt_id
        and a.student_id = auth.uid()
        and a.status = 'in_progress'
    )
  );

-- ---------------------------------------------------------------------------
-- Start attempt
-- ---------------------------------------------------------------------------
create or replace function public.start_attempt(p_quiz_id uuid)
returns public.attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.quizzes;
  v_attempt public.attempts;
  v_total int;
  v_max int;
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

  select count(*), coalesce(sum(q.points), 0)
    into v_total, v_max
  from public.quiz_questions qq
  join public.questions q on q.id = qq.question_id
  where qq.quiz_id = p_quiz_id;

  if v_total = 0 then
    raise exception 'Quiz has no questions';
  end if;

  insert into public.attempts (
    quiz_id, student_id, total_questions, max_score, status
  ) values (
    p_quiz_id, auth.uid(), v_total, v_max, 'in_progress'
  )
  returning * into v_attempt;

  return v_attempt;
end;
$$;

grant execute on function public.start_attempt(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Submit attempt + grade
-- answers: jsonb array of { question_id, selected_option_id }
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
  v_answer jsonb;
  v_question_id uuid;
  v_option_id uuid;
  v_option public.options;
  v_question public.questions;
  v_score int := 0;
  v_correct int := 0;
  v_points int;
  v_is_correct boolean;
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

  -- Clear prior draft answers
  delete from public.attempt_answers where attempt_id = p_attempt_id;

  for v_answer in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    v_question_id := (v_answer->>'question_id')::uuid;
    v_option_id := nullif(v_answer->>'selected_option_id', '')::uuid;

    -- Ensure question belongs to this quiz
    if not exists (
      select 1 from public.quiz_questions
      where quiz_id = v_attempt.quiz_id and question_id = v_question_id
    ) then
      continue;
    end if;

    select * into v_question from public.questions where id = v_question_id;
    v_is_correct := false;
    v_points := 0;

    if v_option_id is not null then
      select * into v_option from public.options where id = v_option_id and question_id = v_question_id;
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

  update public.attempts
  set
    score = v_score,
    correct_count = v_correct,
    submitted_at = now(),
    duration_seconds = greatest(0, extract(epoch from (now() - started_at))::int),
    status = case when p_expired then 'expired'::public.attempt_status else 'submitted'::public.attempt_status end
  where id = p_attempt_id
  returning * into v_attempt;

  return v_attempt;
end;
$$;

grant execute on function public.submit_attempt(uuid, jsonb, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for question images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-images',
  'question-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "Public read question images"
  on storage.objects for select
  to public
  using (bucket_id = 'question-images');

create policy "Admin upload question images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'question-images' and public.is_admin());

create policy "Admin update question images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'question-images' and public.is_admin())
  with check (bucket_id = 'question-images' and public.is_admin());

create policy "Admin delete question images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'question-images' and public.is_admin());

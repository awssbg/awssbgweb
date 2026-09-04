-- Fix the enum/text mismatch in submit_exam without changing the existing enum.
-- This is a forward-only migration for databases where migrations 001-003 are applied.
begin;

create or replace function public.submit_exam(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.exam_attempts;
  v_total integer;
  v_correct integer;
  v_unanswered integer;
begin
  select *
    into v_attempt
    from public.exam_attempts
   where id = p_attempt_id
     and user_id = auth.uid()
   for update;

  if not found then
    raise exception 'Attempt not found' using errcode = '42501';
  end if;

  -- A completed submission is idempotent. An expired attempt is also final.
  if v_attempt.status in (
    'submitted'::public.attempt_status,
    'expired'::public.attempt_status
  ) then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'status', v_attempt.status,
      'score_percentage', v_attempt.score_percentage,
      'correct_count', v_attempt.correct_count,
      'incorrect_count', v_attempt.incorrect_count,
      'unanswered_count', v_attempt.unanswered_count
    );
  end if;

  -- Only a live attempt may transition to a final state. The client never
  -- supplies a status, score, or correctness value.
  if v_attempt.status <> 'in_progress'::public.attempt_status then
    raise exception 'Attempt cannot be submitted from its current state' using errcode = 'P0001';
  end if;

  -- Explicit enum casts are required here. Without them, CASE resolves its
  -- string branches as text and PostgreSQL rejects assignment to status.
  update public.exam_attempts
     set status = case
                    when expires_at <= now() then 'expired'::public.attempt_status
                    else 'submitted'::public.attempt_status
                  end,
         submitted_at = now()
   where id = p_attempt_id;

  update public.exam_answers ea
     set is_correct = (
       select array(select unnest(ea.selected_option_ids) order by 1) =
              array(select unnest(ka.correct_option_ids) order by 1)
         from public.exam_attempt_questions aq
         join public.question_answers ka on ka.question_id = aq.question_id
        where aq.id = ea.attempt_question_id
     )
   where ea.attempt_id = p_attempt_id;

  select count(*),
         count(*) filter (where ea.is_correct),
         count(*) filter (where ea.id is null or cardinality(ea.selected_option_ids) = 0)
    into v_total, v_correct, v_unanswered
    from public.exam_attempt_questions aq
    left join public.exam_answers ea on ea.attempt_question_id = aq.id
   where aq.attempt_id = p_attempt_id;

  update public.exam_attempts
     set correct_count = v_correct,
         incorrect_count = v_total - v_correct - v_unanswered,
         unanswered_count = v_unanswered,
         score_percentage = round(100.0 * v_correct / nullif(v_total, 0), 2)
   where id = p_attempt_id
   returning * into v_attempt;

  insert into public.practice_domain_attempts(
    attempt_id, domain_id, total_count, correct_count, incorrect_count,
    unanswered_count, percentage
  )
  select p_attempt_id,
         q.domain_id,
         count(*),
         count(*) filter (where ea.is_correct),
         count(*) filter (where ea.id is not null and not ea.is_correct),
         count(*) filter (where ea.id is null or cardinality(ea.selected_option_ids) = 0),
         round(100.0 * count(*) filter (where ea.is_correct) / nullif(count(*), 0), 2)
    from public.exam_attempt_questions aq
    join public.questions q on q.id = aq.question_id
    left join public.exam_answers ea on ea.attempt_question_id = aq.id
   where aq.attempt_id = p_attempt_id
   group by q.domain_id;

  insert into public.user_question_history(user_id, question_id, certification_id, times_seen)
  select auth.uid(), aq.question_id, v_attempt.certification_id, 0
    from public.exam_attempt_questions aq
   where aq.attempt_id = p_attempt_id
  on conflict(user_id, question_id) do nothing;

  update public.user_question_history h
     set times_answered = times_answered + case when ea.id is null then 0 else 1 end,
         times_correct = times_correct + case when ea.is_correct then 1 else 0 end,
         times_incorrect = times_incorrect + case when ea.id is not null and not ea.is_correct then 1 else 0 end,
         last_answer_correct = ea.is_correct,
         last_seen_at = now()
    from public.exam_attempt_questions aq
    left join public.exam_answers ea on ea.attempt_question_id = aq.id
   where aq.attempt_id = p_attempt_id
     and h.user_id = auth.uid()
     and h.question_id = aq.question_id;

  insert into public.audit_events(user_id, event_type, entity_type, entity_id)
  values (auth.uid(), 'attempt_submitted', 'exam_attempt', p_attempt_id);

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'status', v_attempt.status,
    'score_percentage', v_attempt.score_percentage,
    'correct_count', v_attempt.correct_count,
    'incorrect_count', v_attempt.incorrect_count,
    'unanswered_count', v_attempt.unanswered_count
  );
end;
$$;

-- These casts are not required for the write, but keep every attempt-status
-- comparison in the RPC boundary explicitly typed.
create or replace function public.my_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return (
    select jsonb_build_object(
      'total_mocks', count(*),
      'best_score', max(score_percentage),
      'average_score', round(avg(score_percentage), 2),
      'questions_answered', coalesce(sum(actual_question_count - unanswered_count), 0),
      'certifications_practiced', count(distinct certification_id)
    )
      from public.exam_attempts
     where user_id = v_user_id
       and status in (
         'submitted'::public.attempt_status,
         'expired'::public.attempt_status
       )
  );
end;
$$;

grant execute on function public.submit_exam(uuid), public.my_dashboard() to authenticated;

commit;

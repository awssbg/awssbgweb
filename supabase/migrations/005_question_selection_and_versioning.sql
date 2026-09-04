-- Version-aware content metadata and repeat-resistant, server-owned exam selection.
-- Existing questions and attempts are preserved; legacy questions remain eligible until
-- editorially assigned to an exam version.
begin;

alter table public.questions
  add column if not exists exam_version_id uuid references public.certification_exam_versions(id) on delete restrict;

create index if not exists questions_exam_version_readiness_idx
  on public.questions(certification_id, exam_version_id, active, publication_status);

-- Existing domains have no historical weighting metadata. An even default is a
-- safe baseline; the catalog importer can subsequently upsert official weights.
with domain_counts as (
  select certification_id, count(*)::numeric as domain_count
    from public.certification_domains
   group by certification_id
)
update public.certification_domains d
   set weight = 1 / domain_counts.domain_count
  from domain_counts
 where d.certification_id = domain_counts.certification_id
   and d.weight is null;

create or replace function public.create_exam(
  p_certification_slug text,
  p_count integer,
  p_mode text default 'mock',
  p_idempotency_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cert uuid;
  v_attempt uuid;
  v_version uuid;
  v_seconds integer;
  v_actual integer;
  v_weight_snapshot jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_count not between 1 and 100 then
    raise exception 'Invalid question count' using errcode = '22023';
  end if;
  if p_mode not in ('mock', 'quick', 'domain') then
    raise exception 'Invalid practice mode' using errcode = '22023';
  end if;

  if p_idempotency_key is not null then
    select id into v_attempt
      from public.exam_attempts
     where user_id = v_user and idempotency_key = p_idempotency_key;
    if v_attempt is not null then return v_attempt; end if;
  end if;

  if exists (
    select 1 from public.exam_attempts
     where user_id = v_user
       and status = 'in_progress'::public.attempt_status
       and created_at > now() - interval '3 seconds'
  ) then
    raise exception 'Please wait before creating another attempt' using errcode = 'P0001';
  end if;

  select id into v_cert from public.certifications
   where slug = p_certification_slug and active;
  if v_cert is null then
    raise exception 'Certification not found' using errcode = 'P0002';
  end if;

  -- Current content is preferred. A beta version is used only when it is the
  -- only explicitly available version; unversioned legacy content stays valid.
  select id into v_version
    from public.certification_exam_versions
   where certification_id = v_cert
     and status in ('current', 'beta')
   order by case status when 'current' then 0 else 1 end,
            effective_from desc nulls last
   limit 1;

  select coalesce(jsonb_object_agg(name, weight), '{}'::jsonb)
    into v_weight_snapshot
    from public.certification_domains
   where certification_id = v_cert and active;

  select count(*) into v_actual
    from public.questions q
   where q.certification_id = v_cert
     and q.active
     and q.publication_status = 'published'
     and (v_version is null or q.exam_version_id is null or q.exam_version_id = v_version)
     and exists (select 1 from public.question_answers a where a.question_id = q.id)
     and (select count(*) from public.question_options o where o.question_id = q.id and o.is_active) >= 2;

  v_actual := least(v_actual, p_count);
  if v_actual = 0 then
    raise exception 'Question bank is not ready' using errcode = 'P0001';
  end if;
  v_seconds := case when p_count >= 40 then 3600 else greatest(600, p_count * 120) end;

  insert into public.exam_attempts(
    user_id, certification_id, exam_version_id, domain_weight_snapshot, mode,
    requested_question_count, actual_question_count, duration_seconds,
    expires_at, idempotency_key
  ) values (
    v_user, v_cert, v_version, v_weight_snapshot, p_mode, p_count, v_actual,
    v_seconds, now() + make_interval(secs => v_seconds), p_idempotency_key
  ) returning id into v_attempt;

  -- Choose domain quotas first, then fill any shortages from the best remaining
  -- pool. Ranking strongly favours never-seen questions, then questions outside
  -- the user's latest 40 displayed questions, then least-recently seen questions.
  with eligible as (
    select q.id, q.domain_id, d.name as domain_name, coalesce(d.weight, 0) as domain_weight,
           h.last_seen_at, h.times_seen,
           row_number() over (order by h.last_seen_at desc nulls last, q.id) as recency_rank
      from public.questions q
      join public.certification_domains d on d.id = q.domain_id and d.active
      left join public.user_question_history h on h.question_id = q.id and h.user_id = v_user
     where q.certification_id = v_cert
       and q.active
       and q.publication_status = 'published'
       and (v_version is null or q.exam_version_id is null or q.exam_version_id = v_version)
       and exists (select 1 from public.question_answers a where a.question_id = q.id)
       and (select count(*) from public.question_options o where o.question_id = q.id and o.is_active) >= 2
  ), ranked as (
    select *,
           row_number() over (
             partition by domain_id
             order by case when last_seen_at is null then 0 when recency_rank <= 40 then 2 else 1 end,
                      last_seen_at asc nulls first,
                      times_seen asc nulls first,
                      random()
           ) as domain_rank,
           greatest(1, floor(v_actual * domain_weight))::integer as domain_quota
      from eligible
  ), quota_candidates as (
    select * from ranked where domain_rank <= domain_quota
  ), quota_selected as (
    select * from quota_candidates
     order by case when last_seen_at is null then 0 when recency_rank <= 40 then 2 else 1 end,
              last_seen_at asc nulls first,
              random()
     limit v_actual
  ), fill_selected as (
    select * from ranked
     where id not in (select id from quota_selected)
     order by case when last_seen_at is null then 0 when recency_rank <= 40 then 2 else 1 end,
              last_seen_at asc nulls first,
              times_seen asc nulls first,
              random()
     limit greatest(0, v_actual - (select count(*) from quota_selected))
  ), selected as (
    select id from quota_selected
    union all
    select id from fill_selected
  )
  insert into public.exam_attempt_questions(attempt_id, question_id, question_order, question_snapshot)
  select v_attempt,
         s.id,
         row_number() over (order by random()),
         jsonb_build_object(
           'id', q.id,
           'external_id', q.external_id,
           'question_text', q.question_text,
           'question_type', q.question_type,
           'difficulty', q.difficulty,
           'domain', d.name,
           'options', (
             select jsonb_agg(jsonb_build_object('id', o.id, 'key', o.option_key, 'text', o.option_text) order by o.display_order)
               from public.question_options o
              where o.question_id = q.id and o.is_active
           )
         )
    from selected s
    join public.questions q on q.id = s.id
    join public.certification_domains d on d.id = q.domain_id;

  insert into public.user_question_history(user_id, question_id, certification_id)
  select v_user, question_id, v_cert
    from public.exam_attempt_questions
   where attempt_id = v_attempt
  on conflict(user_id, question_id) do update
    set last_seen_at = now(), times_seen = public.user_question_history.times_seen + 1;

  insert into public.audit_events(user_id, event_type, entity_type, entity_id)
  values (v_user, 'attempt_created', 'exam_attempt', v_attempt);
  return v_attempt;
end;
$$;

grant execute on function public.create_exam(text, integer, text, uuid) to authenticated;

commit;

-- Non-destructive evolution for mutable AWS exam metadata and contributor workflow.
begin;

create table if not exists public.certification_exam_versions (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.certifications(id) on delete restrict,
  exam_code text not null,
  version_name text not null,
  status text not null check (status in ('current','beta','retiring','retired')),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  official_question_count integer check (official_question_count is null or official_question_count > 0),
  exam_format text,
  effective_from date,
  retirement_date date,
  official_url text,
  exam_guide_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (certification_id, exam_code)
);

alter table public.questions add column if not exists publication_status text not null default 'published' check (publication_status in ('draft','review','published','retired'));
alter table public.questions add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.questions add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.exam_attempts add column if not exists exam_version_id uuid references public.certification_exam_versions(id) on delete restrict;
alter table public.exam_attempts add column if not exists domain_weight_snapshot jsonb not null default '{}'::jsonb;

create index if not exists questions_readiness_idx on public.questions(certification_id, active, publication_status);
create index if not exists exam_versions_current_idx on public.certification_exam_versions(certification_id, status);

-- Only active, published content can enter a new exam. Existing attempt snapshots remain unchanged.
create or replace function public.create_exam(p_certification_slug text,p_count integer,p_mode text default 'mock',p_idempotency_key uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_cert uuid; v_attempt uuid; v_seconds integer; v_actual integer; v_version uuid;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_count not between 1 and 100 then raise exception 'Invalid question count' using errcode='22023'; end if;
 if p_idempotency_key is not null then select id into v_attempt from public.exam_attempts where user_id=v_user and idempotency_key=p_idempotency_key; if v_attempt is not null then return v_attempt; end if; end if;
 if exists(select 1 from public.exam_attempts where user_id=v_user and status='in_progress' and created_at>now()-interval '3 seconds') then raise exception 'Please wait before creating another attempt' using errcode='P0001'; end if;
 select id into v_cert from public.certifications where slug=p_certification_slug and active; if v_cert is null then raise exception 'Certification not found' using errcode='P0002'; end if;
 select id into v_version from public.certification_exam_versions where certification_id=v_cert and status in ('current','beta','retiring') order by effective_from desc nulls last limit 1;
 select count(*) into v_actual from public.questions q where q.certification_id=v_cert and q.active and q.publication_status='published' and exists(select 1 from public.question_answers a where a.question_id=q.id) and (select count(*) from public.question_options o where o.question_id=q.id and o.is_active)>=2;
 v_actual:=least(v_actual,p_count); if v_actual=0 then raise exception 'Question bank is not ready' using errcode='P0001'; end if; v_seconds:=case when p_count>=40 then 3600 else greatest(600,p_count*120) end;
 insert into public.exam_attempts(user_id,certification_id,exam_version_id,mode,requested_question_count,actual_question_count,duration_seconds,expires_at,idempotency_key) values(v_user,v_cert,v_version,p_mode,p_count,v_actual,v_seconds,now()+make_interval(secs=>v_seconds),p_idempotency_key) returning id into v_attempt;
 with eligible as (select q.id,q.domain_id from public.questions q left join public.user_question_history h on h.question_id=q.id and h.user_id=v_user where q.certification_id=v_cert and q.active and q.publication_status='published' and exists(select 1 from public.question_answers a where a.question_id=q.id) order by coalesce(h.last_seen_at,'epoch'::timestamptz),coalesce(h.times_seen,0),random() limit v_actual)
 insert into public.exam_attempt_questions(attempt_id,question_id,question_order,question_snapshot)
 select v_attempt,s.id,row_number() over(order by random()),jsonb_build_object('id',q.id,'external_id',q.external_id,'question_text',q.question_text,'question_type',q.question_type,'difficulty',q.difficulty,'domain',d.name,'options',(select jsonb_agg(jsonb_build_object('id',o.id,'key',o.option_key,'text',o.option_text) order by o.display_order) from public.question_options o where o.question_id=q.id and o.is_active)) from eligible s join public.questions q on q.id=s.id join public.certification_domains d on d.id=q.domain_id;
 insert into public.user_question_history(user_id,question_id,certification_id) select v_user,question_id,v_cert from public.exam_attempt_questions where attempt_id=v_attempt on conflict(user_id,question_id) do update set last_seen_at=now(),times_seen=user_question_history.times_seen+1;
 insert into public.audit_events(user_id,event_type,entity_type,entity_id) values(v_user,'attempt_created','exam_attempt',v_attempt); return v_attempt;
end $$;

create or replace view public.certification_catalog with (security_invoker=false) as
select c.id,c.slug,c.code,c.name,c.short_name,c.level,c.description,c.official_url,c.exam_guide_url,c.official_question_count,c.official_duration_minutes,c.active,
  count(q.id) filter (where q.active and q.publication_status='published') as question_count,
  (count(q.id) filter (where q.active and q.publication_status='published') > 0) as minimum_practice_available,
  (count(q.id) filter (where q.active and q.publication_status='published') >= 40) as full_mock_available
from public.certifications c left join public.questions q on q.certification_id=c.id group by c.id;

grant select on public.certification_exam_versions, public.certification_catalog to anon, authenticated;
alter table public.certification_exam_versions enable row level security;
create policy exam_versions_read on public.certification_exam_versions for select using (true);
create policy staff_exam_versions_write on public.certification_exam_versions for all using(public.is_staff()) with check(public.is_staff());

commit;

-- AWS SBG Certification Practice: production database boundary.
-- Answer keys live only in question_answers; the browser never selects that table.
-- The initial schema is transactional: a failure rolls back the entire run.
begin;
create extension if not exists pgcrypto;

do $$ begin create type public.app_role as enum ('user','editor','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.attempt_status as enum ('in_progress','submitted','expired','abandoned'); exception when duplicate_object then null; end $$;
do $$ begin create type public.question_kind as enum ('single_answer','multiple_response'); exception when duplicate_object then null; end $$;
do $$ begin create type public.question_difficulty as enum ('easy','medium','hard'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, avatar_url text, bio text, timezone text,
  role public.app_role not null default 'user', onboarding_completed boolean not null default false,
  last_seen_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.certifications (
 id uuid primary key default gen_random_uuid(), slug text unique not null, code text, name text not null, short_name text,
 level text not null, description text, official_url text, exam_guide_url text,
 official_question_count integer check (official_question_count is null or official_question_count > 0),
 official_duration_minutes integer check (official_duration_minutes is null or official_duration_minutes > 0),
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.certification_domains (
 id uuid primary key default gen_random_uuid(), certification_id uuid not null references public.certifications(id) on delete restrict,
 name text not null, description text, display_order integer not null default 0, weight numeric check(weight is null or weight >= 0), active boolean not null default true,
 unique(certification_id,name)
);
create table if not exists public.questions (
 id uuid primary key default gen_random_uuid(), certification_id uuid not null references public.certifications(id) on delete restrict,
 domain_id uuid not null references public.certification_domains(id) on delete restrict, external_id text not null,
 question_text text not null check(length(trim(question_text)) > 0), question_type public.question_kind not null default 'single_answer',
 difficulty public.question_difficulty not null default 'medium', explanation text not null check(length(trim(explanation)) > 0),
 reference_links jsonb not null default '[]'::jsonb, version integer not null default 1 check(version > 0), active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(certification_id,external_id)
);
create table if not exists public.question_options (
 id uuid primary key default gen_random_uuid(), question_id uuid not null references public.questions(id) on delete restrict,
 option_key text not null check(option_key ~ '^[A-Z]$'), option_text text not null check(length(trim(option_text)) > 0), display_order integer not null,
 is_active boolean not null default true, unique(question_id,option_key), unique(question_id,display_order)
);
create table if not exists public.question_answers (
 question_id uuid primary key references public.questions(id) on delete restrict,
 correct_option_ids uuid[] not null check(cardinality(correct_option_ids) > 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.exam_attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete restrict,
 certification_id uuid not null references public.certifications(id) on delete restrict, status public.attempt_status not null default 'in_progress',
 mode text not null default 'mock', requested_question_count integer not null check(requested_question_count > 0), actual_question_count integer not null check(actual_question_count >= 0),
 started_at timestamptz not null default now(), expires_at timestamptz not null, submitted_at timestamptz,
 duration_seconds integer not null check(duration_seconds > 0), score_percentage numeric(5,2) check(score_percentage between 0 and 100),
 correct_count integer check(correct_count >= 0), incorrect_count integer check(incorrect_count >= 0), unanswered_count integer check(unanswered_count >= 0),
 idempotency_key uuid unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(expires_at > started_at)
);
create table if not exists public.exam_attempt_questions (
 id uuid primary key default gen_random_uuid(), attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
 question_id uuid not null references public.questions(id) on delete restrict, question_order integer not null check(question_order > 0),
 marked_for_review boolean not null default false, question_snapshot jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(attempt_id,question_id), unique(attempt_id,question_order)
);
create table if not exists public.exam_answers (
 id uuid primary key default gen_random_uuid(), attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
 attempt_question_id uuid not null unique references public.exam_attempt_questions(id) on delete cascade,
 selected_option_ids uuid[] not null default '{}', is_correct boolean, answered_at timestamptz, updated_at timestamptz not null default now()
);
create table if not exists public.user_question_history (
 user_id uuid not null references auth.users(id) on delete cascade, question_id uuid not null references public.questions(id) on delete restrict,
 certification_id uuid not null references public.certifications(id) on delete restrict, first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 times_seen integer not null default 1, times_answered integer not null default 0, times_correct integer not null default 0, times_incorrect integer not null default 0, last_answer_correct boolean,
 primary key(user_id,question_id)
);
create table if not exists public.saved_questions (user_id uuid not null references auth.users(id) on delete cascade, question_id uuid not null references public.questions(id) on delete restrict, created_at timestamptz not null default now(), primary key(user_id,question_id));
create table if not exists public.practice_domain_attempts (attempt_id uuid not null references public.exam_attempts(id) on delete cascade, domain_id uuid not null references public.certification_domains(id) on delete restrict, total_count integer not null, correct_count integer not null default 0, incorrect_count integer not null default 0, unanswered_count integer not null default 0, percentage numeric(5,2), primary key(attempt_id,domain_id));
create table if not exists public.audit_events (id bigint generated always as identity primary key, user_id uuid references auth.users(id) on delete set null, event_type text not null, entity_type text, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());

create index if not exists questions_cert_active_idx on public.questions(certification_id,active);
create index if not exists questions_domain_active_idx on public.questions(domain_id,active);
create index if not exists question_options_question_idx on public.question_options(question_id);
create index if not exists attempts_user_status_idx on public.exam_attempts(user_id,status,created_at desc);
create index if not exists attempts_certification_idx on public.exam_attempts(certification_id);
create index if not exists attempt_questions_attempt_idx on public.exam_attempt_questions(attempt_id,question_order);
create index if not exists answers_attempt_idx on public.exam_answers(attempt_id);
create index if not exists history_user_cert_idx on public.user_question_history(user_id,certification_id,last_seen_at);
create index if not exists audit_events_user_idx on public.audit_events(user_id,created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$ begin new.updated_at=now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger certifications_updated before update on public.certifications for each row execute procedure public.set_updated_at();
create trigger questions_updated before update on public.questions for each row execute procedure public.set_updated_at();
create trigger attempts_updated before update on public.exam_attempts for each row execute procedure public.set_updated_at();
create trigger attempt_questions_updated before update on public.exam_attempt_questions for each row execute procedure public.set_updated_at();
create trigger answers_updated before update on public.exam_answers for each row execute procedure public.set_updated_at();

create or replace function public.create_profile_for_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles(id,display_name) values (new.id,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1))) on conflict(id) do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_profile_for_new_user();

create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','editor')) $$;
grant execute on function public.is_staff() to authenticated;
-- The role is intentionally immutable to a normal profile update. Trusted service-role SQL can assign staff roles.
create or replace function public.keeps_current_role(p_role public.app_role) returns boolean language sql stable security definer set search_path=public as $$ select role=p_role from public.profiles where id=auth.uid() $$;
grant execute on function public.keeps_current_role(public.app_role) to authenticated;

-- Safe catalog/card data. It intentionally contains no answer key.
create or replace view public.certification_catalog with (security_invoker=true) as
 select c.id,c.slug,c.code,c.name,c.short_name,c.level,c.description,c.official_url,c.exam_guide_url,c.official_question_count,c.official_duration_minutes,c.active,
 count(q.id) filter(where q.active) as question_count
 from public.certifications c left join public.questions q on q.certification_id=c.id group by c.id;

-- Atomic server-owned generation. New/least-recently-seen questions are preferred and options are snapshot at creation.
create or replace function public.create_exam(p_certification_slug text,p_count integer,p_mode text default 'mock',p_idempotency_key uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_cert uuid; v_attempt uuid; v_seconds integer; v_actual integer;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_count not between 1 and 100 then raise exception 'Invalid question count' using errcode='22023'; end if;
 if p_idempotency_key is not null then select id into v_attempt from public.exam_attempts where user_id=v_user and idempotency_key=p_idempotency_key; if v_attempt is not null then return v_attempt; end if; end if;
 if exists(select 1 from public.exam_attempts where user_id=v_user and status='in_progress' and created_at>now()-interval '3 seconds') then raise exception 'Please wait before creating another attempt' using errcode='P0001'; end if;
 select id into v_cert from public.certifications where slug=p_certification_slug and active; if v_cert is null then raise exception 'Certification not found' using errcode='P0002'; end if;
 select count(*) into v_actual from public.questions q where q.certification_id=v_cert and q.active and exists(select 1 from public.question_answers a where a.question_id=q.id) and (select count(*) from public.question_options o where o.question_id=q.id and o.is_active)>=2;
 v_actual:=least(v_actual,p_count); if v_actual=0 then raise exception 'Question bank is not ready' using errcode='P0001'; end if; v_seconds:=case when p_count>=40 then 3600 else greatest(600,p_count*120) end;
 insert into public.exam_attempts(user_id,certification_id,mode,requested_question_count,actual_question_count,duration_seconds,expires_at,idempotency_key) values(v_user,v_cert,p_mode,p_count,v_actual,v_seconds,now()+make_interval(secs=>v_seconds),p_idempotency_key) returning id into v_attempt;
 with eligible as (select q.id,q.domain_id,row_number() over(order by coalesce(h.last_seen_at,'epoch'::timestamptz),coalesce(h.times_seen,0),random()) rn from public.questions q left join public.user_question_history h on h.question_id=q.id and h.user_id=v_user where q.certification_id=v_cert and q.active and exists(select 1 from public.question_answers a where a.question_id=q.id)), selected as (select * from eligible limit v_actual)
 insert into public.exam_attempt_questions(attempt_id,question_id,question_order,question_snapshot)
 select v_attempt,s.id,row_number() over(order by random()),jsonb_build_object('id',q.id,'external_id',q.external_id,'question_text',q.question_text,'question_type',q.question_type,'difficulty',q.difficulty,'domain',d.name,'options',(select jsonb_agg(jsonb_build_object('id',o.id,'key',o.option_key,'text',o.option_text) order by o.display_order) from public.question_options o where o.question_id=q.id and o.is_active)) from selected s join public.questions q on q.id=s.id join public.certification_domains d on d.id=q.domain_id;
 insert into public.user_question_history(user_id,question_id,certification_id) select v_user,question_id,v_cert from public.exam_attempt_questions where attempt_id=v_attempt on conflict(user_id,question_id) do update set last_seen_at=now(),times_seen=user_question_history.times_seen+1;
 insert into public.audit_events(user_id,event_type,entity_type,entity_id) values(v_user,'attempt_created','exam_attempt',v_attempt); return v_attempt;
end $$;

create or replace function public.save_exam_answer(p_attempt_question_id uuid,p_option_ids uuid[],p_marked_for_review boolean default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_attempt uuid;
begin select aq.attempt_id into v_attempt from public.exam_attempt_questions aq join public.exam_attempts a on a.id=aq.attempt_id where aq.id=p_attempt_question_id and a.user_id=auth.uid() and a.status='in_progress' and a.expires_at>now(); if v_attempt is null then raise exception 'Attempt is unavailable' using errcode='42501'; end if;
 if p_marked_for_review is not null then update public.exam_attempt_questions set marked_for_review=p_marked_for_review where id=p_attempt_question_id; end if;
 insert into public.exam_answers(attempt_id,attempt_question_id,selected_option_ids,answered_at) values(v_attempt,p_attempt_question_id,coalesce(p_option_ids,'{}'),now()) on conflict(attempt_question_id) do update set selected_option_ids=excluded.selected_option_ids,answered_at=excluded.answered_at; end $$;

create or replace function public.submit_exam(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_attempt public.exam_attempts; v_total int; v_correct int; v_unanswered int;
begin select * into v_attempt from public.exam_attempts where id=p_attempt_id and user_id=auth.uid() for update; if not found then raise exception 'Attempt not found' using errcode='42501'; end if;
 if v_attempt.status in ('submitted','expired') then return jsonb_build_object('attempt_id',v_attempt.id,'status',v_attempt.status,'score_percentage',v_attempt.score_percentage); end if;
 update public.exam_attempts set status=case when expires_at<=now() then 'expired' else 'submitted' end,submitted_at=now() where id=p_attempt_id;
 update public.exam_answers ea set is_correct=(select array(select unnest(ea.selected_option_ids) order by 1)=array(select unnest(ka.correct_option_ids) order by 1) from public.exam_attempt_questions aq join public.question_answers ka on ka.question_id=aq.question_id where aq.id=ea.attempt_question_id) where ea.attempt_id=p_attempt_id;
 select count(*),count(*) filter(where ea.is_correct),count(*) filter(where ea.id is null or cardinality(ea.selected_option_ids)=0) into v_total,v_correct,v_unanswered from public.exam_attempt_questions aq left join public.exam_answers ea on ea.attempt_question_id=aq.id where aq.attempt_id=p_attempt_id;
 update public.exam_attempts set correct_count=v_correct,incorrect_count=v_total-v_correct-v_unanswered,unanswered_count=v_unanswered,score_percentage=round(100.0*v_correct/nullif(v_total,0),2) where id=p_attempt_id returning * into v_attempt;
 insert into public.practice_domain_attempts(attempt_id,domain_id,total_count,correct_count,incorrect_count,unanswered_count,percentage) select p_attempt_id,q.domain_id,count(*),count(*) filter(where ea.is_correct),count(*) filter(where ea.id is not null and not ea.is_correct),count(*) filter(where ea.id is null or cardinality(ea.selected_option_ids)=0),round(100.0*count(*) filter(where ea.is_correct)/nullif(count(*),0),2) from public.exam_attempt_questions aq join public.questions q on q.id=aq.question_id left join public.exam_answers ea on ea.attempt_question_id=aq.id where aq.attempt_id=p_attempt_id group by q.domain_id;
 insert into public.user_question_history(user_id,question_id,certification_id,times_seen) select auth.uid(),aq.question_id,v_attempt.certification_id,0 from public.exam_attempt_questions aq where aq.attempt_id=p_attempt_id on conflict(user_id,question_id) do nothing;
 update public.user_question_history h set times_answered=times_answered+case when ea.id is null then 0 else 1 end,times_correct=times_correct+case when ea.is_correct then 1 else 0 end,times_incorrect=times_incorrect+case when ea.id is not null and not ea.is_correct then 1 else 0 end,last_answer_correct=ea.is_correct,last_seen_at=now() from public.exam_attempt_questions aq left join public.exam_answers ea on ea.attempt_question_id=aq.id where aq.attempt_id=p_attempt_id and h.user_id=auth.uid() and h.question_id=aq.question_id;
 insert into public.audit_events(user_id,event_type,entity_type,entity_id) values(auth.uid(),'attempt_submitted','exam_attempt',p_attempt_id); return jsonb_build_object('attempt_id',v_attempt.id,'status',v_attempt.status,'score_percentage',v_attempt.score_percentage,'correct_count',v_attempt.correct_count,'incorrect_count',v_attempt.incorrect_count,'unanswered_count',v_attempt.unanswered_count);
end $$;

create or replace function public.my_dashboard() returns jsonb language sql security definer set search_path=public as $$ select jsonb_build_object('total_mocks',count(*),'best_score',max(score_percentage),'average_score',round(avg(score_percentage),2),'questions_answered',coalesce(sum(actual_question_count-unanswered_count),0),'certifications_practiced',count(distinct certification_id)) from public.exam_attempts where user_id=auth.uid() and status in ('submitted','expired') $$;

-- Review is ownership-checked and only becomes available after scoring.
create or replace function public.get_exam_review(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_attempt public.exam_attempts;
begin
 select * into v_attempt from public.exam_attempts where id=p_attempt_id and user_id=auth.uid();
 if not found then raise exception 'Attempt not found' using errcode='42501'; end if;
 if v_attempt.status not in ('submitted','expired') then raise exception 'Review is available after submission' using errcode='42501'; end if;
 return jsonb_build_object('attempt',to_jsonb(v_attempt),'questions',coalesce((select jsonb_agg(jsonb_build_object('id',aq.id,'order',aq.question_order,'question',aq.question_snapshot,'selected_option_ids',coalesce(ea.selected_option_ids,'{}'::uuid[]),'is_correct',coalesce(ea.is_correct,false),'correct_option_ids',ka.correct_option_ids,'explanation',q.explanation,'reference_links',q.reference_links) order by aq.question_order) from public.exam_attempt_questions aq join public.questions q on q.id=aq.question_id join public.question_answers ka on ka.question_id=q.id left join public.exam_answers ea on ea.attempt_question_id=aq.id where aq.attempt_id=p_attempt_id),'[]'::jsonb));
end $$;

grant usage on schema public to anon, authenticated;
grant select on public.certifications,public.certification_domains,public.certification_catalog to anon,authenticated;
grant execute on function public.create_exam(text,integer,text,uuid),public.save_exam_answer(uuid,uuid[],boolean),public.submit_exam(uuid),public.my_dashboard(),public.get_exam_review(uuid) to authenticated;

alter table public.profiles enable row level security; alter table public.certifications enable row level security; alter table public.certification_domains enable row level security; alter table public.questions enable row level security; alter table public.question_options enable row level security; alter table public.question_answers enable row level security; alter table public.exam_attempts enable row level security; alter table public.exam_attempt_questions enable row level security; alter table public.exam_answers enable row level security; alter table public.user_question_history enable row level security; alter table public.saved_questions enable row level security; alter table public.practice_domain_attempts enable row level security; alter table public.audit_events enable row level security;
create policy profile_owner_read on public.profiles for select using(id=auth.uid());
create policy profile_owner_update on public.profiles for update using(id=auth.uid()) with check(id=auth.uid() and public.keeps_current_role(role));
create policy catalog_read on public.certifications for select using(active or public.is_staff()); create policy domain_read on public.certification_domains for select using(active or public.is_staff());
create policy staff_question_read on public.questions for select using(public.is_staff()); create policy staff_options_read on public.question_options for select using(public.is_staff()); create policy staff_answers_read on public.question_answers for select using(public.is_staff());
create policy staff_content_write on public.certifications for all using(public.is_staff()) with check(public.is_staff()); create policy staff_domain_write on public.certification_domains for all using(public.is_staff()) with check(public.is_staff()); create policy staff_question_write on public.questions for all using(public.is_staff()) with check(public.is_staff()); create policy staff_options_write on public.question_options for all using(public.is_staff()) with check(public.is_staff()); create policy staff_answers_write on public.question_answers for all using(public.is_staff()) with check(public.is_staff());
create policy attempt_owner on public.exam_attempts for select using(user_id=auth.uid()); create policy attempt_q_owner on public.exam_attempt_questions for select using(exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=auth.uid())); create policy answer_owner on public.exam_answers for select using(exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=auth.uid())); create policy history_owner on public.user_question_history for select using(user_id=auth.uid()); create policy saved_owner on public.saved_questions for all using(user_id=auth.uid()) with check(user_id=auth.uid()); create policy domain_attempt_owner on public.practice_domain_attempts for select using(exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=auth.uid())); create policy audit_owner on public.audit_events for select using(user_id=auth.uid());

commit;

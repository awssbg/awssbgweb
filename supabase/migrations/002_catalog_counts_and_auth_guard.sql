-- Safe public catalogue metadata: this view exposes only certification fields and active-question counts.
-- It deliberately runs with its owner privileges so question RLS does not turn legitimate public counts into zero.
begin;

create or replace view public.certification_catalog with (security_invoker=false) as
select c.id, c.slug, c.code, c.name, c.short_name, c.level, c.description, c.official_url, c.exam_guide_url, c.official_question_count, c.official_duration_minutes, c.active, count(q.id) filter (where q.active) as question_count
from public.certifications c
left join public.questions q on q.certification_id = c.id
group by c.id;

grant select on public.certification_catalog to anon, authenticated;

create or replace function public.my_dashboard()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  return (select jsonb_build_object('total_mocks',count(*),'best_score',max(score_percentage),'average_score',round(avg(score_percentage),2),'questions_answered',coalesce(sum(actual_question_count-unanswered_count),0),'certifications_practiced',count(distinct certification_id)) from public.exam_attempts where user_id=v_user_id and status in ('submitted','expired'));
end;
$$;

grant execute on function public.my_dashboard() to authenticated;
commit;

# Question-bank import runbook

The browser never receives this content or the service-role key. `scripts/build-site.js`
uses an allow list that excludes `content/`, `supabase/`, and the local import scripts.

## Preconditions

- Apply migrations `001` through `005` to the intended Supabase project.
- Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the **local terminal only**.
  Do not put the service-role key in a browser file, Git, or Netlify's public variables.
- Regenerate and upsert the catalog before importing question content. This creates the
  canonical certification, domain, and exam-version records required by the importer.

## Local commands

```powershell
./scripts/verify-question-banks.ps1
npm run certifications:seed
npm run questions:import -- content/clf-c02-question-bank.json
npm run questions:import -- content/aif-c01-question-bank.json
```

The two content banks intentionally carry `publication_status: "draft"`. This default
does not expose questions in the public catalog or new exam attempts. After editorial
approval, use the explicit, local-only promotion command for the approved bank:

```powershell
npm run questions:import -- content/clf-c02-question-bank.json --update --publish
npm run questions:import -- content/aif-c01-question-bank.json --update --publish
```

`--publish` is opt-in so importing a bank cannot accidentally make draft content public.
The importer validates every certification slug, domain, exam version, option key, and
answer mapping before its first question write. It also clears previous answer/options
for `--update` before replacing them, which keeps existing attempts untouched because
they use immutable question snapshots.

## Read-only verification query

Run this in the Supabase SQL editor after import. It reveals counts and readiness, but
not answer keys:

```sql
select slug, code, question_count, minimum_practice_available, full_mock_available
from public.certification_catalog
where slug in ('solutions-architect-associate', 'cloud-practitioner', 'ai-practitioner')
order by code;

select c.slug, ev.exam_code, q.publication_status, count(*) as question_count
from public.questions q
join public.certifications c on c.id = q.certification_id
join public.certification_exam_versions ev on ev.id = q.exam_version_id
where c.slug in ('solutions-architect-associate', 'cloud-practitioner', 'ai-practitioner')
group by c.slug, ev.exam_code, q.publication_status
order by c.slug, ev.exam_code, q.publication_status;
```

Expected imported draft totals are CLF-C02 = 45 and AIF-C01 = 45. Once explicitly
published, each bank meets the 40-question mock threshold. SAA-C03 is not part of
either command and remains unchanged.

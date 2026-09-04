# AWS SBG Certification Practice backend

The practice platform uses Netlify for the static frontend and Supabase Auth + PostgreSQL for authoritative user data, exam composition, answer persistence, scoring, results and progress. Browser code has only the Supabase URL and anon key; correct answer keys and all scoring operations remain in PostgreSQL functions.

## Deploy the database

1. Create or select a Supabase project.
2. Install the Supabase CLI, log in, and link this project:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

3. With the local terminal environment variables below, run `npm run certifications:seed`. It creates `supabase/catalog.seed.json`, then inserts/updates certifications and their domains through the trusted local importer. The schema deliberately does not permit an ordinary browser user to write content.
4. Preserve and import the existing original questions with `npm run questions:export`, then run the importer locally with a service-role key only in your terminal:

   ```powershell
   $env:SUPABASE_URL='https://YOUR_PROJECT.supabase.co'
   $env:SUPABASE_SERVICE_ROLE_KEY='YOUR_SERVICE_ROLE_KEY'
   node scripts/import-questions.js .\supabase\existing-questions.seed.json
   ```

   Add `--update` only when deliberately updating an existing `external_id`. The importer validates records before making requests and does not expose the service-role key to the website.

```json
[
  {
    "certification": "solutions-architect-associate",
    "external_id": "SAA-001",
    "domain": "Secure Architectures",
    "question_text": "...",
    "question_type": "single_answer",
    "difficulty": "medium",
    "options": [{"key":"A","text":"..."},{"key":"B","text":"..."}],
    "correct_option_keys": ["A"],
    "explanation": "...",
    "reference_links": [{"title":"AWS Documentation","url":"https://docs.aws.amazon.com/"}]
  }
]
```

The Supabase project must be linked/authenticated through a trusted Supabase CLI login or the SQL Editor before `supabase db push` can apply database changes. A public publishable key intentionally cannot create tables, execute migrations, or import content.

After the initial schema, apply `supabase/migrations/002_catalog_counts_and_auth_guard.sql`. It makes the public certification catalogue return safe active-question counts without granting public access to question text or answers.

## Netlify variables

The project contains [supabase-public-config.js](supabase-public-config.js) with the current client-safe publishable key. You may additionally set these in **Netlify → Site configuration → Environment variables** if you want the Netlify function configuration path:

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

`netlify/functions/public-config.mjs` returns those two public values at runtime. Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to Netlify frontend variables or browser JavaScript. The question payload field is named `reference_links`; `references` is deliberately not used as a PostgreSQL column name.

## Auth setup

In Supabase Auth URL Configuration, set the Site URL to `https://awssbg.iedclbscek.in` and add:

```
https://awssbg.iedclbscek.in/certification-practice
http://localhost:8888/certification-practice
```

Enable Email auth. For Google, enable the Google provider in Supabase, add its Supabase callback URL to Google Cloud OAuth credentials, then save the Google Client ID and Client Secret **only in Supabase**, not in this repository.

## Security model

- `question_answers` has no public SELECT policy.
- `create_exam`, `save_exam_answer`, `submit_exam`, and `get_exam_review` use `auth.uid()`; a supplied user ID, score, role, or question list is never trusted.
- An attempt snapshots questions/options on creation, retains its identity on refresh, and becomes immutable after submission/expiry.
- Row Level Security restricts profiles, attempts, answers, history, saved questions, domain results, and audit events to their owner.
- Assign `admin`/`editor` directly through a trusted SQL/service-role operation; ordinary users cannot set their own role.

## Verification after configuration

Test two separate accounts: create/resume/submit an attempt for account A, then verify account B cannot read its ID. Check that a second `submit_exam` call returns the same scored result, an expired/submitted attempt rejects answer writes, and browser-crafted `score` data has no effect. Run `npm run backend:check` for local syntax checks.

Development resets are intentionally not scripted here: never run a destructive database reset against production.

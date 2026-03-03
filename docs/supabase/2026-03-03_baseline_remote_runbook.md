# Supabase Baseline Remote Runbook

Date: 2026-03-03
Project ref: `takvthfatlcjsqgssnta`
Strategy: new canonical baseline from current remote state

## Goal

Replace the current non-canonical migration timeline with a new baseline that represents the real remote database state.

This runbook treats the old migration history as audit evidence, not as the future operational timeline.

## Recommended path

Primary recommendation:

- create a new canonical baseline
- validate it locally
- cut over to a new clean Supabase project

This avoids mass `migration repair` against a remote history table that is already untrustworthy.

## Non-goals

- Do not repair hundreds of remote migration rows blindly
- Do not run `db push --linked` against the current project
- Do not delete archival migration evidence

## Preconditions

- Local repo already cleaned:
  - no invalid files in `supabase/migrations`
  - no duplicate timestamps in `supabase/migrations`
- Historical evidence preserved in `supabase/migrations_archive/`
- Diagnosis document available in `docs/supabase/2026-03-03_historical_migration_drift_diagnosis.md`

## Branching

Create a dedicated branch before any baseline work:

```powershell
git checkout -b chore/supabase-baseline-20260303
```

## Phase 1: Snapshot and evidence

### Objective

Capture the current remote state before any alignment work.

### Required outputs

- schema-only export
- full backup if available
- copy of CLI evidence
- project metadata used for the baseline

### Suggested folders

```text
docs/supabase/evidence/2026-03-03/
ops/backups/supabase/2026-03-03/
```

### Checklist

- [ ] Save `npx supabase migration list --linked` output
- [ ] Save current `supabase/config.toml`
- [ ] Save remote schema export
- [ ] Save remote data backup if operationally required

### Commands

Record linked history:

```powershell
npx supabase migration list --linked | Out-File -FilePath "docs/supabase/evidence/2026-03-03/migration-list-linked.txt"
```

If you have a trusted SQL path for direct Postgres access, export schema:

```powershell
pg_dump --schema-only --no-owner --no-privileges "$env:SUPABASE_DB_URL" > "ops/backups/supabase/2026-03-03/remote_schema.sql"
```

If you also want a full safety backup:

```powershell
pg_dump --format=custom "$env:SUPABASE_DB_URL" -f "ops/backups/supabase/2026-03-03/remote_full.dump"
```

## Phase 2: Freeze the old migration story

### Objective

Keep historical migrations as evidence while removing them from the future canonical flow.

### Rule

Do not delete old files. Archive them.

### Target structure

```text
supabase/
  migrations/
    <new baseline>
    <future clean migrations>
  migrations_archive/
    legacy_pre_baseline/
    manual_and_temp/
```

### Operational note

The current repo already has `supabase/migrations_archive/manual_and_temp/`.

Move the old official timeline into a dedicated legacy archive only when the baseline has been captured and reviewed.

## Phase 3: Generate the canonical baseline from remote

### Objective

Create one migration file that exactly represents the current remote state.

### Baseline filename

Use:

```text
<timestamp>_baseline_remote_20260303.sql
```

Example:

```text
20260303193000_baseline_remote_20260303.sql
```

### Important constraints

- The baseline must reflect the remote schema exactly
- Do not hand-wave RLS, grants, functions, triggers, or extensions
- Do not mix unrelated cleanup edits into the baseline

### How to build it

Preferred source:

- schema-only export from remote via `pg_dump`

Then normalize the output into a baseline migration:

- keep required schemas
- keep tables, indexes, constraints
- keep functions, triggers, policies, grants
- remove dump-only noise that should not live in migrations if needed

### Validation checklist for the baseline SQL

- [ ] Includes extensions required by the app
- [ ] Includes custom schemas
- [ ] Includes all policies and grants needed by runtime
- [ ] Includes all functions and triggers
- [ ] Includes storage-related schema objects if they are part of the DB state

## Phase 4: Archive the legacy migration timeline

### Objective

After the baseline exists, move the old migration timeline out of canonical flow.

### Target

```text
supabase/migrations_archive/legacy_pre_baseline/
```

### Rule

After this step, `supabase/migrations/` should contain only:

- the new baseline migration
- future incremental migrations created after the baseline

## Phase 5: Validate local reproducibility

### Objective

Prove that the new canonical timeline can recreate the expected schema locally.

### Validation commands

Reset local DB:

```powershell
npx supabase db reset
```

Generate local diff if needed:

```powershell
npx supabase db diff
```

### Expected result

- local reset completes
- schema is created from the baseline cleanly
- no hidden dependency on archived legacy migrations

### Acceptance criteria

- [ ] `db reset` succeeds
- [ ] app-critical schemas and tables exist
- [ ] app-critical RPCs exist
- [ ] app-critical RLS policies exist
- [ ] no surprise diff suggesting the baseline is incomplete

## Phase 6: Decide remote cutover model

## Option A: New Supabase project clean cut

This is the recommended operational path.

### Why

- zero debt in remote migration history
- no need to mutate the current remote `schema_migrations` table
- clean future deploy path

### Steps

1. Create a new Supabase project
2. Link the repo to the new project
3. Apply the baseline there
4. Run smoke checks
5. Migrate data if required
6. Switch application secrets and traffic

### Checklist

- [ ] New project created
- [ ] Baseline applied successfully
- [ ] Required secrets configured
- [ ] Auth settings reviewed
- [ ] Storage buckets/config reviewed
- [ ] Smoke test passed
- [ ] Cutover window agreed

## Option B: Keep the current project ref

This is possible, but it preserves higher risk.

### Why it is risky

The current remote project still has a broken migration history table. To make future Supabase migration workflows behave, you will eventually need controlled `migration repair`.

### When to consider it

- you cannot change project ref now
- dependencies on the existing project are too costly to move immediately

### Rule

If this option is chosen, do not do bulk repair in one shot. Repair only from a reviewed manifest with evidence.

## Repair guardrails for Option B

- Never paste the CLI's full suggested repair list and run it blindly
- Group repairs by category:
  - one-second offset historical pairs
  - clearly obsolete remote-only versions
  - clearly canonical local-only versions
- Re-run `npx supabase migration list --linked` after each batch
- Save every batch command and result in `docs/supabase/evidence/`

## Rollback criteria

Stop and rollback the baseline operation if any of these happen:

- local `db reset` cannot recreate the baseline correctly
- critical RPCs or RLS policies are missing after reset
- schema export from remote is incomplete or inconsistent
- the new project smoke test fails on core workflows

## Smoke test scope

Minimum smoke tests after baseline or cutover:

- authentication flow works
- critical ERP reads work
- critical write RPCs work
- accounting-related RPCs return expected structure
- storage and document flows still authenticate correctly
- edge functions using service role still run

## Command checklist

### Baseline branch

```powershell
git checkout -b chore/supabase-baseline-20260303
```

### Evidence capture

```powershell
New-Item -ItemType Directory -Force -Path "docs/supabase/evidence/2026-03-03" | Out-Null
New-Item -ItemType Directory -Force -Path "ops/backups/supabase/2026-03-03" | Out-Null
npx supabase migration list --linked | Out-File -FilePath "docs/supabase/evidence/2026-03-03/migration-list-linked.txt"
```

### Local validation after baseline is prepared

```powershell
npx supabase db reset
```

## Done definition

- [ ] Historical evidence archived
- [ ] One canonical baseline migration created
- [ ] Legacy timeline moved to archive
- [ ] Local reset succeeds from baseline-only flow
- [ ] Remote cutover decision made
- [ ] If cutover path chosen, new project validated before traffic switch

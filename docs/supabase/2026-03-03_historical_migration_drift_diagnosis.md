# Historical Migration Drift Diagnosis

Date: 2026-03-03
Project ref: `takvthfatlcjsqgssnta`

## Executive summary

The AV TECH Supabase project has historical migration drift between the linked remote database and the local `supabase/migrations` directory.

This is not a single recent mismatch. The divergence starts on `2025-12-30` and continues through January, February, and March 2026.

## Evidence collected

### Linked project

- Project ref detected in `supabase/config.toml`: `takvthfatlcjsqgssnta`
- CLI available: `npx supabase --version` -> `2.76.16`

### Local hygiene issues found before cleanup

- `14` invalid SQL files inside `supabase/migrations`
- `3` duplicate timestamp groups:
  - `20260120000000`
  - `20260206120000`
  - `20260228120000`

### Drift classification before cleanup

- Matched local/remote versions: `27`
- Local only versions: `160`
- Remote only versions: `569`
- One-second offset pairs: `34`

The one-second offset pattern strongly suggests that part of the migration history was recreated locally after the original remote versions had already been recorded.

Examples:

- Remote `20251230085214` vs local `20251230085215`
- Remote `20260105105923` vs local `20260105105924`
- Remote `20260216075449` vs local `20260216075450`

### Remote-only concentration by day

The highest remote-only volumes are concentrated in a few dates, which suggests large batches of changes executed from another environment or through manual workflows:

- `2026-01-19`: `71`
- `2026-01-20`: `45`
- `2026-01-29`: `44`
- `2026-01-26`: `42`
- `2026-02-16`: `41`
- `2026-02-03`: `37`

## Local remediation performed on 2026-03-03

### Files moved out of the official history

The following files were moved from `supabase/migrations` to `supabase/migrations_archive/manual_and_temp` because they do not match the official Supabase migration naming pattern and were being ignored by the CLI:

- `run_catalog_v2_fixes_manual.sql`
- `temp_fase5_al_final.sql`
- `temp_fase6_al_final.sql`
- `temp_fase7_al_final.sql`
- `temp_migration.sql`
- `temp_resto_22_al_final.sql`
- `temp_resto_23_al_final.sql`
- `temp_resto_24_al_final.sql`
- `temp_resto_completo.sql`
- `temp_resto_completo_final.sql`
- `temp_resto_final_completo.sql`
- `temp_resto_final_ultimo.sql`
- `temp_resto_migration.sql`
- `temp_resto_ultimo.sql`

### Duplicate timestamps normalized

The following local files were renamed to unique timestamps:

- `20260120000000_update_project_financial_stats_subtotals.sql`
  -> `20260120000003_update_project_financial_stats_subtotals.sql`
- `20260206120000_list_purchase_invoices_internal_number.sql`
  -> `20260206120001_list_purchase_invoices_internal_number.sql`
- `20260228120000_security_hardening_auth_rls.sql`
  -> `20260228120001_security_hardening_auth_rls.sql`

### Post-cleanup local status

- Invalid migration filenames in `supabase/migrations`: `0`
- Duplicate timestamp groups in `supabase/migrations`: `0`

### Post-cleanup linked status

After the local cleanup, `npx supabase migration list --linked` still reports a historical mismatch:

- Matched local/remote versions: `28`
- Local only versions: `159`
- Remote only versions: `570`

This confirms that the remaining problem is not local filename hygiene. It is the linked remote migration history itself.

### db pull result

`npx supabase db pull` is currently blocked by the migration history mismatch.

The CLI explicitly refuses to pull until the migration history table is reconciled. It proposes a very large set of `migration repair --status reverted ...` and `migration repair --status applied ...` commands.

That output is evidence that the remote history table and the repository are describing different timelines, not just a small recent mismatch.

## What remains unresolved

The cleanup fixed local migration hygiene, but it did not remove the historical drift with the remote project.

The remaining issue is structural:

- the remote migration history still contains hundreds of versions that are not present in this repository
- the repository still contains many versions that are not present remotely
- several old versions still differ only by one second, which indicates history mismatch rather than current schema mismatch

This means the remote database and the repository are not sharing the same canonical migration timeline.

## Most likely root causes

1. Remote changes were applied from another clone, another branch, or manual SQL workflows without later consolidating them into this repository.
2. Some local migrations were recreated or renamed after the corresponding remote versions already existed.
3. Temporary/manual SQL files were kept inside `supabase/migrations`, which blurred the distinction between official history and scratch work.
4. Duplicate timestamps were introduced locally, making the history ambiguous and harder to reconcile.

## Recommended remediation strategy

Do not run broad `migration repair` yet.

Recommended sequence:

1. Treat the current remote database as the operational source of truth.
2. Capture the actual remote structure with `npx supabase db pull`.
3. Compare the pulled schema against the current local migration outcome.
4. Decide whether to:
   - create a new canonical baseline from the remote state, or
   - manually reconstruct the historical timeline

For this project, a new canonical baseline is likely the safer option because the remote-only history volume is too large for a low-risk manual repair.

## Controlled alignment options

### Option A: New canonical baseline from remote state

This is the safer operational option.

High-level approach:

1. Export or capture the current remote schema from a trusted environment.
2. Preserve the current migration directory as historical evidence.
3. Create a new canonical baseline migration that represents the remote state as of alignment day.
4. From that point on, apply only new migrations on top of the baseline.

Pros:

- avoids repairing hundreds of historical version rows manually
- produces a clean migration story going forward
- lowers risk of accidental history corruption

Tradeoff:

- the old detailed migration timeline remains archival, not canonical

### Option B: Repair the historical timeline

This is possible, but high risk here.

High-level approach:

1. Build a reviewed list of remote-only versions to mark as reverted.
2. Build a reviewed list of local-only versions to mark as applied.
3. Execute `migration repair` in controlled batches with evidence after each batch.
4. Re-run `migration list --linked` after every batch.
5. Only after full alignment, run `db pull`.

Pros:

- preserves a continuous version history if done perfectly

Tradeoff:

- too many rows in this project
- easy to make the history table less trustworthy
- poor rollback ergonomics

## Safe next commands

These are the next commands I would run, in order:

1. Export the remote schema from a trusted environment or prepare a reviewed `migration repair` subset
2. Choose between baseline alignment and historical repair
3. Only after that, re-run `npx supabase db pull`

## Commands to avoid for now

- `npx supabase migration repair ...` with bulk version lists
- `npx supabase db push --linked`
- manual deletion of remote migration records

Those actions would hide evidence before we have a controlled alignment plan.

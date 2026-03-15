# Supabase Linked History Repair

Date: 2026-03-13
Project ref: `takvthfatlcjsqgssnta`

## Goal

Repair the remote `schema_migrations` history so that it matches the canonical baseline kept in this repository and then bring the remaining local migrations into sync with the linked remote.

## Starting point

- Local official migrations:
  - `20260303220000_baseline_remote_20260303.sql`
  - `20260313110000_resolve_sales_kpi_conflicts.sql`
  - `20260313143000_add_sync_set_purchase_invoice_archive_metadata.sql`
- Linked drift before repair:
  - `598` remote-only versions
  - `3` local-only versions
- `db pull` was blocked because the linked remote history table did not match the local migration directory.

Evidence saved in:

- `docs/supabase/evidence/2026-03-13/migration-list-linked.txt`
- `docs/supabase/evidence/2026-03-13/db-pull-output.txt`

## Decision

Apply the canonical baseline as the only historical version considered already deployed in the current project.

Leave the two functional migrations created on 2026-03-13 as true pending work until they are actually deployed to the linked remote:

- `20260313110000`
- `20260313143000`

## Tooling added

Reusable script:

- `scripts/nexo/repair-linked-migration-history.ps1`

Dry-run example:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/nexo/repair-linked-migration-history.ps1" `
  -MigrationListPath "docs/supabase/evidence/2026-03-13/migration-list-linked.txt" `
  -ApplyVersions 20260303220000
```

Applied repair:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/nexo/repair-linked-migration-history.ps1" `
  -MigrationListPath "docs/supabase/evidence/2026-03-13/migration-list-linked.txt" `
  -ApplyVersions 20260303220000 `
  -Apply `
  -VerificationOutputPath "docs/supabase/evidence/2026-03-13/migration-list-linked-after-repair.txt"
```

## Result after repair

`npx supabase migration list --linked` now returns:

- matched:
  - `20260303220000`
- still pending locally:
  - `20260313110000`
  - `20260313143000`

The historical remote-only mismatch is gone.

## Migration deployment completed afterwards

The two pending migrations were later deployed successfully:

- `20260313110000_resolve_sales_kpi_conflicts.sql`
- `20260313143000_add_sync_set_purchase_invoice_archive_metadata.sql`

Deployment used:

```powershell
npx supabase db push --include-all
```

This was required because the local migrations needed to be inserted before `20260313173000`, which was already present in the linked remote history.

## Current linked state

`npx supabase migration list --linked` is now fully aligned:

- `20260303220000`
- `20260313110000`
- `20260313143000`
- `20260313173000`

Local and remote match for all official migrations currently in scope.

## Current limit

`npx supabase db pull` is no longer blocked by migration history mismatch.

It now fails because the local environment does not have Docker Desktop running, which Supabase CLI needs to create the shadow database during pull.

Observed error family:

- `failed to inspect docker image`
- `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`

## Next safe options

1. Start Docker Desktop and re-run `npx supabase db pull` if a fresh schema snapshot is needed locally.
2. Skip `db pull` if schema snapshotting is not needed right now and the linked history alignment is already sufficient.
3. Keep using `npx supabase migration list --linked` as the low-risk health check for future migration work.

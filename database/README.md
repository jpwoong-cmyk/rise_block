# Database operations

The live database is the `riseblock` schema in the existing Supabase project.

Do not reset the whole Supabase project. Other applications share that project in other schemas.

## Two data layers

### Permanent master data

Keep these during testing:

- `riseblock.projects`
- `riseblock.blocks`
- `riseblock.stacks`
- `riseblock.units`

### Resettable community/test data

These are append-only observations and can be wiped between test rounds:

- `riseblock.unit_reports`
- `riseblock.block_quota_reports`
- `riseblock.selection_progress_reports`

The current-state views recalculate automatically from those report tables.

## Clean test reset

Run `reset-test-data.sql` in the Supabase SQL Editor.

It only truncates the three report tables under `riseblock`. It does not touch master units or any other schema.

After resetting, run `verify-baseline.sql`.

Expected master baseline:

- 6 blocks
- 48 stacks
- 1,976 units
- 172 2R-T1
- 644 2R-T2
- 172 3R
- 988 4R
- zero rows in the three report tables

## Source corrections

`migrations/20261002_source_audit_floor_corrections.sql` records the correction already applied to the live `riseblock` schema after checking the uploaded HDB brochure and price charts.

See `source-audit.md` for the reasoning.

## Anonymous reporter token

The website uses a browser-local random reporter token to distinguish independent reports. Database reset does not need to clear that token.

For testing two independent reporters, use two browsers / browser profiles / incognito sessions.

# Berlayar Rise Community Flat Tracker — V1.6.0

A GitHub/Vercel-ready Berlayar Rise community tracker with a source-informed 3D estate view and shared reporting backed by Supabase.

## What changed in V1.6.0

- Simplified public-facing copy and removed implementation/debug wording from the main experience.
- Reduced 3D block-label clutter. Desktop labels show the block and a compact taken count; mobile shows the block number only.
- Added a two-tap unit workflow: tap a unit, then tap **Taken** or **Available** from the sticky quick-action bar.
- Added **Details** as a secondary action instead of forcing the full unit dialog open on every tap.
- Reworked the block drawer for phones: compact header, collapsible quota panel, horizontal filters, and a unit grid that can scroll vertically and horizontally.
- Simplified the report panel so only the selected report type is shown.
- Moved observed time, source, note and evidence into an optional **Add source or note** section.
- Direct block/unit reporting now hides block/unit selectors when the current context is already known.
- Community reporting/database rules are unchanged.

## What changed in V1.4.1

- Connected to Supabase project `jxmafsnxfupdvbqnfixd`, schema `riseblock` only.
- Seeded the verified Berlayar Rise unit master data into Supabase: 6 residential blocks, 48 stacks, 1,976 units.
- Added guided community reporting for:
  - unit status;
  - block ethnic-quota observations;
  - queue / dropout progress.
- Added a block quota panel and live selection-progress panel.
- Individual unit cells now take their live community state from Supabase.
- Added lightweight consensus handling instead of letting one report overwrite the tracker.
- Re-audited block / floor data against the uploaded HDB brochure and price charts.
- Corrected 200B / 201A master totals and the 201A / 201B sky-terrace levels.
- Added `data/berlayar-unit-prices.js` with 1,976 source-chart listed prices, one for every corrected sale unit.
- Added `database/` operational scripts for safe test reset, verification and source-audit history.

## Supabase objects created

Only application objects in the `riseblock` schema were created or modified:

- `projects`
- `blocks`
- `stacks`
- `units`
- `unit_reports`
- `block_quota_reports`
- `selection_progress_reports`
- `unit_status_current` view
- `block_status_summary` view
- `block_quota_current` view
- `block_quota_history` view
- `selection_progress_current` view
- `selection_progress_history` view
- `submit_unit_report(...)`
- `submit_quota_report(...)`
- `submit_progress_report(...)`

The other application schemas in the Supabase project were not edited.

## Required one-time Supabase Dashboard setting

Supabase does not expose custom schemas through the Data API automatically.

In the Supabase Dashboard:

1. Open **Project Settings → API**.
2. Find **Exposed schemas**.
3. Add `riseblock`.
4. Save.

The database grants and RLS setup are already present. Do not add any other schema for this tracker.

The app detects this condition and will display an explicit message if `riseblock` has not yet been exposed.

## Community truth model

No visitor directly changes a unit row or quota row.

Every update is appended as an observation. The app derives the currently displayed community state from recent reports.

For unit status:

- no reports → `Untracked`;
- one recent report → `Reported available` / `Reported taken`;
- two or more matching distinct browser tokens in the latest 24-hour observation window → `Community-confirmed available` / `Community-confirmed taken`;
- conflicting recent reports → `Conflicting reports`.

For block quota and queue progress, the latest observed values are shown with a confidence label based on matching / conflicting recent reports.

This is community data, not official HDB live data.

## Ethnic quota privacy rule

Quota is recorded only at **block level**:

- Malay remaining;
- Chinese remaining;
- Indian / Others remaining.

The tracker never stores ethnicity against a specific unit or household.

## Queue progress

The progress panel keeps queue-based progress separate from unit-by-unit reports:

`implied bookings = last queue reached - cumulative dropouts`

`estimated remaining = 1,976 - implied bookings`

The app does not use those estimates to invent which individual units were booked.

## Verified unit seed

The Supabase seed reconciles to:

| Block | Units |
|---|---:|
| 200A | 344 |
| 200B | 360 |
| 201A | 368 |
| 201B | 344 |
| 204A | 304 |
| 204B | 256 |
| **Total** | **1,976** |

And by flat type:

| Flat type | Units |
|---|---:|
| 2-Room Flexi Type 1 | 172 |
| 2-Room Flexi Type 2 | 644 |
| 3-Room | 172 |
| 4-Room | 988 |
| **Total** | **1,976** |

## Source-fidelity rule

Source-backed facts remain separate from schematic visual geometry.

The app still does **not** claim:

- surveyed 3D coordinates;
- exact BIM footprints;
- exact façade/window position of each stack;
- a live HDB availability feed;
- an official live HDB per-unit price feed.

### Uploaded unit-price charts

The project source workbooks contain one numeric listed price for every corrected sale unit: 816 2-room, 172 3-room and 988 4-room prices, totalling 1,976.

V1.4.1 displays that value as **“listed in uploaded Berlayar price chart”**. It does not relabel the workbook as a live HDB feed.

## Testing and reset

The repository now includes `database/reset-test-data.sql`.

Run it when a testing round is finished. It deletes only:

- `riseblock.unit_reports`
- `riseblock.block_quota_reports`
- `riseblock.selection_progress_reports`

It keeps the project, blocks, stacks and 1,976 master units intact. Do **not** reset the whole Supabase project because other schemas share the same project.

After reset, run `database/verify-baseline.sql`.

See `database/source-audit.md` for the source corrections and `database/migrations/` for the SQL already applied to the live `riseblock` schema.

## Primary public sources

1. HDB — Berlayar Rise sales brochure, June 2026  
   https://assets.hdb.gov.sg/residential/buying-a-flat/finding-a-flat/sales-brochure/26JUNBTO_pdf_selection/berlayar_rise.pdf
2. HDB — Annex A, June 2026 BTO flat supply and pricing details  
   https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise/Annex-A.pdf
3. HDB — June 2026 BTO launch announcement  
   https://www.hdb.gov.sg/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise
4. HDB Awards — Berlayar Residences & Berlayar Rise  
   https://building-partner.hdb.gov.sg/awardwinners-projectshowcase/hdb-design-award/berlayar-residences---berlayar-rise/
5. HDB — Berlayar estate masterplan  
   https://www.hdb.gov.sg/hdb-pulse/news/2025/hdb-unveils-masterplan-for-berlayar-estate

## Run locally

Use a static web server rather than double-clicking the file if possible:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

The app imports Three.js and Supabase JS from `esm.sh`, so internet access is required.

## Deploy with GitHub + Vercel

1. Put this folder at the root of the GitHub repository.
2. Import the repository into Vercel.
3. No build command is required.
4. Deploy.

`vercel.json` is included.

## Abuse resistance

V1.4.1 uses append-only report functions, RLS, no direct anonymous table updates, a short submission throttle, and community consensus instead of single-report overwrite.

It is not strong identity verification. A determined person can still reset a browser token or spam from multiple clients. If the tracker becomes heavily used, the next protection layer should be CAPTCHA / Turnstile or lightweight sign-in rather than trying to infer identity from personal data.


## V1.6 UX changes
- All flats display as Available by default before booking begins.
- Report Update opens with no form fields until Block quota, Unit status, or Queue progress is selected.
- Only the selected report form is rendered.
- Available/report-confirmed-available states are presented simply as Available to residents.

## V1.7 selection UX
- Keeps the 3D estate for discovery, but uses a simpler 2D flat selector inside each block.
- Block view now defaults to By level: horizontally scrollable level chips plus clean flat cards.
- Each card shows unit number, flat type, listed price and current status.
- Tapping a flat keeps the existing one-tap Taken / Available / Details action bar.
- The original floor x stack matrix remains available under All floors for power users.

## V1.8 UX / visual pass
- All Floors is now the default block selector.
- Flat Type moved into the sticky top bar as a primary control beside Report Update.
- The flat-type control expands into an animated chooser and updates the 3D estate plus block unit view.
- Building labels were redesigned as compact map identity plates with an anchored marker.
- Added restrained motion for button clicks, panel entrances, drawers, report flows and dialogs.
- Motion respects prefers-reduced-motion.

## V1.8.1 mobile fix
- Restores the residential block labels on mobile.
- Fixes an older mobile CSS rule that accidentally hid every span inside the new V1.8 label component.
- Mobile labels intentionally show only the block number (200A, 200B, etc.) plus the anchor pin to prevent overlap.
- Desktop keeps the richer availability / flat-type detail.


## V1.9.1
- Fixed V1.9 favourites wiring: the UI existed but the JavaScript event/storage logic was missing from the packaged app.
- Device-only favourites with localStorage, heart controls, favourites panel, JSON export/import, and local status-change alerts.
- Taken is red; reported taken is a softer red.
- No favourites are written to Supabase.

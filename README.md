# Berlayar Rise Community Flat Tracker — V1

A GitHub + Vercel-ready prototype for a community flat-selection tracker focused only on **Berlayar Rise**.

## What V1 contains

- Interactive 3D estate view using Three.js.
- Six residential blocks positioned as a simplified interpretation of the published site plan.
- Clickable blocks with block-level available/total counts.
- Unit matrix for every residential stack and published residential level.
- All **1,976 units** generated from block + stack + level rules.
- Flat-type filters.
- HDB public indicative price ranges and floor areas.
- Source dialog inside the app.
- No database yet. Community reporting is intentionally disabled until persistent shared storage is connected.

## Dataset sanity checks

The generated unit data reconciles to the official June 2026 flat supply:

| Flat type | Units |
|---|---:|
| 2-Room Flexi Type 1 | 172 |
| 2-Room Flexi Type 2 | 644 |
| 3-Room | 172 |
| 4-Room | 988 |
| **Total** | **1,976** |

Residential block totals generated from the elevation charts:

| Block | Storeys / published top level | Generated units | Estimated wait |
|---|---:|---:|---:|
| 200A | 46 | 344 | 54 months |
| 200B | 49 | 368 | 54 months |
| 201A | 49 (roof garden level; residential unit grid to 48) | 360 | 54 months |
| 201B | 46 | 344 | 49 months |
| 204A | 39 | 304 | 49 months |
| 204B | 33 | 256 | 49 months |

## Public sources used

1. **HDB — June 2026 BTO launch announcement**  
   https://www.hdb.gov.sg/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise  
   Used for official launch/classification context and the 14% subsidy recovery rate.

2. **HDB — Annex A: June 2026 BTO Flat Supply and Pricing Details**  
   https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise/Annex-A.pdf  
   Used for official flat supply, floor areas, indicative pricing and 49/54-month waiting time.

3. **HDB — June 2026 application rates**  
   https://services-homes.hdb.gov.sg/sales/application-rate/bto/202606  
   Cross-checks 816 2-Room Flexi, 172 3-Room and 988 4-Room units.

4. **99.co — Berlayar Rise site plan and elevation charts**  
   https://www.99.co/singapore/hdb/berlayar-rise---prime-de1ykFxT10z80WICTzZfAC0W  
   Publicly accessible site plan and elevation/unit-distribution charts used to map residential blocks, stacks, flat types and levels.

5. **Stacked Homes — June 2026 BTO launch review**  
   https://stackedhomes.com/june-2026-bto-launch-review/  
   Used as a cross-check for six residential blocks, block completion groups and published stack references.

## Important price limitation

The public HDB June 2026 source reviewed gives **indicative price ranges by flat type**, and explicitly notes that actual prices vary according to the attributes of the individual flat.

V1 therefore **does not invent an exact price for #12-105, #38-141, etc.** The unit detail panel shows the official flat-type range and marks exact unit price as `Not publicly verified`.

If a legitimate public per-unit price list becomes available later, add it as a separate mapping keyed by `block-floor-stack`.

## Run locally

Because `app.js` uses browser ES modules, run a small local web server rather than double-clicking `index.html`.

### Python

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Put on GitHub

1. Create a new GitHub repository.
2. Upload all files in this folder to the repository root.
3. Commit and push.

## Deploy on Vercel

1. In Vercel, choose **Add New → Project**.
2. Import the GitHub repository.
3. Framework preset: **Other** (static site).
4. No build command is needed.
5. Deploy.

`vercel.json` is included so Vercel serves this as a simple static project.

## Phase 2: shared community reports

Do **not** store shared reports in localStorage. When ready, connect a small hosted database and add server-side Vercel endpoints such as:

- `GET /api/units`
- `POST /api/reports`
- `POST /api/reports/:id/confirm`
- `GET /api/progress`

Personal watchlists can still use localStorage later because they are device-specific rather than shared truth.

## Files

- `index.html` — page structure
- `styles.css` — responsive visual design
- `app.js` — 3D scene, interactions, unit grid and validation
- `data/berlayar-data.js` — public-source project schema
- `vercel.json` — static Vercel configuration


# Berlayar Rise Community Flat Tracker — V1.3

A GitHub/Vercel-ready static prototype for a **Berlayar Rise-only** community flat-selection tracker.

V1.3 is deliberately strict about source fidelity: source-backed facts are separated from schematic 3D geometry, and every flat starts as **Untracked** rather than pretending to be currently available.

## V1.3 source audit

The generated flat database reconciles to the public project totals:

| Block | Source-derived residential units |
|---|---:|
| 200A | 344 |
| 200B | 368 |
| 201A | 360 |
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

The app validates those totals in JavaScript at startup.

## What is treated as verified data

- Project supply: 1,976 units across six residential blocks.
- Block IDs: 200A, 200B, 201A, 201B, 204A, 204B.
- Published 33–49-storey project height range.
- Stack numbers and flat type assigned to each stack.
- Residential floor ranges.
- Sky-terrace levels shown in the unit-distribution charts:
  - 200A: 09, 29
  - 200B: 20, 40
  - 201A: 09, 30
  - 201B: 22, 37
- Accessible roof-garden markers shown at the top of 201A, 201B and 204B.
- Residents’ Network Centre marker at Block 201B.
- Official HDB flat-type floor areas and indicative 99-year price ranges.
- Site-plan features that are explicitly labelled or described in the listed public sources, including Telok Blangah MRT, the 3-storey preschool, Block 203 MSCP, communal/play/fitness facilities and surrounding reserved land.

## What remains schematic / deliberately not claimed

- Exact surveyed x/y coordinates and distances in the 3D scene.
- Exact construction/BIM footprint of residential blocks and amenities.
- Exact sheltered-linkway alignment.
- Exact façade/window position of a stack. The 3D "Locate this unit" highlight uses the published stack order on a **schematic tower face**.
- Exact function of standalone site-plan structures labelled Blocks 200, 201, 202, 204 and 205. V1.3 shows those source-plan labels but **does not guess their use**.
- Live HDB flat availability.
- Exact selling price of a specific unit.

## Status model

All 1,976 flats start as:

`Untracked`

That means "no community live-status record yet". It does **not** mean "available".

The data model already reserves these future states:

- Untracked
- Confirmed available
- Reported taken
- Confirmed taken

Shared reporting is intentionally disabled until persistent storage and moderation rules are added.

## Unit drill-down

Navigation is now:

**Estate → Block → Level / stack → Unit**

The unit view contains:

1. source-derived block elevation with the selected level/stack highlighted;
2. explicit sky-terrace / roof-garden rows;
3. flat type and official HDB flat-type price range;
4. an original simplified flat-layout redraw;
5. links back to public unit-distribution and floor-plan sources;
6. a "Locate this unit on the tower" action, clearly labelled in-app as schematic façade positioning.

## 3D precinct layer

V1.3 includes source-backed orientation markers for:

- Telok Blangah MRT Station;
- Telok Blangah Road / West Coast Highway;
- Berlayar Street;
- Berlayar Drive;
- six residential blocks;
- Block 203 6-storey MSCP + accessible roof garden;
- 3-storey preschool;
- Residents’ Network Centre at 201B;
- grouped communal space marker;
- children’s play, fitness and hardcourt areas;
- sheltered-linkway connectivity sketch;
- future bus-stop markers;
- public housing under construction to the west;
- park-reserve and future high-rise-residential parcels shown in the source plan;
- source-plan labels for standalone Blocks 200, 201, 202, 204 and 205 without invented uses.

A **Plan view** button gives a top-down orientation view.

## Primary public sources

1. **HDB — Berlayar Rise sales brochure, June 2026**  
   https://assets.hdb.gov.sg/residential/buying-a-flat/finding-a-flat/sales-brochure/26JUNBTO_pdf_selection/berlayar_rise.pdf
2. **HDB — Annex A, June 2026 BTO flat supply and pricing details**  
   https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise/Annex-A.pdf
3. **HDB — June 2026 BTO launch announcement**  
   https://www.hdb.gov.sg/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise
4. **HDB Awards — Berlayar Residences & Berlayar Rise**  
   https://building-partner.hdb.gov.sg/awardwinners-projectshowcase/hdb-design-award/berlayar-residences---berlayar-rise/
5. **HDB — Berlayar estate masterplan**  
   https://www.hdb.gov.sg/hdb-pulse/news/2025/hdb-unveils-masterplan-for-berlayar-estate

Public mirrors / secondary guides used only as cross-checks are listed in the app’s **Sources** dialog.

## Run locally

Extract the ZIP and open `index.html`, or serve the folder with any static HTTP server.

The 3D view imports Three.js from `esm.sh`, so internet access is required for the 3D engine. If that import fails, the app falls back to an interactive 2D site view instead of a blank screen.

## Deploy with GitHub + Vercel

1. Create a GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Create a Vercel project and import the repository.
4. No build command is required.
5. Deploy.

`vercel.json` is included.

## Not implemented yet

- shared community reporting / confirmation;
- database writes;
- user identity / anti-abuse controls;
- queue / dropout submissions;
- ethnic-quota reports;
- exact per-unit selling prices.

Those should only be connected once we add persistent storage and explicit trust/moderation rules.

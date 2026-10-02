# Berlayar Rise Community Flat Tracker — V1.2

A GitHub/Vercel-ready static prototype for a Berlayar Rise community flat-selection tracker.

## What V1.2 adds

- Source-informed 3D precinct view rather than only residential tower massing.
- Telok Blangah MRT shown north of the project.
- Block 203 six-storey MSCP with a schematic roof garden, roof shelters and first-storey commercial-use description.
- Separate three-storey preschool volume with green roof.
- Residents’ Network Centre marker at Block 201B.
- Precinct pavilion, playground, fitness and hardcourt representations.
- Sheltered-linkway network and two simplified drop-off areas.
- Surrounding Berlayar Street, Berlayar Drive, Telok Blangah Road / West Coast Highway, future-park land and future-residential land.
- Clickable site features with provenance notes.
- Estate → Block → Unit → Floor-plan navigation.
- Each unit opens an original schematic floor plan for its flat type, room list, floor area and official public flat-type price range.
- “Highlight this floor in 3D” shows the selected unit’s level on its block.
- 2D interactive fallback if the remote Three.js module cannot load.

## Data boundary

This is **not** an HDB live availability feed and does not access Singpass or My Flat Dashboard.

The static starting data contains 1,976 units across Blocks 200A, 200B, 201A, 201B, 204A and 204B. The unit generator is validated against the published project totals and flat-type totals.

Exact selling prices for individual units are **not fabricated**. The UI only shows the publicly published indicative price range for the unit’s flat type. If an exact unit-level public source becomes available later, add it as a separately sourced field.

The 3D site is a source-informed orientation model, not a survey/BIM model. Facility placement, sheltered-link geometry and building forms are deliberately simplified from the public site plan.

The in-app floor plans are **original schematic diagrams, not reproductions of source images and not to scale**. A link to the public floor-plan source is provided in each unit view.

## Public sources used

1. HDB — June 2026 BTO launch announcement
2. HDB — Annex A, June 2026 BTO Flat Supply and Pricing Details
3. HDB — Berlayar estate masterplan
4. BTOHQ — Berlayar Rise project page and public site-plan image
5. 99.co — publicly accessible Berlayar Rise site/elevation material
6. Stacked Homes — June 2026 BTO review, facility cross-check and public floor-plan layouts
7. DollarsAndSense — cross-check for MSCP commercial uses and Residents’ Network Centre at Block 201B

The exact URLs are available from the **Sources** dialog in the app.

## Run locally

Extract the ZIP and open `index.html`.

The 3D view imports Three.js from `esm.sh`, so internet access is required for 3D. If that import fails, V1.2 now displays an interactive 2D fallback instead of a blank screen.

## Deploy with GitHub + Vercel

1. Create a new GitHub repository.
2. Upload the contents of this folder to the repository root.
3. In Vercel, create a new project and import that GitHub repository.
4. No build command is required.
5. Deploy.

`vercel.json` is already included for the static deployment.

## What is deliberately not implemented yet

- Shared community reports / confirmations.
- User accounts.
- Database writes.
- Ethnic-quota updates.
- Queue/dropout community submissions.
- Exact unit-level HDB prices.

Those should be added only after persistent shared storage and moderation/trust rules are selected.

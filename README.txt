RiseBlock mobile overlay fix

Replace these two existing files in the repository root:
- quota-queue-v2.js
- quota-queue-v2.css

No Supabase change.
No index.html change.
No app.js/styles.css change.

Fixes visible in the supplied mobile screenshot:
1. 3D block labels no longer draw over the Explore the precinct / Last update card.
2. The Map Layers box is positioned dynamically below the actual project-card height,
   so adding Last Update cannot make the two panels overlap.
3. The ? activity-log button remains visible/clickable.

The position recalculates on resize and when the project card height changes.

RISEBLOCK - UNIT GUARDRAILS + MY BOOKING FAVOURITE

Files in this ZIP:
1. index.html              REPLACE your current index.html
2. unit-guardrails.js      ADD to repo root
3. unit-guardrails.css     ADD to repo root

No other frontend files need to be replaced.

The Supabase backend migration has already been applied to the live RiseBlock project.

BEHAVIOUR
- Taken remains fast / one-tap.
- Pressing Available on a unit already shown Available does not create another report.
- If a unit has Taken evidence, Available asks the user to confirm the correction.
- If the same browser reverses its own recent Taken report, the backend removes that Taken report instead of creating an Available report.
- A different reporter challenging Taken creates conflicting evidence instead of simply wiping Taken.
- Quick Update > My booking gets a large heart icon directly on the matched unit. No prompt.
- The heart writes to the same browser-local RiseBlock favourites key.
- If a favourite is changed from My booking, the page refreshes only after Quick Update closes so the main Favourites panel is fully synced.

DEPLOY
Upload/commit these three files to the repository root. Vercel should redeploy from main as usual.

RiseBlock running-number update

Replace these files:
- index.html
- app.js

styles.css is intentionally NOT changed in this update. Your current GitHub styles.css already contains the 8-cell T1/T2 summary layout.

Behaviour:
- Summary values start visually at 0.
- Once live Supabase unit statuses load, every summary number counts up from 0 to its real current value.
- If Available is 1,975, it ends at 1,975, never 1,976.
- 2R-T1, 2R-T2, 3R and 4R each animate to their own current available count.
- Reported taken and Confirmed taken animate too.
- Whenever updateSummary() runs after a status change, the counters restart at 0 and count to the newly calculated live value.
- Reduced-motion users get the final number immediately instead of animation.

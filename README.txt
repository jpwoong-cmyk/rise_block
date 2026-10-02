RiseBlock mobile pointer blur

Replace the existing root files:
- quota-queue-v2.js
- quota-queue-v2.css

No Supabase change.
No index.html change.
No app.js/styles.css change.

Mobile behaviour:
- Block pointers such as 200A / 201A / 204A stay normal while outside the
  "Explore the precinct" rectangle.
- The moment a pointer overlaps that card, it gets:
    opacity: 40%
    blur: 2px
  This is the requested roughly 60% visual fade/blur treatment.
- While overlapped, the pointer does not intercept taps, so controls inside
  the card remain usable.
- The effect updates continuously while the 3D camera moves.

Map Layers remains above the pointers.

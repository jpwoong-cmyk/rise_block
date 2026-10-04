RiseBlock - Sun Study update

Replace ONLY:
- app.js
- styles.css

No index.html change.
No Supabase migration.
No new JS/CSS files.

What is included:
- Sun Study toggle added to existing Map Layers.
- Date picker and draggable 6:00 AM-8:00 PM time slider.
- Morning 9 AM, Afternoon 1 PM, Evening 5 PM shortcuts.
- Solar azimuth/elevation calculated client-side for Berlayar Rise.
- Existing Three.js directional light now follows the calculated sun.
- Existing building shadows move with time.
- Dynamic N/E/S/W compass follows the rotated 3D view.
- Sunrise/sunset readout.
- Selected flats show North/South-facing exposure using stack orientation transcribed from the HDB site plan.

Accuracy:
The sun position is astronomical/indicative. The current 3D towers are schematic rather than BIM geometry, so shadow and facade exposure should be treated as a planning aid, not a professional solar simulation.

# Source audit — 2026-10-02

This tracker follows a strict rule: a source-backed fact goes into data; a visual approximation stays labelled schematic; an unverified fact stays unknown.

## Project sources reviewed

- `Berlayar Rise BTO PDF Plan.pdf`
- `berlayar_rise_2room_chart(1).xlsx`
- `berlayar_rise_3room_chart.xlsx`
- `berlayar_rise_4room_chart.xlsx`

The HDB brochure is the authority for unit-distribution / floor-plan structure. The uploaded price-chart workbooks are used as project source material for listed per-unit prices and as an independent cross-check of sale-unit / community-floor positions.

## Corrections made

| Block | Corrected residential structure |
|---|---|
| 200A | 46 storeys, 344 units, sky terraces 09 and 29 |
| 200B | 48 storeys, 360 units, sky terraces 20 and 40 |
| 201A | 49 storeys, 368 units, sky terraces 09 and 29 |
| 201B | 46 storeys, 344 units, sky terraces 22 and 36 |
| 204A | 39 storeys, 304 units |
| 204B | 33 storeys, 256 units |

The earlier V1.4 data had 200B / 201A unit totals swapped, and had incorrect terrace levels for 201A / 201B.

## Reconciliation after correction

- 200A: 344
- 200B: 360
- 201A: 368
- 201B: 344
- 204A: 304
- 204B: 256
- Total: 1,976

Flat-type totals remain:

- 2-Room Flexi Type 1: 172
- 2-Room Flexi Type 2: 644
- 3-Room: 172
- 4-Room: 988

## Per-unit price charts

The three uploaded price charts contain exactly 1,976 numeric sale-unit prices when combined:

- 2-room charts: 816 prices
- 3-room chart: 172 prices
- 4-room chart: 988 prices

Every corrected master unit has exactly one price-chart entry. The frontend stores these as **listed prices from the uploaded Berlayar price charts**.

This wording is deliberate. The app does not silently relabel the uploaded workbooks as an official HDB live feed.

-- Applied to Supabase on 2026-10-02.
-- Source audit corrections against the Berlayar Rise unit-distribution brochure
-- and the uploaded 2R/3R/4R price charts.
-- Scope: riseblock schema only.

update riseblock.blocks
set storeys = 48,
    total_units = 360,
    max_residential_floor = 48,
    terrace_levels = array[20,40]::integer[]
where block_code = '200B';

update riseblock.blocks
set storeys = 49,
    total_units = 368,
    max_residential_floor = 49,
    terrace_levels = array[9,29]::integer[]
where block_code = '201A';

update riseblock.blocks
set storeys = 46,
    total_units = 344,
    max_residential_floor = 46,
    terrace_levels = array[22,36]::integer[]
where block_code = '201B';

delete from riseblock.units u
using riseblock.blocks b
where u.block_id = b.id
  and (
       (b.block_code = '200B' and u.floor = 49)
    or (b.block_code = '201A' and u.floor = 29)
    or (b.block_code = '201B' and u.floor = 36)
  );

insert into riseblock.units
  (block_id, stack_id, floor, stack_no, unit_no, flat_type,
   area_sqm, internal_area_sqm, price_min, price_max, source_ref)
select
  b.id,
  s.id,
  f.floor,
  s.stack_no,
  lpad(f.floor::text,2,'0') || '-' || s.stack_no,
  s.flat_type,
  case s.flat_type when '2R-T1' then 40 when '2R-T2' then 48 when '3R' then 67 when '4R' then 90 end,
  case s.flat_type when '2R-T1' then 38 when '2R-T2' then 46 when '3R' then 64 when '4R' then 86 end,
  case s.flat_type when '2R-T1' then 247000 when '2R-T2' then 296000 when '3R' then 435000 when '4R' then 592000 end,
  case s.flat_type when '2R-T1' then 341000 when '2R-T2' then 406000 when '3R' then 591000 when '4R' then 810000 end,
  s.source_ref
from riseblock.blocks b
join riseblock.stacks s on s.block_id = b.id
join (values
  ('201A',30),
  ('201A',49),
  ('201B',37)
) as f(block_code,floor)
  on f.block_code = b.block_code
on conflict (block_id, floor, stack_no) do nothing;

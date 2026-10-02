-- Berlayar Rise corrected master seed.
-- Use for a fresh/empty riseblock schema. This does not reset community reports.
-- For the existing live database, use migrations instead of rerunning this file blindly.

insert into riseblock.projects
  (code, name, town, launch, classification, total_units)
values
  ('berlayar-rise', 'Berlayar Rise', 'Bukit Merah', 'June 2026 BTO', 'Prime', 1976)
on conflict (code) do update set
  name=excluded.name,
  town=excluded.town,
  launch=excluded.launch,
  classification=excluded.classification,
  total_units=excluded.total_units;

with p as (select id from riseblock.projects where code='berlayar-rise')
insert into riseblock.blocks
(project_id, block_code, storeys, total_units, wait_months, min_residential_floor, max_residential_floor, terrace_levels, roof_garden, ground_amenities, source_ref)
select p.id, v.block_code, v.storeys, v.total_units, v.wait_months, 2, v.max_floor, v.terraces, v.roof_garden, v.amenities, v.source_ref
from p
cross join (values
 ('200A',46,344,54,46,array[9,29]::integer[],false,array[]::text[],'elevation-200'),
 ('200B',48,360,54,48,array[20,40]::integer[],false,array[]::text[],'elevation-200'),
 ('201A',49,368,54,49,array[9,29]::integer[],true,array[]::text[],'elevation-201'),
 ('201B',46,344,49,46,array[22,36]::integer[],true,array['Residents’ Network Centre']::text[],'elevation-201'),
 ('204A',39,304,49,39,array[]::integer[],false,array[]::text[],'elevation-204'),
 ('204B',33,256,49,33,array[]::integer[],true,array[]::text[],'elevation-204')
) v(block_code,storeys,total_units,wait_months,max_floor,terraces,roof_garden,amenities,source_ref)
on conflict (block_code) do update set
  project_id=excluded.project_id,
  storeys=excluded.storeys,
  total_units=excluded.total_units,
  wait_months=excluded.wait_months,
  min_residential_floor=excluded.min_residential_floor,
  max_residential_floor=excluded.max_residential_floor,
  terrace_levels=excluded.terrace_levels,
  roof_garden=excluded.roof_garden,
  ground_amenities=excluded.ground_amenities,
  source_ref=excluded.source_ref;

insert into riseblock.stacks (block_id, stack_no, flat_type, sort_order, source_ref)
select b.id, v.stack_no, v.flat_type, v.sort_order, v.source_ref
from riseblock.blocks b
join (values
 ('200A','101','3R',1,'elevation-200'),('200A','103','3R',2,'elevation-200'),('200A','105','2R-T1',3,'elevation-200'),('200A','107','2R-T1',4,'elevation-200'),
 ('200A','109','4R',5,'elevation-200'),('200A','111','4R',6,'elevation-200'),('200A','113','4R',7,'elevation-200'),('200A','115','4R',8,'elevation-200'),
 ('200B','117','2R-T2',1,'elevation-200'),('200B','119','2R-T2',2,'elevation-200'),('200B','121','2R-T2',3,'elevation-200'),('200B','123','2R-T2',4,'elevation-200'),
 ('200B','125','4R',5,'elevation-200'),('200B','127','4R',6,'elevation-200'),('200B','129','4R',7,'elevation-200'),('200B','131','4R',8,'elevation-200'),
 ('201A','133','2R-T2',1,'elevation-201'),('201A','135','2R-T2',2,'elevation-201'),('201A','137','2R-T2',3,'elevation-201'),('201A','139','2R-T2',4,'elevation-201'),
 ('201A','141','4R',5,'elevation-201'),('201A','143','4R',6,'elevation-201'),('201A','145','4R',7,'elevation-201'),('201A','147','4R',8,'elevation-201'),
 ('201B','149','4R',1,'elevation-201'),('201B','151','4R',2,'elevation-201'),('201B','153','4R',3,'elevation-201'),('201B','155','4R',4,'elevation-201'),
 ('201B','157','2R-T1',5,'elevation-201'),('201B','159','2R-T1',6,'elevation-201'),('201B','161','3R',7,'elevation-201'),('201B','163','3R',8,'elevation-201'),
 ('204A','100','4R',1,'elevation-204'),('204A','102','4R',2,'elevation-204'),('204A','104','4R',3,'elevation-204'),('204A','106','4R',4,'elevation-204'),
 ('204A','108','2R-T2',5,'elevation-204'),('204A','110','2R-T2',6,'elevation-204'),('204A','112','2R-T2',7,'elevation-204'),('204A','114','2R-T2',8,'elevation-204'),
 ('204B','116','4R',1,'elevation-204'),('204B','118','4R',2,'elevation-204'),('204B','120','4R',3,'elevation-204'),('204B','122','4R',4,'elevation-204'),
 ('204B','124','2R-T2',5,'elevation-204'),('204B','126','2R-T2',6,'elevation-204'),('204B','128','2R-T2',7,'elevation-204'),('204B','130','2R-T2',8,'elevation-204')
) v(block_code,stack_no,flat_type,sort_order,source_ref)
on b.block_code=v.block_code
on conflict (block_id,stack_no) do update set
  flat_type=excluded.flat_type,
  sort_order=excluded.sort_order,
  source_ref=excluded.source_ref;

insert into riseblock.units
(block_id, stack_id, floor, stack_no, unit_no, flat_type, area_sqm, internal_area_sqm, price_min, price_max, source_ref)
select
 b.id, s.id, f.floor, s.stack_no,
 lpad(f.floor::text,2,'0')||'-'||s.stack_no,
 s.flat_type,
 case s.flat_type when '2R-T1' then 40 when '2R-T2' then 48 when '3R' then 67 when '4R' then 90 end,
 case s.flat_type when '2R-T1' then 38 when '2R-T2' then 46 when '3R' then 64 when '4R' then 86 end,
 case s.flat_type when '2R-T1' then 247000 when '2R-T2' then 296000 when '3R' then 435000 when '4R' then 592000 end,
 case s.flat_type when '2R-T1' then 341000 when '2R-T2' then 406000 when '3R' then 591000 when '4R' then 810000 end,
 s.source_ref
from riseblock.blocks b
join riseblock.stacks s on s.block_id=b.id
cross join lateral generate_series(b.min_residential_floor,b.max_residential_floor) f(floor)
where not (f.floor=any(b.terrace_levels))
on conflict (block_id,floor,stack_no) do update set
 stack_id=excluded.stack_id,
 unit_no=excluded.unit_no,
 flat_type=excluded.flat_type,
 area_sqm=excluded.area_sqm,
 internal_area_sqm=excluded.internal_area_sqm,
 price_min=excluded.price_min,
 price_max=excluded.price_max,
 source_ref=excluded.source_ref;

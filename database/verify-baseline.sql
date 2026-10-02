-- Read-only baseline verification for Berlayar Rise.
-- Expected after a clean test reset:
--   1 project, 6 blocks, 48 stacks, 1,976 units, 0 report rows.

select 'projects' as object_name, count(*)::int as row_count from riseblock.projects
union all select 'blocks', count(*)::int from riseblock.blocks
union all select 'stacks', count(*)::int from riseblock.stacks
union all select 'units', count(*)::int from riseblock.units
union all select 'unit_reports', count(*)::int from riseblock.unit_reports
union all select 'block_quota_reports', count(*)::int from riseblock.block_quota_reports
union all select 'selection_progress_reports', count(*)::int from riseblock.selection_progress_reports
order by object_name;

select
  b.block_code,
  b.storeys,
  b.total_units as expected_units,
  count(u.id)::int as actual_units,
  b.min_residential_floor,
  b.max_residential_floor,
  b.terrace_levels
from riseblock.blocks b
left join riseblock.units u on u.block_id = b.id
group by b.id
order by b.block_code;

select flat_type, count(*)::int as units
from riseblock.units
group by flat_type
order by flat_type;

-- Should return no rows.
select b.block_code, u.floor, u.stack_no, u.unit_no
from riseblock.units u
join riseblock.blocks b on b.id = u.block_id
where u.floor = any(b.terrace_levels)
   or u.floor < b.min_residential_floor
   or u.floor > b.max_residential_floor
order by b.block_code, u.floor, u.stack_no;

-- Applied to Supabase on 2026-10-02.
-- Performance advisor: add covering indexes for riseblock foreign keys.

create index if not exists blocks_project_id_idx
  on riseblock.blocks(project_id);

create index if not exists units_stack_id_idx
  on riseblock.units(stack_id);

-- Berlayar Rise tracker: RESET TEST DATA ONLY
-- Safe scope: riseblock schema only.
-- Keeps projects, blocks, stacks and the 1,976 master unit rows.
-- Deletes community reports and resets their identity counters.

begin;

select
  (select count(*) from riseblock.unit_reports) as unit_reports_before,
  (select count(*) from riseblock.block_quota_reports) as quota_reports_before,
  (select count(*) from riseblock.selection_progress_reports) as progress_reports_before;

truncate table
  riseblock.unit_reports,
  riseblock.block_quota_reports,
  riseblock.selection_progress_reports
restart identity;

commit;

select
  (select count(*) from riseblock.unit_reports) as unit_reports_after,
  (select count(*) from riseblock.block_quota_reports) as quota_reports_after,
  (select count(*) from riseblock.selection_progress_reports) as progress_reports_after;

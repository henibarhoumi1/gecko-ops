-- Reconciliation after the live-schema snapshot (supabase/DRIFT.md, 3 Nov 2026).
--
-- Production was built by pasting these files into the SQL editor, and 202611010001_videos.sql was left
-- out because videos are switched off live. 202611050001 adds the approver-only guard to video notes only
-- when the video_notes table already exists, so applying the videos file now, after it, would leave video
-- notes without that guard: a viewer or finance login could then approve a video. This adds the guard
-- wherever it is missing. On a database built from every file in order it already exists, and nothing
-- changes.

do $$
begin
  if to_regclass('public.video_notes') is not null and not exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = to_regclass('public.video_notes') and tgname = 'video_notes_role_guard' and not tgisinternal
  ) then
    create trigger video_notes_role_guard before insert on public.video_notes
      for each row execute function public.client_decision_guard();
  end if;
end
$$;

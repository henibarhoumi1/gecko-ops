-- Gecko's banks (Heni, 24 Nov 2026): next to talent and locations, a bank of UGC creators and a bank of gear
-- rental studios, each studio with the gear it rents and the rates. Same table, same rules (team only, the founder
-- and producers delete, trash on delete). Additive: two more kinds and a gear list.

alter table public.studio_roster drop constraint studio_roster_kind_check;
alter table public.studio_roster
  add constraint studio_roster_kind_check check (kind in ('talent', 'location', 'creator', 'studio'));

alter table public.studio_roster
  add column email text not null default '' check (length(email) <= 200),
  add column gear jsonb not null default '[]'::jsonb
    check (jsonb_typeof(gear) = 'array' and jsonb_array_length(gear) <= 100);

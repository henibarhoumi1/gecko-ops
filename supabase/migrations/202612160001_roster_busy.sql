-- Talent availability (Heni, 24 Nov 2026): the days a talent, creator or location is not free, so nobody proposes
-- them for a shoot they can't make. Additive: one list of dates per entry.
alter table public.studio_roster
  add column busy_on date[] not null default '{}' check (cardinality(busy_on) <= 366);

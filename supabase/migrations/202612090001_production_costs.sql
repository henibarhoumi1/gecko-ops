-- Costs and fees next to talent, locations and props (Heni, 24 Nov 2026): transport, gear rental, permits,
-- catering, a studio's fee… Each one is shared with the client in the production tab, approved like the rest
-- and counted in the budget. It is a fourth kind of production option, so every rule (approval, budget,
-- booking, balance invoice) applies unchanged.

alter table public.production_options drop constraint production_options_kind_check;
alter table public.production_options
  add constraint production_options_kind_check check (kind in ('talent', 'location', 'prop', 'cost'));

-- Writing Room, part 1: ten more short-form formats on top of the eighteen styles already allowed.
-- New: street-interview, tutorial, trend, myth-fact, day-in-life, product-only, reaction, brand-film, teaser, portrait.
alter table public.scripts drop constraint scripts_style_check;
alter table public.scripts add constraint scripts_style_check check (style in (
  'problem-fix', 'before-after', 'us-vs-them', 'demo', 'offer',
  'review', 'founder', 'reasons', 'comment-reply', 'bts',
  'pov', 'skit', 'storytime', 'unboxing', 'other',
  'talking-head', 'ugc', 'voiceover',
  'street-interview', 'tutorial', 'trend', 'myth-fact', 'day-in-life',
  'product-only', 'reaction', 'brand-film', 'teaser', 'portrait'
));

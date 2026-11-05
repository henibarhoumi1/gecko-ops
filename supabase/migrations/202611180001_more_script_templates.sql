-- More script templates: proven short-form ad formats on top of the first five.
-- New: us-vs-them, offer, comment-reply, bts, pov, storytime, unboxing. 'demo' and 'skit' come back as templates.
alter table public.scripts drop constraint scripts_style_check;
alter table public.scripts add constraint scripts_style_check check (style in (
  'problem-fix', 'before-after', 'us-vs-them', 'demo', 'offer',
  'review', 'founder', 'reasons', 'comment-reply', 'bts',
  'pov', 'skit', 'storytime', 'unboxing', 'other',
  'talking-head', 'ugc', 'voiceover'
));

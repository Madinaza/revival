-- Fictional prices for a fictional studio.
insert into option_item (kind, code, name, price_cents, color, metalness, roughness, clearcoat, position) values
  ('BASE',   'coupe',          'Revival coupe',  14850000, null,      null, null, null, 0),
  ('PAINT',  'obsidian',       'Obsidian',              0, '#0d0e11', 0.20, 0.34, 1.00, 0),
  ('PAINT',  'ivory',          'Ivory',            180000, '#cfc4ac', 0.00, 0.40, 1.00, 1),
  ('PAINT',  'oxblood',        'Oxblood',          240000, '#3a0508', 0.40, 0.34, 1.00, 2),
  ('PAINT',  'bare-steel',     'Bare steel',       620000, '#70757a', 1.00, 0.42, 0.25, 3),
  ('PAINT',  'aged-brass',     'Aged brass',       780000, '#7a5a26', 1.00, 0.36, 0.60, 4),
  ('FINISH', 'gloss',          'Gloss',                 0, null,      null, null, null, 0),
  ('FINISH', 'satin',          'Satin',            310000, null,      null, null, null, 1),
  ('WHEELS', 'gunmetal',       'Gunmetal',              0, '#2a2b2d', null, 0.34, null, 0),
  ('WHEELS', 'brass',          'Brass',            145000, '#b08a48', null, 0.26, null, 1),
  ('WHEELS', 'polished-steel', 'Polished steel',   195000, '#b8babd', null, 0.14, null, 2);

-- The price of each part on the day a design was saved.
alter table design add column base_cents integer, add column paint_cents integer, add column finish_cents integer, add column wheels_cents integer;
-- Older designs only kept their total. Fill in the parts where today's prices still add up to it, and leave the rest empty.
update design d set base_cents = b.price_cents, paint_cents = p.price_cents, finish_cents = f.price_cents, wheels_cents = w.price_cents
from option_item b, option_item p, option_item f, option_item w
where b.kind = 'BASE' and p.id = d.paint_id and f.id = d.finish_id and w.id = d.wheels_id
  and b.price_cents + p.price_cents + f.price_cents + w.price_cents = d.total_cents;

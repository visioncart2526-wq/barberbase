alter table public.shop_settings
  add column if not exists enable_tip_amount boolean not null default true,
  add column if not exists enable_discount boolean not null default true,
  add column if not exists enable_quantity boolean not null default true;

update public.shop_settings
set
  enable_tip_amount = coalesce(enable_tip_amount, true),
  enable_discount = coalesce(enable_discount, true),
  enable_quantity = coalesce(enable_quantity, true);

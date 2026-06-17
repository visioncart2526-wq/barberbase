create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  default_commission_rate numeric(5,4) not null default 0.5000 check (default_commission_rate >= 0 and default_commission_rate <= 1),
  start_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'barber' check (role in ('owner', 'admin', 'manager', 'barber')),
  barber_id uuid references public.barbers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Cuts',
  price numeric(10,2) not null check (price >= 0),
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_at timestamptz not null default now(),
  barber_id uuid not null references public.barbers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  customer_name text,
  quantity integer not null default 1 check (quantity > 0),
  gross_amount numeric(10,2) not null check (gross_amount >= 0),
  discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  tip_amount numeric(10,2) not null default 0 check (tip_amount >= 0),
  payment_method text not null check (payment_method in ('cash', 'debit', 'credit', 'e-transfer', 'gift card', 'other')),
  commission_rate numeric(5,4) not null check (commission_rate >= 0 and commission_rate <= 1),
  barber_commission numeric(10,2) not null check (barber_commission >= 0),
  shop_share numeric(10,2) not null check (shop_share >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null,
  vendor text not null,
  amount numeric(10,2) not null check (amount >= 0),
  payment_method text not null check (payment_method in ('cash', 'debit', 'credit', 'e-transfer', 'gift card', 'other')),
  recurring boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_settings (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null default 'Nonoy Masing',
  tax_rate numeric(5,4) not null default 0.0000 check (tax_rate >= 0 and tax_rate <= 1),
  default_commission_rate numeric(5,4) not null default 0.5000 check (default_commission_rate >= 0 and default_commission_rate <= 1),
  tip_policy text not null default 'barber_keeps_all' check (tip_policy in ('barber_keeps_all', 'shop_split', 'pooled')),
  currency text not null default 'USD',
  business_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_barber_id on public.profiles(barber_id);
create index if not exists idx_barbers_status on public.barbers(status);
create index if not exists idx_services_active on public.services(active);
create index if not exists idx_transactions_at on public.transactions(transaction_at);
create index if not exists idx_transactions_barber_id on public.transactions(barber_id);
create index if not exists idx_transactions_service_id on public.transactions(service_id);
create index if not exists idx_expenses_date on public.expenses(expense_date);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_barbers_updated_at on public.barbers;
create trigger set_barbers_updated_at before update on public.barbers
for each row execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists set_shop_settings_updated_at on public.shop_settings;
create trigger set_shop_settings_updated_at before update on public.shop_settings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'barber')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_barber_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select barber_id from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.transactions enable row level security;
alter table public.expenses enable row level security;
alter table public.shop_settings enable row level security;

drop policy if exists "profiles_select_role_aware" on public.profiles;
create policy "profiles_select_role_aware" on public.profiles
for select to authenticated
using (id = auth.uid() or public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_role_aware" on public.profiles;
create policy "profiles_update_role_aware" on public.profiles
for update to authenticated
using (id = auth.uid() or public.current_user_role() in ('owner', 'admin'))
with check (id = auth.uid() or public.current_user_role() in ('owner', 'admin'));

drop policy if exists "barbers_select_role_aware" on public.barbers;
create policy "barbers_select_role_aware" on public.barbers
for select to authenticated
using (public.current_user_role() in ('owner', 'admin', 'manager') or id = public.current_user_barber_id());

drop policy if exists "barbers_manage_staff" on public.barbers;
create policy "barbers_manage_staff" on public.barbers
for all to authenticated
using (public.current_user_role() in ('owner', 'admin', 'manager'))
with check (public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "services_select_authenticated" on public.services;
create policy "services_select_authenticated" on public.services
for select to authenticated
using (true);

drop policy if exists "services_manage_staff" on public.services;
create policy "services_manage_staff" on public.services
for all to authenticated
using (public.current_user_role() in ('owner', 'admin', 'manager'))
with check (public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "transactions_select_role_aware" on public.transactions;
create policy "transactions_select_role_aware" on public.transactions
for select to authenticated
using (public.current_user_role() in ('owner', 'admin', 'manager') or barber_id = public.current_user_barber_id());

drop policy if exists "transactions_manage_staff" on public.transactions;
create policy "transactions_manage_staff" on public.transactions
for all to authenticated
using (public.current_user_role() in ('owner', 'admin', 'manager'))
with check (public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "expenses_select_staff" on public.expenses;
create policy "expenses_select_staff" on public.expenses
for select to authenticated
using (public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "expenses_manage_staff" on public.expenses;
create policy "expenses_manage_staff" on public.expenses
for all to authenticated
using (public.current_user_role() in ('owner', 'admin', 'manager'))
with check (public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "shop_settings_select_authenticated" on public.shop_settings;
create policy "shop_settings_select_authenticated" on public.shop_settings
for select to authenticated
using (true);

drop policy if exists "shop_settings_manage_admin" on public.shop_settings;
create policy "shop_settings_manage_admin" on public.shop_settings
for all to authenticated
using (public.current_user_role() in ('owner', 'admin'))
with check (public.current_user_role() in ('owner', 'admin'));

insert into public.shop_settings (
  id,
  shop_name,
  tax_rate,
  default_commission_rate,
  tip_policy,
  currency,
  business_hours
) values (
  '10000000-0000-4000-8000-000000000001',
  'Nonoy Masing',
  0.0000,
  0.5000,
  'barber_keeps_all',
  'USD',
  '{
    "monday": "9:00 AM - 6:00 PM",
    "tuesday": "9:00 AM - 6:00 PM",
    "wednesday": "9:00 AM - 6:00 PM",
    "thursday": "9:00 AM - 7:00 PM",
    "friday": "9:00 AM - 7:00 PM",
    "saturday": "9:00 AM - 5:00 PM",
    "sunday": "Closed"
  }'::jsonb
) on conflict (id) do update set
  shop_name = excluded.shop_name,
  tax_rate = excluded.tax_rate,
  default_commission_rate = excluded.default_commission_rate,
  tip_policy = excluded.tip_policy,
  currency = excluded.currency,
  business_hours = excluded.business_hours;

insert into public.barbers (id, name, phone, email, status, default_commission_rate, start_date, notes) values
('20000000-0000-4000-8000-000000000001', 'Marcus Reed', '555-0101', 'marcus@example.com', 'active', 0.5500, current_date - interval '420 days', 'Senior barber and fade specialist'),
('20000000-0000-4000-8000-000000000002', 'Elena Cruz', '555-0102', 'elena@example.com', 'active', 0.5000, current_date - interval '260 days', 'Strong beard and shave sales'),
('20000000-0000-4000-8000-000000000003', 'Andre Brooks', '555-0103', 'andre@example.com', 'active', 0.4500, current_date - interval '120 days', 'Growing weekend book')
on conflict (id) do update set
  name = excluded.name,
  phone = excluded.phone,
  email = excluded.email,
  status = excluded.status,
  default_commission_rate = excluded.default_commission_rate,
  start_date = excluded.start_date,
  notes = excluded.notes;

insert into public.services (id, name, category, price, duration_minutes, active, description) values
('30000000-0000-4000-8000-000000000001', 'Haircut', 'Cuts', 35.00, 30, true, 'Classic haircut and style'),
('30000000-0000-4000-8000-000000000002', 'Skin fade', 'Cuts', 45.00, 45, true, 'Tight fade with finished style'),
('30000000-0000-4000-8000-000000000003', 'Beard trim', 'Beard', 18.00, 20, true, 'Shape, trim, and line-up'),
('30000000-0000-4000-8000-000000000004', 'Haircut + beard', 'Combo', 55.00, 60, true, 'Haircut with beard service'),
('30000000-0000-4000-8000-000000000005', 'Kids cut', 'Cuts', 25.00, 25, true, 'Cut for children under 12'),
('30000000-0000-4000-8000-000000000006', 'Senior cut', 'Cuts', 28.00, 25, true, 'Senior haircut'),
('30000000-0000-4000-8000-000000000007', 'Hot towel shave', 'Shave', 40.00, 40, true, 'Traditional hot towel shave'),
('30000000-0000-4000-8000-000000000008', 'Line-up', 'Finish', 15.00, 15, true, 'Clean hairline finish')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  price = excluded.price,
  duration_minutes = excluded.duration_minutes,
  active = excluded.active,
  description = excluded.description;

insert into public.transactions (
  id, transaction_at, barber_id, service_id, customer_name, quantity, gross_amount,
  discount_amount, tip_amount, payment_method, commission_rate, barber_commission, shop_share, notes
) values
('40000000-0000-4000-8000-000000000001', now() - interval '1 hour', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'Jordan', 1, 45.00, 0, 8.00, 'credit', 0.5500, 24.75, 20.25, null),
('40000000-0000-4000-8000-000000000002', now() - interval '2 hours', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', 'Sam', 1, 55.00, 0, 10.00, 'debit', 0.5000, 27.50, 27.50, null),
('40000000-0000-4000-8000-000000000003', now() - interval '3 hours', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'Lee', 1, 35.00, 0, 5.00, 'cash', 0.4500, 15.75, 19.25, null),
('40000000-0000-4000-8000-000000000004', now() - interval '1 day', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000007', 'Chris', 1, 40.00, 0, 7.00, 'credit', 0.5500, 22.00, 18.00, null),
('40000000-0000-4000-8000-000000000005', now() - interval '2 days', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 'Taylor', 2, 36.00, 0, 6.00, 'cash', 0.5000, 18.00, 18.00, null),
('40000000-0000-4000-8000-000000000006', now() - interval '3 days', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005', 'Morgan', 1, 25.00, 0, 4.00, 'debit', 0.4500, 11.25, 13.75, null),
('40000000-0000-4000-8000-000000000007', now() - interval '4 days', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', 'Riley', 1, 50.00, 5.00, 9.00, 'e-transfer', 0.5500, 27.50, 22.50, 'Loyalty discount'),
('40000000-0000-4000-8000-000000000008', now() - interval '5 days', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Jamie', 1, 35.00, 0, 5.00, 'credit', 0.5000, 17.50, 17.50, null),
('40000000-0000-4000-8000-000000000009', now() - interval '6 days', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000008', 'Avery', 1, 15.00, 0, 3.00, 'cash', 0.4500, 6.75, 8.25, null),
('40000000-0000-4000-8000-000000000010', now() - interval '7 days', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'Casey', 1, 45.00, 0, 8.00, 'gift card', 0.5500, 24.75, 20.25, null),
('40000000-0000-4000-8000-000000000011', now() - interval '8 days', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000006', 'Pat', 1, 28.00, 0, 4.00, 'debit', 0.5000, 14.00, 14.00, null),
('40000000-0000-4000-8000-000000000012', now() - interval '9 days', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'Drew', 1, 35.00, 0, 6.00, 'credit', 0.4500, 15.75, 19.25, null),
('40000000-0000-4000-8000-000000000013', now() - interval '10 days', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', 'Robin', 1, 55.00, 0, 11.00, 'cash', 0.5500, 30.25, 24.75, null),
('40000000-0000-4000-8000-000000000014', now() - interval '11 days', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000007', 'Quinn', 1, 40.00, 0, 7.00, 'credit', 0.5000, 20.00, 20.00, null),
('40000000-0000-4000-8000-000000000015', now() - interval '12 days', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'Alex', 1, 18.00, 0, 3.00, 'other', 0.4500, 8.10, 9.90, null),
('40000000-0000-4000-8000-000000000016', now() - interval '13 days', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Cameron', 2, 70.00, 0, 12.00, 'debit', 0.5500, 38.50, 31.50, null),
('40000000-0000-4000-8000-000000000017', now() - interval '14 days', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Emerson', 1, 40.00, 5.00, 6.00, 'credit', 0.5000, 20.00, 20.00, 'Promo discount'),
('40000000-0000-4000-8000-000000000018', now() - interval '15 days', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005', 'Finley', 1, 25.00, 0, 5.00, 'cash', 0.4500, 11.25, 13.75, null),
('40000000-0000-4000-8000-000000000019', now() - interval '16 days', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000007', 'Harper', 1, 40.00, 0, 8.00, 'credit', 0.5500, 22.00, 18.00, null),
('40000000-0000-4000-8000-000000000020', now() - interval '17 days', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', 'Rowan', 1, 55.00, 0, 10.00, 'debit', 0.5000, 27.50, 27.50, null)
on conflict (id) do nothing;

insert into public.expenses (id, expense_date, category, vendor, amount, payment_method, recurring, notes) values
('50000000-0000-4000-8000-000000000001', current_date - interval '1 day', 'Rent', 'Main Street Properties', 2600.00, 'e-transfer', true, 'Monthly lease'),
('50000000-0000-4000-8000-000000000002', current_date - interval '2 days', 'Utilities', 'City Power', 310.00, 'debit', true, 'Power and water'),
('50000000-0000-4000-8000-000000000003', current_date - interval '3 days', 'Supplies', 'Barber Supply Co.', 420.50, 'credit', false, 'Blades, capes, disinfectant'),
('50000000-0000-4000-8000-000000000004', current_date - interval '5 days', 'Cleaning', 'Sparkle Cleaning', 180.00, 'debit', true, 'Weekly cleaning'),
('50000000-0000-4000-8000-000000000005', current_date - interval '6 days', 'Repairs and maintenance', 'FixIt HVAC', 225.00, 'credit', false, 'Chair maintenance'),
('50000000-0000-4000-8000-000000000006', current_date - interval '8 days', 'Products', 'Grooming Wholesale', 360.75, 'credit', false, 'Pomade and beard oil'),
('50000000-0000-4000-8000-000000000007', current_date - interval '10 days', 'Software/subscriptions', 'Booking Platform', 89.00, 'credit', true, 'Monthly booking software'),
('50000000-0000-4000-8000-000000000008', current_date - interval '11 days', 'Marketing', 'Local Ads', 150.00, 'debit', false, 'Neighborhood campaign'),
('50000000-0000-4000-8000-000000000009', current_date - interval '12 days', 'Insurance', 'Shop Insurance Inc.', 240.00, 'e-transfer', true, 'Liability policy'),
('50000000-0000-4000-8000-000000000010', current_date - interval '14 days', 'Miscellaneous', 'Hardware Store', 64.20, 'cash', false, 'Small tools')
on conflict (id) do nothing;

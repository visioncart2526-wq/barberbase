# BarberBase

Production-ready MVP for a barbershop operations dashboard built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- Supabase email/password authentication
- Protected dashboard routes with role-aware navigation
- Owner/admin, manager, and barber role support
- KPI dashboard with charts for sales, barbers, expenses, and payment methods
- CRUD modules for barbers, services, transactions, and expenses
- Barber-only visibility for personal transactions and performance
- Reports with date range, barber, payment method filters, and CSV export
- Barber performance rankings and income summaries
- Shop settings for tax, commission, currency, tip policy, and business hours
- Supabase PostgreSQL schema with foreign keys, indexes, triggers, RLS policies, and seed data
- Vercel-ready configuration

## Tech Stack

- Next.js `16.2.7`
- React `19.2.4`
- TypeScript
- Tailwind CSS v4
- Supabase Auth and PostgreSQL
- Supabase Row Level Security
- Recharts
- Lucide icons

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from the example:

```bash
cp .env.example .env.local
```

3. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Start the app:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Supabase Setup

1. Create a Supabase project.
2. In Supabase Dashboard, go to **SQL Editor**.
3. Run the full SQL file:

```text
supabase/schema.sql
```

This creates:

- `profiles`
- `barbers`
- `services`
- `transactions`
- `expenses`
- `shop_settings`

It also creates indexes, update triggers, auth profile trigger, RLS helper functions, RLS policies, and sample data.

## Creating Users And Roles

Create users from **Authentication > Users** or through the app login flow once email/password auth is enabled.

New users are automatically inserted into `profiles` as `barber`. To promote your first owner, run:

```sql
update public.profiles
set role = 'owner', full_name = 'Owner Name'
where id = 'AUTH_USER_UUID';
```

For a barber account, link the profile to a barber record:

```sql
update public.profiles
set role = 'barber',
    barber_id = 'BARBER_UUID'
where id = 'AUTH_USER_UUID';
```

Valid roles:

- `owner`
- `admin`
- `manager`
- `barber`

## Row Level Security Summary

- Owners/admins can access all data and settings.
- Managers can manage barbers, services, transactions, expenses, and reports.
- Barbers can only view their linked barber record, their own transactions, and their own performance.
- Shop settings are readable by authenticated users and editable by owners/admins.

## Seed Data

The schema includes:

- 3 barbers
- 8 services
- 20 transactions
- 10 expenses
- Default shop settings

The seed IDs are fixed, so the schema can be rerun without duplicating the core seeded records.

## Vercel Deployment

1. Push this repository to GitHub.
2. Import the project in Vercel.
3. Add environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

4. Deploy.

The default Vercel build command is:

```bash
npm run build
```

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Notes

- This app uses real Supabase reads/writes. It does not fall back to mock data.
- Use Supabase RLS as the final authorization boundary.
- For production, configure Supabase email templates, allowed redirect URLs, and password policies in the Supabase dashboard.

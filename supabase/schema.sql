-- Kontrola — esquema de Supabase
-- Cómo usarlo: Supabase → SQL Editor → New query → pega este archivo completo → Run.
-- Se puede correr más de una vez sin romper nada.
--
-- Cada fila pertenece a un usuario (user_id) y las políticas RLS hacen que
-- cada persona solo pueda leer y escribir lo suyo.

-- Ajustes de la app (una fila por usuario)
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  opening_balance bigint not null default 0,
  monthly_budget bigint,
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  theme_chosen boolean not null default false,
  onboarded boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Categorías de gastos e ingresos
create table if not exists public.categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  icon text not null default 'ellipsis',
  color text not null default '#a3a3a3',
  kind text not null check (kind in ('expense', 'income')),
  budget bigint not null default 0,
  archived boolean not null default false,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Movimientos: gastos, ingresos y ajustes de saldo (montos en pesos enteros)
create table if not exists public.transactions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  type text not null check (type in ('expense', 'income', 'adjustment')),
  amount bigint not null,
  category_id text,
  note text not null default '',
  date date not null,
  created_ms bigint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, date);

-- updated_at se actualiza solo en cada cambio
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists transactions_updated_at on public.transactions;
create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- Seguridad: cada usuario ve y modifica solo sus filas
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "Solo mis ajustes" on public.settings;
create policy "Solo mis ajustes" on public.settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Solo mis categorías" on public.categories;
create policy "Solo mis categorías" on public.categories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Solo mis movimientos" on public.transactions;
create policy "Solo mis movimientos" on public.transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

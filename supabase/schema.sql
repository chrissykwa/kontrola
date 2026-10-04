-- Kontrola — esquema de Supabase
-- Cómo usarlo: Supabase → SQL Editor → New query → pega este archivo completo → Run.
-- Se puede correr más de una vez sin romper nada.
--
-- Privacidad:
--  * RLS: cada usuario solo puede leer y escribir sus propias filas.
--  * Cifrado de extremo a extremo: los datos van en la columna `payload`, cifrados en el
--    dispositivo del usuario (AES-GCM). Ni el dueño del proyecto puede leerlos.
--    Las columnas en texto plano quedan vacías; solo existen para datos antiguos que la
--    app cifra automáticamente la primera vez que el usuario la abre.
--  * Lo único visible para el dueño: correo, fechas de registro e inicio de sesión,
--    cantidad de movimientos y cuándo se modificaron (updated_at).

-- Ajustes de la app (una fila por usuario)
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  payload text,
  opening_balance bigint default 0,
  monthly_budget bigint,
  theme text default 'light' check (theme in ('light', 'dark', 'system')),
  theme_chosen boolean default false,
  onboarded boolean default false,
  updated_at timestamptz not null default now()
);

-- Categorías de gastos e ingresos
create table if not exists public.categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  payload text,
  name text,
  icon text default 'ellipsis',
  color text default '#a3a3a3',
  kind text check (kind in ('expense', 'income')),
  budget bigint default 0,
  archived boolean default false,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Movimientos: gastos, ingresos y ajustes de saldo
create table if not exists public.transactions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  payload text,
  type text check (type in ('expense', 'income', 'adjustment')),
  amount bigint,
  category_id text,
  note text default '',
  date date,
  created_ms bigint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, date);

-- Llave de datos de cada usuario, envuelta (cifrada) con su contraseña y con su
-- código de recuperación. Sin uno de los dos, no se puede abrir.
create table if not exists public.user_keys (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  password_salt text not null,
  password_wrapped text not null,
  password_iterations integer not null,
  recovery_salt text not null,
  recovery_wrapped text not null,
  recovery_iterations integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Para proyectos creados con la versión anterior de este archivo
alter table public.settings add column if not exists payload text;
alter table public.categories add column if not exists payload text;
alter table public.transactions add column if not exists payload text;
alter table public.settings alter column opening_balance drop not null;
alter table public.settings alter column theme drop not null;
alter table public.settings alter column theme_chosen drop not null;
alter table public.settings alter column onboarded drop not null;
alter table public.categories alter column name drop not null;
alter table public.categories alter column icon drop not null;
alter table public.categories alter column color drop not null;
alter table public.categories alter column kind drop not null;
alter table public.categories alter column budget drop not null;
alter table public.categories alter column archived drop not null;
alter table public.transactions alter column type drop not null;
alter table public.transactions alter column amount drop not null;
alter table public.transactions alter column note drop not null;
alter table public.transactions alter column date drop not null;

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

drop trigger if exists user_keys_updated_at on public.user_keys;
create trigger user_keys_updated_at before update on public.user_keys
  for each row execute function public.set_updated_at();

-- Seguridad: cada usuario ve y modifica solo sus filas
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.user_keys enable row level security;

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

drop policy if exists "Solo mis llaves" on public.user_keys;
create policy "Solo mis llaves" on public.user_keys
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Para el dueño del proyecto (SQL Editor): quién usa la app, sin ver sus datos.
-- select u.email, u.created_at::date as creado, u.last_sign_in_at as ultimo_inicio,
--        (select count(*) from public.transactions t where t.user_id = u.id) as movimientos,
--        (select max(t.updated_at) from public.transactions t where t.user_id = u.id) as ultima_actividad
-- from auth.users u order by u.created_at;

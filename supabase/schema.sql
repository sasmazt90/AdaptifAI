create table if not exists public.credit_accounts (
  user_id text primary key,
  credits integer not null default 0 check (credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id bigserial primary key,
  user_id text not null references public.credit_accounts(user_id) on delete cascade,
  delta integer not null,
  balance_after integer not null check (balance_after >= 0),
  reason text not null default 'manual',
  actor_email text,
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_created_idx
  on public.credit_transactions (user_id, created_at desc);

alter table public.credit_accounts enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.credit_accounts force row level security;
alter table public.credit_transactions force row level security;

revoke all on public.credit_accounts from anon, authenticated;
revoke all on public.credit_transactions from anon, authenticated;
revoke all on sequence public.credit_transactions_id_seq from anon, authenticated;

grant select on public.credit_accounts to authenticated;
grant select on public.credit_transactions to authenticated;

drop policy if exists "Users can read own credit account" on public.credit_accounts;
create policy "Users can read own credit account"
  on public.credit_accounts
  for select
  to authenticated
  using (lower(user_id) = lower((select auth.email())));

drop policy if exists "Users can read own credit transactions" on public.credit_transactions;
create policy "Users can read own credit transactions"
  on public.credit_transactions
  for select
  to authenticated
  using (lower(user_id) = lower((select auth.email())));

create or replace function public.adjust_credits(
  p_user_id text,
  p_delta integer,
  p_actor_email text,
  p_reason text,
  p_stripe_session_id text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_user text := lower(trim(p_user_id));
  existing_balance integer;
  new_balance integer;
begin
  if normalized_user = '' then
    raise exception 'user_id is required';
  end if;

  if p_stripe_session_id is not null and exists (
    select 1 from public.credit_transactions where stripe_session_id = p_stripe_session_id
  ) then
    select credits into existing_balance from public.credit_accounts where user_id = normalized_user;
    return coalesce(existing_balance, 0);
  end if;

  insert into public.credit_accounts (user_id, credits)
  values (normalized_user, 240)
  on conflict (user_id) do nothing;

  select credits into existing_balance
  from public.credit_accounts
  where user_id = normalized_user
  for update;

  new_balance := existing_balance + p_delta;
  if new_balance < 0 then
    raise exception 'insufficient credits';
  end if;

  update public.credit_accounts
  set credits = new_balance, updated_at = now()
  where user_id = normalized_user;

  insert into public.credit_transactions (user_id, delta, balance_after, reason, actor_email, stripe_session_id)
  values (normalized_user, p_delta, new_balance, coalesce(p_reason, 'manual'), lower(p_actor_email), p_stripe_session_id);

  return new_balance;
end;
$$;

revoke all on function public.adjust_credits(text, integer, text, text, text) from public;
revoke all on function public.adjust_credits(text, integer, text, text, text) from anon;
revoke all on function public.adjust_credits(text, integer, text, text, text) from authenticated;
grant execute on function public.adjust_credits(text, integer, text, text, text) to service_role;

create table if not exists instance_settings (
  id text primary key,
  setup_completed_at timestamptz,
  first_admin_user_id text,
  signup_policy text not null default 'invite_only',
  signup_secret_hash text,
  public_app_locked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table instance_settings
  add column if not exists setup_completed_at timestamptz;
alter table instance_settings
  add column if not exists first_admin_user_id text;
alter table instance_settings
  add column if not exists signup_policy text not null default 'invite_only';
alter table instance_settings
  add column if not exists signup_secret_hash text;
alter table instance_settings
  add column if not exists public_app_locked boolean not null default true;
alter table instance_settings
  add column if not exists created_at timestamptz not null default now();
alter table instance_settings
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table instance_settings
    add constraint instance_settings_signup_policy_check
    check (signup_policy in ('invite_only', 'shared_secret', 'open'));
exception
  when duplicate_object then null;
end
$$;

insert into instance_settings (
  id,
  signup_policy,
  public_app_locked
)
values (
  'default',
  'invite_only',
  true
)
on conflict (id) do nothing;

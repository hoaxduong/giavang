-- 0008_automation_system.sql

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null, -- 'gold_price_post', etc.
  schedule text not null, -- Cron expression
  prompt_template text, -- Helper for AI generation
  config jsonb default '{}'::jsonb, -- configuration (category, tags, etc)
  is_active boolean default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table automations enable row level security;

create policy "Admins can manage automations"
  on automations
  for all
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- Function to update updated_at
create trigger update_automations_updated_at
  before update on automations
  for each row
  execute function update_updated_at_column();

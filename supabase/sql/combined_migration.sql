-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create projects table
create table if not exists projects (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    description text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    user_id uuid references auth.users(id) on delete cascade,
    members uuid[] default array[]::uuid[],
    tags text[] default array[]::text[],
    status text default 'Todo',
    due_date timestamptz,
    priority text default 'Medium',
    category text
);

-- Enable RLS
alter table projects enable row level security;

-- Create policies
create policy "Users can read their own projects and projects they are members of"
    on projects for select
    using (
        auth.uid() = user_id 
        or auth.uid() = any(members)
    );

create policy "Project owners can update their projects"
    on projects for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Project owners can delete their projects"
    on projects for delete
    using (auth.uid() = user_id);

create policy "Users can insert projects"
    on projects for insert
    with check (auth.uid() = user_id);

-- Create indexes
create index if not exists projects_user_id_idx on projects(user_id);
create index if not exists projects_members_idx on projects using gin(members);

-- Create updated_at trigger function
create or replace function handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger
drop trigger if exists set_updated_at on projects;
create trigger set_updated_at
    before update on projects
    for each row
    execute function handle_updated_at();

-- Create get_projects_for_user function
create or replace function get_projects_for_user(user_id uuid)
returns table (
    id uuid,
    title text,
    description text,
    created_at timestamptz,
    updated_at timestamptz,
    user_id uuid,
    members text[],
    tags text[],
    status text,
    due_date timestamptz,
    priority text,
    category text
) as $$
begin
    return query
    select 
        p.id,
        p.title,
        p.description,
        p.created_at,
        p.updated_at,
        p.user_id,
        p.members::text[],
        p.tags,
        p.status,
        p.due_date,
        p.priority,
        p.category
    from projects p
    where 
        p.user_id = user_id 
        or user_id = any(p.members)
    order by p.created_at desc;
end;
$$ language plpgsql security definer;
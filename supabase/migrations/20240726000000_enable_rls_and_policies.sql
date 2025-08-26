-- 1. Enable RLS on the 'projects' table
alter table public.projects enable row level security;

-- 2. Create a policy that allows authenticated users to see all projects
-- if they are an admin, otherwise they can only see their own.
create policy "Allow all access to admins, and user-specific for others"
on public.projects
for select
to authenticated
using (
  (auth.uid() = user_id) OR
  (auth.email() = 'eabarragang@ingenes.com') OR
  (auth.email() = 'ntorres@ingenes.com')
);

-- 3. Create a policy that allows users to insert their own projects.
create policy "Allow users to insert their own projects"
on public.projects
for insert
to authenticated
with check (
  auth.uid() = user_id
);

-- 4. Create a policy that allows users to update their own projects.
create policy "Allow users to update their own projects"
on public.projects
for update
to authenticated
using (
  auth.uid() = user_id
);

-- 5. Create a policy that allows users to delete their own projects.
create policy "Allow users to delete their own projects"
on public.projects
for delete
to authenticated
using (
  auth.uid() = user_id
);


-- TASKS TABLE POLICIES --

-- 6. Enable RLS on the 'tasks' table
alter table public.tasks enable row level security;

-- 7. Create a policy for SELECT operations on tasks
create policy "Allow all access to admins, and user-specific for others on tasks"
on public.tasks
for select
to authenticated
using (
  (auth.uid() = user_id) OR
  (auth.email() = 'eabarragang@ingenes.com') OR
  (auth.email() = 'ntorres@ingenes.com')
);

-- 8. Create a policy for INSERT operations on tasks
create policy "Allow users to insert their own tasks"
on public.tasks
for insert
to authenticated
with check (
  auth.uid() = user_id
);

-- 9. Create a policy for UPDATE operations on tasks
create policy "Allow users to update their own tasks"
on public.tasks
for update
to authenticated
using (
  auth.uid() = user_id
);

-- 10. Create a policy for DELETE operations on tasks
create policy "Allow users to delete their own tasks"
on public.tasks
for delete
to authenticated
using (
  auth.uid() = user_id
);

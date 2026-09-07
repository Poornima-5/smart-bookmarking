-- Bookmarks table: Supabase/Postgres is the application's source of truth.
-- Qdrant remains a derived semantic index keyed off bookmarks.id (added in a later checkpoint).

create table if not exists bookmarks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,

    url text not null,
    normalized_url text not null,
    title text not null,
    description text,
    raw_content text,

    summary text,
    tags text[],
    category text,

    status text not null default 'pending'
        check (status in ('pending', 'processing', 'completed', 'failed')),
    error_message text,

    duplicate_of uuid references bookmarks(id) on delete set null,
    duplicate_score real,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint bookmarks_user_normalized_url_key unique (user_id, normalized_url)
);

create index if not exists bookmarks_user_created_idx
    on bookmarks (user_id, created_at desc);

create index if not exists bookmarks_user_status_idx
    on bookmarks (user_id, status);

-- Keep updated_at accurate without relying on every call site to set it.
create or replace function set_bookmarks_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists bookmarks_set_updated_at on bookmarks;

create trigger bookmarks_set_updated_at
    before update on bookmarks
    for each row
    execute function set_bookmarks_updated_at();

alter table bookmarks enable row level security;

create policy "bookmarks_select_own" on bookmarks
    for select using (user_id = auth.uid());

create policy "bookmarks_insert_own" on bookmarks
    for insert with check (user_id = auth.uid());

create policy "bookmarks_update_own" on bookmarks
    for update using (user_id = auth.uid());

create policy "bookmarks_delete_own" on bookmarks
    for delete using (user_id = auth.uid());

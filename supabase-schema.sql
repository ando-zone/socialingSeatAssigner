-- 모임 테이블
create table public.meetings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  current_round integer default 1 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 참가자 테이블
create table public.participants (
  id text primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  name text not null,
  gender text check (gender in ('male', 'female')) not null,
  mbti text check (mbti in ('extrovert', 'introvert')) not null,
  meetings_by_round jsonb default '{}' not null,
  all_met_people text[] default array[]::text[] not null,
  group_history integer[] default array[]::integer[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 그룹 배치 결과 테이블
create table public.grouping_results (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  round integer not null,
  groups jsonb not null,
  summary jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 이탈 참가자 테이블
create table public.exited_participants (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  participant_id text not null,
  name text not null,
  gender text check (gender in ('male', 'female')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 그룹 설정 테이블
create table public.group_settings (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  grouping_mode text check (grouping_mode in ('auto', 'manual')) not null,
  group_size integer default 4 not null,
  num_groups integer default 6 not null,
  custom_group_sizes integer[] default array[]::integer[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 스냅샷 테이블
create table public.snapshots (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  snapshot_id integer not null,
  event_type text not null,
  description text not null,
  data jsonb not null,
  timestamp timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) 정책 활성화
alter table public.meetings enable row level security;
alter table public.participants enable row level security;
alter table public.grouping_results enable row level security;
alter table public.exited_participants enable row level security;
alter table public.group_settings enable row level security;
alter table public.snapshots enable row level security;

-- 모임 테이블 RLS 정책
create policy "Users can view their own meetings" on public.meetings
  for select using (auth.uid() = user_id);

create policy "Users can insert their own meetings" on public.meetings
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own meetings" on public.meetings
  for update using (auth.uid() = user_id);

create policy "Users can delete their own meetings" on public.meetings
  for delete using (auth.uid() = user_id);

-- 참가자 테이블 RLS 정책
create policy "Users can view participants of their meetings" on public.participants
  for select using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can insert participants to their meetings" on public.participants
  for insert with check (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can update participants of their meetings" on public.participants
  for update using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can delete participants of their meetings" on public.participants
  for delete using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

-- 그룹 배치 결과 테이블 RLS 정책
create policy "Users can view grouping results of their meetings" on public.grouping_results
  for select using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can insert grouping results to their meetings" on public.grouping_results
  for insert with check (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can update grouping results of their meetings" on public.grouping_results
  for update using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can delete grouping results of their meetings" on public.grouping_results
  for delete using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

-- 이탈 참가자 테이블 RLS 정책
create policy "Users can view exited participants of their meetings" on public.exited_participants
  for select using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can insert exited participants to their meetings" on public.exited_participants
  for insert with check (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can update exited participants of their meetings" on public.exited_participants
  for update using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can delete exited participants of their meetings" on public.exited_participants
  for delete using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

-- 그룹 설정 테이블 RLS 정책
create policy "Users can view group settings of their meetings" on public.group_settings
  for select using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can insert group settings to their meetings" on public.group_settings
  for insert with check (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can update group settings of their meetings" on public.group_settings
  for update using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can delete group settings of their meetings" on public.group_settings
  for delete using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

-- 스냅샷 테이블 RLS 정책
create policy "Users can view snapshots of their meetings" on public.snapshots
  for select using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can insert snapshots to their meetings" on public.snapshots
  for insert with check (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can update snapshots of their meetings" on public.snapshots
  for update using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

create policy "Users can delete snapshots of their meetings" on public.snapshots
  for delete using (
    meeting_id in (
      select id from public.meetings where user_id = auth.uid()
    )
  );

-- 인덱스 생성 (성능 최적화)
create index idx_meetings_user_id on public.meetings(user_id);
create index idx_participants_meeting_id on public.participants(meeting_id);
create index idx_grouping_results_meeting_id on public.grouping_results(meeting_id);
create index idx_exited_participants_meeting_id on public.exited_participants(meeting_id);
create index idx_group_settings_meeting_id on public.group_settings(meeting_id);
create index idx_snapshots_meeting_id on public.snapshots(meeting_id);
create index idx_snapshots_snapshot_id on public.snapshots(meeting_id, snapshot_id);

-- updated_at 자동 업데이트 함수
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- updated_at 트리거 생성
create trigger set_updated_at_meetings
  before update on public.meetings
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_participants
  before update on public.participants
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_grouping_results
  before update on public.grouping_results
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_group_settings
  before update on public.group_settings
  for each row execute function public.handle_updated_at(); 
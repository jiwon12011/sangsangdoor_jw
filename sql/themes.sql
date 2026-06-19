-- ============================================================
-- 상상의 문 — themes 테이블
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 RUN 하세요.
-- (관리자에서 추가·수정·삭제한 테마를 사이트에 반영하기 위한 공용 저장소)
-- ============================================================

create table if not exists public.themes (
  id        text primary key,          -- "지점|테마명"
  branch    text not null,             -- 지점
  name      text not null,             -- 테마명
  genre     text,                      -- 장르
  diff      int  default 3,            -- 난이도 (1~5)
  min_p     int  default 2,            -- 최소 인원
  max_p     int  default 6,            -- 최대 인원
  dur       text,                      -- 소요 시간 (예: "80분")
  price     int  default 25000,        -- 1인 요금
  fear      int  default 1,            -- 공포도 (1~5)
  act       int  default 1,            -- 활동성 (1~5)
  img       text,                      -- 포스터 이미지 경로/URL
  active    boolean default true,      -- 사이트 노출 여부
  descr     text,                      -- 소개 문구
  slots     text,                      -- 시작 시간 (쉼표 구분 "10:00,12:00")
  sort      int  default 0,            -- 지점 내 정렬 순서
  ts        bigint                     -- 갱신 시각(ms)
);

create index if not exists themes_branch_idx on public.themes (branch, sort);

-- RLS: 익명 키로 읽기/쓰기 허용 (예약 테이블과 동일한 운영 정책)
alter table public.themes enable row level security;

drop policy if exists "themes_read"  on public.themes;
drop policy if exists "themes_write" on public.themes;

create policy "themes_read"  on public.themes for select using (true);
create policy "themes_write" on public.themes for all    using (true) with check (true);

-- ============================================================
-- 상상의 문 — Supabase 예약 테이블 설정
-- ------------------------------------------------------------
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- 예약 객체 구조와 1:1 매핑되는 reservations 테이블을 만들고,
-- anon(공개) 키로 조회/저장/수정/삭제가 가능하도록 RLS 정책을 엽니다.
--
-- ⚠️ 주의: 아래 정책은 anon 키로 누구나 예약 데이터를 읽고/쓰고/지울
--    수 있게 합니다. 데모/내부용에는 적합하지만, 실서비스에서는
--    인증(Auth) 기반 정책으로 강화하는 것을 권장합니다.
-- ============================================================

-- 1) 테이블 생성 -------------------------------------------------
create table if not exists public.reservations (
  num        text primary key,          -- 예약번호 (unique 키, upsert 기준)
  name       text,                       -- 예약자명
  phone      text,                       -- 연락처
  branch     text,                       -- 지점
  theme      text,                       -- 테마
  date       text,                       -- 예약일 (예: 2026.06.04)
  time       text,                       -- 예약 시간 (예: 14:00)
  count      integer,                    -- 인원
  pay        text,                       -- 결제수단
  total      bigint,                     -- 결제금액
  status     text default 'confirm',     -- confirm / done / noshow / cancel
  cancelled  boolean default false,      -- 취소 여부
  request    text,                       -- 예약자 요청사항 (예약 시 고객 입력)
  memo       text,                       -- 관리자 메모
  ts         bigint,                     -- 생성 타임스탬프 (Date.now())
  created_at timestamptz default now()   -- 레코드 생성 시각
);

-- 기존 테이블에도 요청사항 컬럼 추가 (이미 있으면 무시)
alter table public.reservations add column if not exists request text;

-- 조회 성능용 인덱스 (이름/연락처 검색, 최신순 정렬)
create index if not exists reservations_name_idx  on public.reservations (name);
create index if not exists reservations_phone_idx on public.reservations (phone);
create index if not exists reservations_ts_idx    on public.reservations (ts desc);

-- 2) RLS 활성화 -------------------------------------------------
alter table public.reservations enable row level security;

-- 3) 정책: anon 에게 select / insert / update / delete 허용 ------
--    (재실행 시 충돌 방지를 위해 기존 정책 제거 후 재생성)
drop policy if exists "anon_select_reservations" on public.reservations;
drop policy if exists "anon_insert_reservations" on public.reservations;
drop policy if exists "anon_update_reservations" on public.reservations;
drop policy if exists "anon_delete_reservations" on public.reservations;

create policy "anon_select_reservations"
  on public.reservations for select
  to anon
  using (true);

create policy "anon_insert_reservations"
  on public.reservations for insert
  to anon
  with check (true);

create policy "anon_update_reservations"
  on public.reservations for update
  to anon
  using (true)
  with check (true);

create policy "anon_delete_reservations"
  on public.reservations for delete
  to anon
  using (true);

/* ============================================================
   상상의 문 — 테마 공용 저장소 (window.SDThemes)
   ------------------------------------------------------------
   관리자(admin.html)에서 추가·수정·삭제한 테마를 Supabase 에 저장하고,
   고객 페이지(reserve.html / themes.html / index.html)가 같은 데이터를
   읽어 화면에 반영하기 위한 공용 헬퍼.

   - 클라우드 우선, localStorage("sd_themes_cache") 백업 병행.
   - 클라우드/캐시에 데이터가 없으면 각 페이지의 기존 하드코딩 데이터로 폴백.

   사용 전 <head> 에 아래 순서로 로드:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="js/themes-store.js"></script>

   themes 테이블 스키마는 sql/themes.sql 참고.
   ============================================================ */
(function () {
  "use strict";

  var SUPABASE_URL = "https://wohfkpwxecvaautlcvoj.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaGZrcHd4ZWN2YWF1dGxjdm9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTY5OTMsImV4cCI6MjA5NjEzMjk5M30.8YHRyyTsbhNZxEHBeo0dJgONFj5kpHo_j4DzhrnvBz0";

  var TABLE = "themes";
  var CACHE_KEY = "sd_themes_cache";
  var P = "img/main/poster/";

  /* ---------- 캐노니컬 시드 (관리자 초기 데이터 = 사이트 기존 테마 전체) ----------
     neutral 포맷: { name, genre, diff, min, max, dur, fear, act, img, desc, slots[] }
     price 는 시간(80분 이상 27000, 그 외 25000) 규칙으로 시드 시 계산. */
  var SEED = {
    "대학로점": [
      { name:"경찰과 도둑", price:22000, genre:"추리", diff:3, min:2, max:4, dur:"60분", fear:1, act:2, img:P+"4_a.webp", desc:"EP.1 경찰이야기\nEP.2 도둑이야기 — 같은 공간, 두 개의 시점.", slots:["10:05","11:25","12:45","14:15","15:35","16:55","18:25","19:40","20:55","22:25"] },
      { name:"스포일러", price:27000, genre:"미스터리", diff:5, min:2, max:6, dur:"85분", fear:2, act:5, img:P+"1_a.webp", desc:"그들은 이미 알고 있었다. ※ 고소공포증 주의 · 초등학생 이용 불가", slots:["09:50","11:35","13:20","15:05","16:50","18:35","20:20","22:15"] },
      { name:"나이트워크", price:35000, genre:"판타지", diff:3, min:2, max:6, dur:"100분", fear:2, act:2, img:P+"10_a.webp", desc:"어두운 밤 속으로 발걸음을 내딛었다. 그리고 한없이 걸었다.\n그 끝에서 한 목소리를 들었다.", slots:["10:00","12:00","14:00","16:00","18:05","20:05","22:05"] },
    ],
    "분당서현점": [
      { name:"시크릿 왕국의 스캔들 (감독판)", price:28000, genre:"추리/잔혹동화", diff:4, min:2, max:6, dur:"90분", fear:3, act:2, img:P+"7_a.webp", desc:"시크릿 왕국의 프린스 왕자와 새 왕자비를 소개하는 연회를 개최합니다. 부디 참석하여 기쁜 날을 함께 맞이해 주시오.", slots:["11:30","13:15","15:00","16:45","18:30","20:15","22:00"] },
      { name:"HERE I AM", price:24000, genre:"생존/탐험", diff:3, min:2, max:6, dur:"70분", fear:2, act:4, img:P+"6_a.webp", desc:"으으... 나 살아있는건가? 목말라... 낯선 곳에서 눈을 뜬 당신, 살아남아 이곳을 빠져나가라.", slots:["11:05","12:30","13:55","15:20","16:45","18:10","19:35","21:00","22:25"] },
      { name:"몽염 : 도망칠 수 없는 꿈", price:27000, genre:"공포", diff:4, min:2, max:4, dur:"80분", fear:5, act:2, img:P+"9_a.webp", desc:"나는 매일 꿈을 꾸었다. 온통 어두운 곳에서 그녀가 날 바라보는 꿈. 그저 바라만 보고 있었다.", slots:["11:15","12:50","14:25","16:00","17:35","19:10","20:45","22:20"] },
      { name:"역만", price:27000, genre:"미스터리", diff:4, min:2, max:6, dur:"90분", fear:2, act:2, img:P+"11_a.webp", desc:"이곳에는 어떤 이야기도 없습니다.", slots:["11:25","13:10","14:55","16:40","18:25","20:10","21:55"] },
      { name:"셔플월드", price:24000, genre:"게임/판타지", diff:3, min:2, max:6, dur:"70분", fear:1, act:3, img:P+"8_a.webp", desc:"평화로운 픽셀월드에 나타난 포탈들! 용사님! 픽셀월드가 삼켜지고 있어! 일어나봐 용사님!", slots:["10:55","12:20","13:45","15:10","16:35","18:00","19:25","20:50","22:15"] },
      { name:"전당포 조필두", price:22000, genre:"스릴러", diff:2, min:2, max:6, dur:"60분", fear:2, act:1, img:P+"5_a.webp", desc:"지루한 매일의 연속.. 조필두는 한숨을 쉬며 자신의 가게인 전당포로 향한다. ※ 입문자용", slots:["11:15","12:30","13:45","15:00","16:15","17:30","18:45","20:00","21:15","22:30"] },
    ],
    "광주점": [
      { name:"영결식", price:23000, genre:"공포", diff:3, min:2, max:6, dur:"60분", fear:5, act:2, img:P+"14_a.webp", desc:"現在去接你 — 지금 데리러 갑니다.", slots:["10:55","12:15","13:35","14:55","16:15","17:35","18:55","20:15","21:35","22:55"] },
      { name:"시크릿 왕국의 스캔들", price:26000, genre:"추리/잔혹동화", diff:4, min:2, max:5, dur:"80분", fear:3, act:2, img:P+"15_a.webp", desc:"시크릿 왕국의 프린스 왕자와 새 왕자비를 소개하는 연회를 개최합니다. 부디 참석하여 기쁜 날을 함께 맞이해 주시오.", slots:["10:45","12:30","14:15","16:00","17:45","19:30","21:15","23:00"] },
      { name:"호러맨스", price:24000, genre:"로맨스/스릴러", diff:3, min:2, max:6, dur:"70분", fear:3, act:2, img:P+"16_a.webp", desc:"와 오늘은 데이트하는 날! 즐겁게 놀아야지! 그런데.. 자기야 뭐라고? ^^", slots:["11:05","12:35","14:05","15:35","17:05","18:35","20:05","21:35","23:05"] },
      { name:"서울만가면된다", price:25000, genre:"일상/코미디", diff:4, min:2, max:5, dur:"69분", fear:1, act:2, img:P+"21_a.webp", desc:"민서: 팀장님 근데.. 저희 지금 여기 무슨 컨셉으로 만드는 중인거예요? / 석현: 음....", slots:["11:20","12:50","14:20","15:50","17:20","18:50","20:20","21:50","23:20"] },
      { name:"TITAN : 전쟁의경계", price:25000, genre:"SF", diff:4, min:2, max:4, dur:"70분", fear:2, act:3, img:P+"24_a.webp", desc:"이곳에서 나는 자부심이 가득한 군인으로 일하고 있다. 그리고 오늘, 이 행성의 이름이 타이탄인 게 맞는지 의심이 가기 시작했다.", slots:["11:30","13:00","14:30","16:00","17:30","19:00","20:30","22:00","23:30"] },
      { name:"그럼에도 불구하고,", price:25000, genre:"드라마", diff:2, min:2, max:5, dur:"70분", fear:1, act:1, img:P+"22_a.webp", desc:"유감스럽게도, 당신은 결국 성공하지 못할 거예요.", slots:["11:40","13:10","14:40","16:10","17:40","19:10","20:40","22:10","23:40"] },
    ],
    "부평점": [
      { name:"쇼쿠진", price:26000, genre:"공포", diff:4, min:2, max:6, dur:"70분", fear:5, act:2, img:P+"34_a.webp", desc:"쇼쿠진님은 언제나 여러분들을 기다리고 있습니다.", slots:["09:50","11:15","12:40","14:05","15:30","16:55","18:20","19:45","21:10","22:35"] },
      { name:"420번지", price:25000, genre:"스릴러", diff:3, min:2, max:6, dur:"70분", fear:3, act:2, img:P+"33_a.webp", desc:"눈을 떠보니 어둡고 기이한 방. 여긴 어디지? 난... 여기서 대체 무엇을 하고 있었지...?", slots:["10:10","11:35","13:00","14:25","15:50","17:15","18:40","20:05","21:30","22:55"] },
      { name:"흑신소", price:25000, genre:"판타지/코미디", diff:3, min:2, max:6, dur:"70분", fear:1, act:2, img:P+"35_a.webp", desc:"돈도 여친도 직업도 없는 고시생 노령진. 극단적 선택을 하려던 그는 '흑역사 없애드립니다'라는 명함을 발견하는데…", slots:["10:00","11:25","12:50","14:15","15:40","17:05","18:30","19:55","21:20","22:45"] },
      { name:"행복목욕탕", price:29000, genre:"드라마/판타지", diff:4, min:2, max:6, dur:"80분", fear:1, act:2, img:P+"36_a.webp", desc:"행복목욕탕 절찬 운영 중 ♨", slots:["10:05","11:40","13:15","14:50","16:25","18:00","19:35","21:10","22:45"] },
    ],
    "수원점": [
      { name:"직박구리 : 남친탐구생활", price:23000, genre:"코믹", diff:3, min:2, max:6, dur:"70분", fear:1, act:2, img:P+"27_a.webp", desc:"회사 일 때문에 잠시 외출한 남자친구. 과연 남자친구의 컴퓨터에도 '그것'이 있을까? 어라..? 이게 뭐야..!", slots:["10:10","11:35","13:00","14:25","15:50","17:15","18:40","20:05","21:30","22:55"] },
      { name:"복도끝", price:26000, genre:"공포", diff:4, min:2, max:6, dur:"75분", fear:5, act:2, img:P+"26_a.webp", desc:"상문빌라의 입주민 회장인 당신은 평소처럼 집 303호로 올라가는 엘리베이터를 탄다. 그런데 뒤에서 들려오는 비명소리..", slots:["10:00","11:35","13:10","14:45","16:20","17:55","19:30","21:05","22:40"] },
      { name:"혼숨", price:24000, genre:"미스터리/스릴러", diff:3, min:2, max:6, dur:"70분", fear:3, act:2, img:P+"28_a.webp", desc:"'괴담 모음집' 동아리에 새로 가입한 우리들은, 폐가로 유명한 옥석 산장으로 신입 환영회를 가게 되었다.", slots:["09:55","11:20","12:45","14:10","15:35","17:00","18:25","19:50","21:15","22:40"] },
      { name:"DKDK컴퍼니", price:27000, genre:"판타지/코미디", diff:4, min:2, max:6, dur:"80분", fear:1, act:2, img:P+"29_a.webp", desc:"오늘도 평화로운 DKDK COMPANY. 쿵부장이 심대리·장사원에게 던진 '프로젝트 HEART'! 성공시켜 실적을 올릴 수 있을까?", slots:["09:40","11:20","13:00","14:40","16:20","18:00","19:40","21:20","23:00"] },
      { name:"영안실", price:27000, genre:"공포", diff:4, min:2, max:6, dur:"80분", fear:5, act:2, img:P+"30_a.webp", desc:"안녕하십니까, 고객님의 마지막 여정을 함께하는 인계병원 영안실입니다. 편안한 밤 되시길 바랍니다.", slots:["09:30","11:10","12:50","14:30","16:10","17:50","19:30","21:10","22:50"] },
      { name:"퍼펫쇼", price:23000, genre:"미스터리", diff:3, min:2, max:6, dur:"70분", fear:3, act:2, img:P+"31_a.webp", desc:"줄 없는 꼭두각시극에 도전할 새 단원을 모집합니다. 무대에서 뵙겠습니다.", slots:["09:50","11:15","12:40","14:05","15:30","16:55","18:20","19:45","21:10","22:35"] },
    ],
    "수원2호점": [
      { name:"알케이드 빌리지", price:29000, genre:"아케이드", diff:4, min:2, max:6, dur:"80분", fear:1, act:4, img:P+"39_a.webp", desc:"세상에서 제일 한가한 마을 RCADE VILLAGE에 '우수마을 평가원이 한 시간 뒤 도착'이라는 소식이! 1시간 안에 정신 차릴 수 있을까?", slots:["09:50","11:25","13:00","14:35","16:10","17:45","19:20","20:55","22:30"] },
      { name:"OKCUT", price:32000, genre:"코메디", diff:4, min:2, max:6, dur:"90분", fear:1, act:2, img:P+"42_a.webp", desc:"[Synopsis #3] 어느 한 저택을 수사하려는 주인공. (문이 닫히고 눈을 뜨며 시계를 본다) '주어진 시간이 얼마 없군.'", slots:["10:00","11:45","13:30","15:15","17:00","18:45","20:30","22:15"] },
      { name:"성지기숙학원 : 특수교정반", price:29000, genre:"공포", diff:4, min:2, max:6, dur:"80분", fear:5, act:2, img:P+"37_a.webp", desc:"같은 기척, 같은 냄새, 같은 어둠. 나는 또다시 이 기숙학원에서 깨어났다.", slots:["09:55","11:30","13:05","14:40","16:15","17:50","19:25","21:00","22:35"] },
      { name:"춘화각 : 피할 수 없는 저주", price:33000, genre:"공포", diff:3, min:2, max:6, dur:"80분", fear:4, act:2, img:P+"40_a.webp", desc:"자네도 장원 급제를 위해서 이 춘화각을 찾았는가? 이쪽 끝방으로 들어가시게. ※ 직원 NPC와 함께 진행", slots:["10:15","11:50","13:25","15:00","16:35","18:10","19:45","21:20","22:55"] },
      { name:"낙화 : 떨어지는 꽃", price:29000, genre:"스릴러", diff:2, min:2, max:6, dur:"80분", fear:2, act:2, img:P+"38_a.webp", desc:"수천 개의 플래시가 날 향하던 그 밤, 나는 꼭대기에 있었다. 어쩌면 끝은 이미 정해져 있었는지도 모른다.", slots:["10:05","11:35","13:05","14:35","16:05","17:35","19:05","20:35","22:05"] },
      { name:"HINDSIGHT", price:27000, genre:"잠입/드라마", diff:3, min:2, max:4, dur:"80분", fear:1, act:3, img:P+"41_a.webp", desc:"여보세요, 도희 맞지? 거의 2년 만이네. 그날 뒤로 해킹에서 손 뗀 건 알지만... 우리 오랜만에 일 하나만 같이 할까?", slots:["10:10","11:40","13:10","14:40","16:10","17:40","19:10","20:40","22:10"] },
    ],
  };

  function seedPrice(dur) { return (parseInt(dur, 10) || 0) >= 80 ? 27000 : 25000; }

  /* ---------- Supabase 클라이언트 ---------- */
  var client = null;
  try {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.warn("[SDThemes] supabase-js 미로드 — 로컬/시드 모드로 동작합니다.");
    }
  } catch (e) {
    console.warn("[SDThemes] 초기화 실패 — 로컬/시드 모드.", e);
  }

  /* ---------- 캐시 ---------- */
  function cacheLoad() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]"); }
    catch (e) { return []; }
  }
  function cacheSave(rows) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(rows || [])); } catch (e) {}
  }

  /* ---------- 포맷 변환 ----------
     관리자 테마 객체: { n,g,d,min,max,p,t,f,a,price,img,active,desc,slots(쉼표문자열) } */
  function adminToRow(branch, t, i) {
    return {
      id: branch + "|" + t.n,
      branch: branch,
      name: t.n,
      genre: t.g || "",
      diff: +t.d || 3,
      min_p: +t.min || 2,
      max_p: +t.max || 6,
      dur: t.t || "",
      price: +t.price || 25000,
      fear: +t.f || 1,
      act: +t.a || 1,
      img: t.img || "",
      active: t.active !== false,
      descr: t.desc || "",
      slots: t.slots || "",
      sort: i,
      ts: Date.now()
    };
  }
  function rowToAdmin(r) {
    return {
      n: r.name, g: r.genre, d: r.diff, min: r.min_p, max: r.max_p,
      p: r.min_p + "~" + r.max_p + "명", t: r.dur, price: r.price,
      f: r.fear, a: r.act, img: r.img, active: r.active !== false,
      desc: r.descr || "", slots: r.slots || ""
    };
  }
  function seedToAdmin(s, i) {
    return {
      n: s.name, g: s.genre, d: s.diff, min: s.min, max: s.max,
      p: s.min + "~" + s.max + "명", t: s.dur, price: s.price || seedPrice(s.dur),
      f: s.fear, a: s.act, img: s.img, active: true,
      desc: s.desc || "", slots: (s.slots || []).join(",")
    };
  }

  function groupByBranch(rows) {
    var g = {};
    (rows || []).slice()
      .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); })
      .forEach(function (r) {
        if (!r || !r.branch) return;
        (g[r.branch] = g[r.branch] || []).push(r);
      });
    return g;
  }

  /* ---------- 공용 API ---------- */
  var SDThemes = {
    enabled: !!client,
    SEED: SEED,

    // 관리자 초기 시드 (지점별 관리자 포맷)
    seedAdmin: function () {
      var out = {};
      Object.keys(SEED).forEach(function (b) {
        out[b] = SEED[b].map(seedToAdmin);
      });
      return out;
    },

    // 전체 테마 행 조회 (클라우드 우선, 실패 시 캐시)
    list: function () {
      if (!client) return Promise.resolve(cacheLoad());
      return client.from(TABLE).select("*").order("branch").order("sort")
        .then(function (res) {
          if (res.error) throw res.error;
          cacheSave(res.data);
          return res.data || [];
        })
        .catch(function (e) {
          console.warn("[SDThemes] list 실패 — 캐시 사용.", e);
          return cacheLoad();
        });
    },

    // 지점별로 그룹화해 반환 { 지점:[row,...] }
    byBranch: function () {
      return SDThemes.list().then(groupByBranch);
    },

    // 관리자: 한 지점의 테마 목록 전체를 클라우드에 반영 (없어진 건 삭제)
    saveBranch: function (branch, adminThemes) {
      var rows = (adminThemes || []).map(function (t, i) { return adminToRow(branch, t, i); });
      // 캐시 갱신 (해당 지점 행 교체)
      var cache = cacheLoad().filter(function (r) { return r.branch !== branch; }).concat(rows);
      cacheSave(cache);
      if (!client) return Promise.resolve({ ok: false, offline: true });
      var ids = rows.map(function (r) { return r.id; });
      // 먼저 upsert(추가·수정) 후, 이번 목록에 없는 같은 지점 행 삭제
      return client.from(TABLE).upsert(rows, { onConflict: "id" })
        .then(function (res) {
          if (res.error) throw res.error;
          var del = client.from(TABLE).delete().eq("branch", branch);
          return ids.length ? del.not("id", "in", "(" + ids.map(function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; }).join(",") + ")")
                            : del;
        })
        .then(function () { return { ok: true }; })
        .catch(function (e) {
          console.warn("[SDThemes] saveBranch 실패 — 캐시는 갱신됨.", e);
          return { ok: false, error: e };
        });
    },

    // 변환 헬퍼 (페이지에서 사용)
    rowToAdmin: rowToAdmin,
    rowToReserve: function (r) {
      return {
        n: r.name, g: r.genre, d: r.diff, p: r.min_p + "~" + r.max_p + "명",
        t: r.dur, f: r.fear, a: r.act, img: r.img, desc: r.descr || "", price: r.price,
        slots: (r.slots || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean),
        active: r.active !== false
      };
    },
    rowToCard: function (r) {
      return {
        name: r.name, genre: r.genre, diff: r.diff,
        players: r.min_p + "~" + r.max_p + "인", time: r.dur,
        img: r.img, desc: r.descr || "", active: r.active !== false
      };
    }
  };

  window.SDThemes = SDThemes;
})();

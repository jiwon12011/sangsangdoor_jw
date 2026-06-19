/* ============================================================
   상상의 문 — Supabase 연동 공용 헬퍼 (window.SD)
   ------------------------------------------------------------
   예약 데이터를 모든 기기에서 공유하기 위한 클라우드 저장소.
   localStorage("sd_reservations")는 백업용으로 함께 유지된다.

   예약 객체 구조:
   { num, name, phone, branch, theme, date, time,
     count, pay, total, status, cancelled, request, memo, ts }
   - request 는 예약자가 입력한 요청사항, memo 는 관리자 메모.
   - num 을 unique 키로 upsert 한다.

   사용 전 <head> 에 아래 두 스크립트를 순서대로 로드해야 한다:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="js/supabase-config.js"></script>
   ============================================================ */
(function () {
  "use strict";

  var SUPABASE_URL = "https://wohfkpwxecvaautlcvoj.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaGZrcHd4ZWN2YWF1dGxjdm9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTY5OTMsImV4cCI6MjA5NjEzMjk5M30.8YHRyyTsbhNZxEHBeo0dJgONFj5kpHo_j4DzhrnvBz0";

  var TABLE = "reservations";
  var LS_KEY = "sd_reservations";
  // Supabase 로 보낼 때 유지할 필드 화이트리스트
  var FIELDS = ["num", "name", "phone", "branch", "theme", "date", "time",
                "count", "pay", "total", "status", "cancelled", "request", "memo", "ts"];

  /* ---------- Supabase 클라이언트 초기화 ---------- */
  var client = null;
  try {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.warn("[SD] supabase-js CDN 이 로드되지 않았습니다. 로컬 모드로 동작합니다.");
    }
  } catch (e) {
    console.warn("[SD] Supabase 초기화 실패 — 로컬 모드로 동작합니다.", e);
  }

  /* ---------- localStorage 백업 헬퍼 ---------- */
  function lsLoad() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
    catch (e) { return []; }
  }
  function lsSave(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr || [])); }
    catch (e) {}
  }
  function lsUpsert(rec) {
    if (!rec || !rec.num) return lsLoad();
    var all = lsLoad();
    var i = all.findIndex(function (x) { return x && x.num === rec.num; });
    if (i >= 0) all[i] = Object.assign({}, all[i], rec);
    else all.unshift(rec);
    lsSave(all);
    return all;
  }
  function lsRemove(num) {
    var all = lsLoad().filter(function (x) { return !x || x.num !== num; });
    lsSave(all);
    return all;
  }

  /* ---------- 유틸 ---------- */
  // Supabase 컬럼에 맞게 객체 정리 (정의된 필드만 남김)
  function clean(rec) {
    var o = {};
    FIELDS.forEach(function (k) { if (rec[k] !== undefined) o[k] = rec[k]; });
    return o;
  }
  // 클라우드 + 로컬을 num 기준으로 병합 (클라우드 우선), 최신순 정렬
  function mergeByNum(cloud, local) {
    var map = new Map();
    (local || []).forEach(function (r) { if (r && r.num) map.set(r.num, r); });
    (cloud || []).forEach(function (r) { if (r && r.num) map.set(r.num, r); });
    return Array.from(map.values()).sort(function (a, b) {
      return (b.ts || 0) - (a.ts || 0);
    });
  }

  /* ---------- 공용 API ---------- */
  var SD = {
    enabled: !!client,        // Supabase 사용 가능 여부
    client: client,
    table: TABLE,

    // 로컬 백업 직접 접근용
    localLoad: lsLoad,
    localSave: lsSave,
    mergeByNum: mergeByNum,

    /* 예약 저장/수정 (num upsert). 항상 로컬 백업 후 클라우드 반영 */
    save: function (rec) {
      var r = clean(rec || {});
      lsUpsert(r);
      if (!client) return Promise.resolve({ ok: false, offline: true, data: r });
      return client.from(TABLE).upsert(r, { onConflict: "num" }).select()
        .then(function (res) {
          if (res.error) throw res.error;
          return { ok: true, data: (res.data && res.data[0]) || r };
        })
        .catch(function (e) {
          console.warn("[SD] save 실패 — 로컬 백업은 유지됩니다.", e);
          return { ok: false, error: e, data: r };
        });
    },

    /* 일부 필드만 수정 (상태/메모/취소 등) */
    update: function (num, patch) {
      lsUpsert(Object.assign({ num: num }, patch || {}));
      if (!client) return Promise.resolve({ ok: false, offline: true });
      return client.from(TABLE).update(clean(patch || {})).eq("num", num).select()
        .then(function (res) {
          if (res.error) throw res.error;
          return { ok: true, data: (res.data && res.data[0]) };
        })
        .catch(function (e) {
          console.warn("[SD] update 실패 — 로컬에는 반영됨.", e);
          return { ok: false, error: e };
        });
    },

    /* 예약 삭제 */
    remove: function (num) {
      lsRemove(num);
      if (!client) return Promise.resolve({ ok: false, offline: true });
      return client.from(TABLE).delete().eq("num", num)
        .then(function (res) {
          if (res.error) throw res.error;
          return { ok: true };
        })
        .catch(function (e) {
          console.warn("[SD] remove 실패 — 로컬에서는 삭제됨.", e);
          return { ok: false, error: e };
        });
    },

    /* 전체 예약 조회 (클라우드 우선, 로컬과 병합 후 백업 갱신) */
    list: function () {
      var local = lsLoad();
      if (!client) return Promise.resolve(local);
      return client.from(TABLE).select("*").order("ts", { ascending: false })
        .then(function (res) {
          if (res.error) throw res.error;
          var merged = mergeByNum(res.data, local);
          lsSave(merged); // 백업 최신화
          return merged;
        })
        .catch(function (e) {
          console.warn("[SD] list 실패 — 로컬 백업으로 대체합니다.", e);
          return local;
        });
    },

    /* 이름/연락처로 예약 검색 (클라우드 우선 + 로컬 병합) */
    find: function (q) {
      q = q || {};
      var name = q.name || "";
      var ph = (q.phone || "").replace(/\D/g, "");
      return SD.list().then(function (all) {
        return all.filter(function (r) {
          var okName = !name || (r.name || "").indexOf(name) >= 0;
          var okPhone = !ph || (r.phone || "").replace(/\D/g, "").indexOf(ph) >= 0;
          return okName && okPhone;
        });
      });
    }
  };

  window.SD = SD;
})();

/* SLIC General Motor Game – live "drivers joined" and "winners" counts on the home page.
   The page renders instantly with the last counts this browser saw (or "–"); fresh numbers are fetched
   after the page has loaded, using the same public getLeaderboard API as the game's All Winners screen.
   That API returns only short names and scores – no mobile numbers or Player IDs. */
(function () {
  'use strict';
  var cfg = (window.SLIC_CONFIG && window.SLIC_CONFIG.googleSheets) || {};
  var url = typeof cfg.webAppUrl === 'string' ? cfg.webAppUrl.trim() : '';
  var CACHE_KEY = 'slic_live_stats';
  var REFRESH_MS = 60000;
  var els = document.querySelectorAll('[data-live]');
  if (!els.length) return;

  function setAll(stats, animate) {
    els.forEach(function (el) {
      var v = stats[el.getAttribute('data-live')];
      if (typeof v !== 'number' || !isFinite(v)) return;
      var from = Number(el.dataset.value);
      el.dataset.value = String(v);
      var box = el.closest('.lv');
      if (animate && box && isFinite(from) && v > from) { box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump'); }
      if (!animate || !isFinite(from) || from === v || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = v.toLocaleString();
        return;
      }
      var start = performance.now();
      (function frame(now) {
        var p = Math.min(1, (now - start) / 900), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (v - from) * e).toLocaleString();
        if (p < 1) requestAnimationFrame(frame);
      })(start);
    });
  }

  // "Top score: 2,124 – can you beat it?" (score only, no name)
  function setTop(stats) {
    var el = document.querySelector('[data-live-top]');
    if (!el) return;
    if (stats.topScore === null || stats.topScore === undefined || !isFinite(stats.topScore)) { el.hidden = true; return; }
    el.textContent = '';
    el.append('🏁 Top score: ');
    var s = document.createElement('strong'); s.textContent = Number(stats.topScore).toLocaleString();
    el.append(s, ' – can you beat it?');
    el.hidden = false;
  }

  // 1. Instant: last known counts from this browser (no network wait).
  try { var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (cached) { setAll(cached, false); setTop(cached); } } catch (e) {}
  els.forEach(function (el) { if (!el.dataset.value) el.dataset.value = '0'; });

  // 2. Later: fresh counts from the Google Sheet.
  function refresh() {
    if (!cfg.enabled || !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url) || document.hidden) return;
    fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getLeaderboard' }),
      redirect: 'follow', credentials: 'omit', cache: 'no-store'
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || j.success !== true || !Array.isArray(j.players)) return;
      var top = j.players[0]; // list is sorted by score, highest first
      var stats = {
        players: j.players.length,
        winners: j.players.filter(function (p) { return p && p.winner === true; }).length,
        topScore: top && isFinite(top.score) ? Number(top.score) : null
      };
      setAll(stats, true);
      setTop(stats);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(stats)); } catch (e) {}
    }).catch(function () { /* keep showing the last known numbers */ });
  }
  // Wait for idle time so the page paints first, but never longer than 2 s (busy animated pages may never be idle).
  function later() { if (window.requestIdleCallback) requestIdleCallback(refresh, { timeout: 2000 }); else setTimeout(refresh, 300); }
  if (document.readyState === 'complete') later(); else addEventListener('load', later);
  setInterval(refresh, REFRESH_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
})();

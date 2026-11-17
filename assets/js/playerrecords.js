/* SLIC General Motor Game – staff player records dashboard.
   Data comes only from the Apps Script API (getPlayerRecords), which requires the staff password,
   checked server-side against the STAFF_PASSWORD Script Property. The password is not stored in this file.
   Requests are CORS "simple" (POST, text/plain, no custom headers, no cookies) so Apps Script needs no preflight. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const cfg = (window.SLIC_CONFIG && window.SLIC_CONFIG.googleSheets) || {};
  const API = typeof cfg.webAppUrl === 'string' ? cfg.webAppUrl.trim() : '';
  const TOKEN_KEY = 'slic_records_pass';
  const TZ = 'Asia/Colombo';
  const PAGE = 100;
  const COLUMNS = ['Player ID', 'Name', 'Mobile', 'Registered At', 'Game Status', 'Driving Score',
    'Facebook Confirmed', 'Awareness Score', 'Winner', 'Last Updated'];

  let records = [], view = [], shown = PAGE, loading = false, generatedAt = '';

  // ---------- API ----------
  async function api(action, data) {
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(API)) throw new Error('The records API is not configured in assets/config.js.');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    let res;
    try {
      res = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action }, data)),
        redirect: 'follow', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: ctrl.signal
      });
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'The request timed out. Please try again.' : navigator.onLine === false ? 'You appear to be offline.' : 'Could not reach the records server.');
    } finally { clearTimeout(timer); }
    if (!res.ok) throw new Error('Server error (' + res.status + ').');
    let json;
    try { json = await res.json(); } catch (e) { throw new Error('Unexpected server response.'); }
    if (!json || json.success !== true) {
      const err = new Error((json && json.error) || 'Request failed.');
      err.auth = !!(json && (json.authRequired || /invalid action/i.test(json.error || '')));
      if (/invalid action/i.test(json && json.error || '')) err.message = 'The staff records API has not been installed on the Apps Script project yet.';
      throw err;
    }
    return json;
  }
  // The password is asked once and remembered on this device (localStorage) until "Lock" is pressed.
  // It is only ever checked by the Apps Script server; this file never contains it.
  const getPass = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } };
  const setPass = (p) => { try { p ? localStorage.setItem(TOKEN_KEY, p) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} };
  let pass = getPass();
  const session = () => pass || null;

  // ---------- PASSWORD ----------
  function showLogin(msg) {
    records = []; view = [];
    $('rows').textContent = ''; $('cards').textContent = '';
    $('dashView').hidden = true; $('who').hidden = true; $('loginView').hidden = false;
    $('loginErr').textContent = msg || '';
    $('lPass').value = '';
    $('lPass').focus();
  }
  function showDash() {
    $('loginView').hidden = true; $('dashView').hidden = false; $('who').hidden = false;
  }
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('loginBtn');
    if (btn.disabled) return;
    const password = $('lPass').value;
    if (!password) { $('loginErr').textContent = 'Enter the password.'; return; }
    btn.disabled = true; btn.textContent = 'CHECKING…'; $('loginErr').textContent = '';
    pass = password;
    const ok = await load(true);
    if (ok) { setPass(password); $('lPass').value = ''; }
    btn.disabled = false; btn.textContent = 'OPEN RECORDS';
  });
  $('logoutBtn').addEventListener('click', () => { pass = ''; setPass(null); showLogin('Locked. Enter the password to open the records again.'); });

  // ---------- LOAD ----------
  async function load(fromLogin) {
    if (!pass) { showLogin(); return false; }
    if (loading) return false;
    loading = true; setBusy(true);
    if (!fromLogin && !records.length) setState('loading', 'Loading player records…');
    try {
      const r = await api('getPlayerRecords', { password: pass });
      showDash();
      records = (Array.isArray(r.records) ? r.records : []).map(normalise);
      generatedAt = r.generatedAt || '';
      fillStatuses();
      apply();
      return true;
    } catch (err) {
      if (fromLogin) { pass = getPass(); $('loginErr').textContent = err.message; return false; }
      if (err.auth && !/not been installed/.test(err.message)) { pass = ''; setPass(null); showLogin(err.message); return false; }
      if (records.length) { $('meta').textContent = 'Refresh failed: ' + err.message + ' Showing the previously loaded records.'; }
      else setState('error', err.message);
      return false;
    } finally { loading = false; setBusy(false); }
  }
  function setBusy(on) {
    $('refreshBtn').disabled = on; $('refreshBtn').textContent = on ? 'Loading…' : '↻ Refresh';
    $('xlsxBtn').disabled = on; $('csvBtn').disabled = on;
  }
  $('refreshBtn').addEventListener('click', () => load());

  // ---------- NORMALISE ----------
  const toBool = (v) => v === true || /^(true|yes|y|1|✓)$/i.test(String(v == null ? '' : v).trim());
  const toNum = (v) => (v === '' || v == null || !isFinite(Number(v)) ? null : Number(v));
  const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  const dispFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const exportFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  function parseDate(v) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  function exportDate(raw, d) {
    if (!d) return raw == null ? '' : String(raw);
    const p = Object.fromEntries(exportFmt.formatToParts(d).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}:${p.second}`;
  }
  function normalise(r) {
    const reg = parseDate(r.registeredAt), upd = parseDate(r.lastUpdated);
    const rec = {
      playerId: String(r.playerId == null ? '' : r.playerId),
      name: String(r.name == null ? '' : r.name),
      mobile: String(r.mobile == null ? '' : r.mobile),
      status: String(r.gameStatus == null ? '' : r.gameStatus).trim(),
      score: toNum(r.drivingScore),
      facebook: toBool(r.facebookConfirmed),
      awareness: toNum(r.awarenessScore),
      winner: toBool(r.winner),
      reg, regTime: reg ? reg.getTime() : 0, regDay: reg ? dayFmt.format(reg) : '',
      raw: r
    };
    rec.search = (rec.name + ' ' + rec.mobile + ' ' + rec.mobile.replace(/^0/, '94') + ' ' + rec.playerId).toLowerCase();
    rec.exportRow = [rec.playerId, rec.name, rec.mobile, exportDate(r.registeredAt, reg), rec.status, rec.score,
      rec.facebook ? 'Yes' : 'No', rec.awareness, rec.winner ? 'Yes' : 'No', exportDate(r.lastUpdated, upd)];
    return rec;
  }
  function fillStatuses() {
    const sel = $('fStatus'), cur = sel.value;
    const list = [...new Set(records.map((r) => r.status).filter(Boolean))].sort();
    sel.textContent = '';
    sel.append(new Option('All statuses', ''));
    list.forEach((s) => sel.append(new Option(s, s)));
    sel.value = list.includes(cur) ? cur : '';
  }

  // ---------- FILTER / SORT ----------
  function apply() {
    const q = $('fSearch').value.trim().toLowerCase().replace(/[\s-]/g, '');
    const w = $('fWinner').value, st = $('fStatus').value, from = $('fFrom').value, to = $('fTo').value, sort = $('fSort').value;
    view = records.filter((r) =>
      (!q || r.search.replace(/[\s-]/g, '').includes(q)) &&
      (w === 'all' || (w === 'win' ? r.winner : !r.winner)) &&
      (!st || r.status === st) &&
      (!from || (r.regDay && r.regDay >= from)) &&
      (!to || (r.regDay && r.regDay <= to)));
    view.sort(sort === 'old' ? (a, b) => a.regTime - b.regTime
      : sort === 'score' ? (a, b) => (b.score ?? -1) - (a.score ?? -1) || b.regTime - a.regTime
      : (a, b) => b.regTime - a.regTime);
    shown = PAGE;
    kpis();
    render();
  }
  ['fSearch'].forEach((id) => $(id).addEventListener('input', debounce(apply, 150)));
  ['fWinner', 'fStatus', 'fFrom', 'fTo', 'fSort'].forEach((id) => $(id).addEventListener('change', apply));
  $('clearBtn').addEventListener('click', () => {
    $('fSearch').value = ''; $('fWinner').value = 'all'; $('fStatus').value = ''; $('fFrom').value = ''; $('fTo').value = ''; $('fSort').value = 'new';
    apply();
  });
  function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }
  const filtersActive = () => !!($('fSearch').value.trim() || $('fWinner').value !== 'all' || $('fStatus').value || $('fFrom').value || $('fTo').value);

  // ---------- KPIs (from all loaded records) ----------
  function kpis() {
    const completed = records.filter((r) => r.score !== null);
    const avg = completed.length ? Math.round(completed.reduce((s, r) => s + r.score, 0) / completed.length) : 0;
    $('kAttempts').textContent = records.length.toLocaleString();
    $('kCompleted').textContent = completed.length.toLocaleString();
    $('kWinners').textContent = records.filter((r) => r.winner).length.toLocaleString();
    $('kAvg').textContent = completed.length ? avg.toLocaleString() : '–';
  }

  // ---------- RENDER ----------
  const mobileQ = matchMedia('(max-width: 860px)');
  mobileQ.addEventListener ? mobileQ.addEventListener('change', render) : mobileQ.addListener(render);
  function setState(kind, msg) {
    const el = $('state');
    el.hidden = false; el.className = 'state ' + kind; el.textContent = '';
    if (kind === 'loading') { const s = document.createElement('div'); s.className = 'spin'; el.append(s); }
    const p = document.createElement('p'); p.textContent = msg; el.append(p);
    if (kind === 'error') { const b = document.createElement('button'); b.className = 'btn primary'; b.type = 'button'; b.textContent = 'Try again'; b.onclick = () => load(); el.append(b); }
    $('tableWrap').hidden = true; $('cards').hidden = true; $('moreBtn').hidden = true;
    $('meta').textContent = '';
  }
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const fmtNum = (n) => (n === null ? '—' : n.toLocaleString());
  const fmtDate = (d) => (d ? dispFmt.format(d) : '—');
  function trophy() { const s = el('span', 'trophy', '🏆 Winner'); s.title = 'Awareness challenge winner'; return s; }
  function yesNo(v) { return el('span', v ? 'yes' : 'no', v ? '✓ Yes' : 'No'); }

  function render() {
    if (!records.length && !loading) return setState('empty', 'No player records yet. Registrations from the game will appear here.');
    if (!view.length) return setState('empty', 'No players match these filters.');
    $('state').hidden = true;
    const list = view.slice(0, shown);
    const updated = generatedAt ? ' · Updated ' + fmtDate(parseDate(generatedAt)) : '';
    $('meta').textContent = `Showing ${list.length.toLocaleString()} of ${view.length.toLocaleString()} matching players (${records.length.toLocaleString()} total)${updated}`;
    $('moreBtn').hidden = view.length <= shown;

    if (mobileQ.matches) {
      $('tableWrap').hidden = true; $('cards').hidden = false; $('rows').textContent = '';
      const frag = document.createDocumentFragment();
      list.forEach((r) => {
        const c = el('article', 'pcard' + (r.winner ? ' win' : ''));
        const top = el('div', 'top');
        const left = el('div');
        left.append(el('div', 'nm', r.name || '—'), el('div', 'sub mob', r.mobile || '—'));
        top.append(left, r.winner ? trophy() : el('span', 'pill', r.status || '—'));
        const dl = el('dl');
        [['Driving', fmtNum(r.score)], ['Awareness', r.awareness === null ? '—' : r.awareness + ' / 5'], ['Facebook', r.facebook ? '✓ Yes' : 'No']]
          .forEach(([k, v]) => { const d = el('div'); d.append(el('dt', null, k), el('dd', null, v)); dl.append(d); });
        c.append(top, dl, el('div', 'sub', fmtDate(r.reg) + (r.winner && r.status ? ' · ' + r.status : '')), el('div', 'sub pid', r.playerId));
        frag.append(c);
      });
      $('cards').replaceChildren(frag);
    } else {
      $('cards').hidden = true; $('tableWrap').hidden = false; $('cards').textContent = '';
      const frag = document.createDocumentFragment();
      list.forEach((r) => {
        const tr = el('tr', r.winner ? 'win' : '');
        const cells = [
          el('td', 'pid', r.playerId), el('td', 'nm', r.name), el('td', 'mob', r.mobile), el('td', 'dt', fmtDate(r.reg)),
          el('td'), el('td', 'num', fmtNum(r.score)), el('td'), el('td', 'num', r.awareness === null ? '—' : r.awareness + ' / 5'), el('td')
        ];
        cells[4].append(el('span', 'pill', r.status || '—'));
        cells[6].append(yesNo(r.facebook));
        cells[8].append(r.winner ? trophy() : el('span', 'no', '—'));
        tr.append(...cells);
        frag.append(tr);
      });
      $('rows').replaceChildren(frag);
    }
  }
  $('moreBtn').addEventListener('click', () => { shown += PAGE; render(); });

  // ---------- EXPORT (currently filtered records, all 10 columns) ----------
  function filename(ext) {
    const today = dayFmt.format(new Date());
    return `SLIC-Motor-Show-2026-Player-Records${filtersActive() ? '-Filtered' : ''}-${today}.${ext}`;
  }
  function guardExport() {
    if (!session()) { showLogin('Please sign in again.'); return false; }
    if (!view.length) { alert('There are no records to export with the current filters.'); return false; }
    return true;
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  // RFC 4180: every field quoted, quotes doubled, CRLF rows. Text starting with = + - @ is prefixed with '
  // so spreadsheet apps never execute it as a formula. UTF-8 BOM keeps Sinhala/Tamil names intact in Excel.
  function csvCell(v) {
    if (v === null || v === undefined) return '""';
    let s = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  $('csvBtn').addEventListener('click', () => {
    if (!guardExport()) return;
    const lines = [COLUMNS, ...view.map((r) => r.exportRow)].map((row) => row.map(csvCell).join(','));
    download(new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }), filename('csv'));
  });
  $('xlsxBtn').addEventListener('click', () => {
    if (!guardExport()) return;
    if (!window.XLSX) { alert('The Excel library failed to load. Please refresh the page.'); return; }
    const ws = XLSX.utils.aoa_to_sheet([COLUMNS, ...view.map((r) => r.exportRow)]);
    // Mobile numbers and IDs as explicit text cells so leading zeros survive.
    for (let i = 1; i <= view.length; i++) {
      ['A', 'C', 'D', 'J'].forEach((col) => { const c = ws[col + (i + 1)]; if (c) { c.t = 's'; c.v = String(c.v); c.z = '@'; } });
    }
    ws['!cols'] = [44, 24, 14, 20, 16, 13, 18, 16, 9, 20].map((wch) => ({ wch }));
    ws['!autofilter'] = { ref: 'A1:J' + (view.length + 1) };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Players');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
    download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename('xlsx'));
  });

  // ---------- BOOT ----------

  if (pass) { showDash(); load(); } else showLogin();
})();

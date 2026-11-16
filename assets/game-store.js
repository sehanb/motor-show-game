/* SLIC Motor Show 2026 – local copy of the current attempt on this browser.
   The official record is the Google Sheet (via assets/game-api.js); this copy only lets the
   page resume after a reload and powers the on-phone Hall of Fame.
   Every read/write of player data goes through this module, so a central service
   (e.g. Google Sheets or an API) can replace it later without touching the game.
   NOTE: localStorage limits one attempt per browser only. It does not stop a second attempt
   from another device, a private window or after clearing site data. */
(function (root) {
  'use strict';
  var KEYS = {
    player: 'slic_mf2026_player',      // the current browser's participation record
    players: 'slic_mf2026_mobiles',    // normalised mobiles that have already played in this browser
    board: 'slic_motorfest_2026_board', // shared with the website leaderboard (name + score only)
    refSeq: 'slic_mf2026_ref_seq',
    muted: 'slic_mf2026_muted'
  };

  function read(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  /* Sri Lanka time (UTC+05:30, no DST) as ISO-8601 with offset, e.g. 2026-11-11T15:30:00+05:30 */
  function nowSL() {
    var d = new Date(Date.now() + 330 * 60000);
    return d.toISOString().slice(0, 19) + '+05:30';
  }

  /* Accepts 07XXXXXXXX, 7XXXXXXXX, 947XXXXXXXX, +947XXXXXXXX, 00947XXXXXXXX (spaces/dashes ignored).
     Returns the local form 07XXXXXXXX, or null. */
  function normaliseMobile(raw) {
    var d = String(raw || '').replace(/[\s\-()]/g, '');
    if (d.charAt(0) === '+') d = d.slice(1);
    if (!/^\d+$/.test(d)) return null;
    if (d.indexOf('0094') === 0) d = d.slice(4);
    else if (d.indexOf('94') === 0 && d.length === 11) d = d.slice(2);
    else if (d.charAt(0) === '0') d = d.slice(1);
    return /^7\d{8}$/.test(d) ? '0' + d : null;
  }

  function cleanName(raw) {
    var n = String(raw || '').trim().replace(/\s+/g, ' ');
    return /^[\p{L}\p{M}][\p{L}\p{M} .'\-]{1,39}$/u.test(n) ? n : null;
  }

  function nextPlayerId() {
    var seq = (read(KEYS.refSeq, 0) | 0) + 1;
    write(KEYS.refSeq, seq);
    return 'SLIC-DEMO-' + String(seq).padStart(6, '0');
  }

  var Store = {
    nowSL: nowSL,
    normaliseMobile: normaliseMobile,
    cleanName: cleanName,

    /* Current participation record for this browser, or null. Schema:
       { playerId, name, mobile, registeredAt, gameStarted, gameCompleted, status, score, shields, coins, dodged,
         eligible, facebookVisited, followConfirmed (self-declared, NOT verified with Facebook),
         awarenessAnswers (5 booleans, true = YES), awarenessScore (0–5), awarenessCompleted, isWinner (all five YES),
         playedAt, awarenessCompletedAt }
       status: REGISTERED | IN_PROGRESS | COMPLETED | INTERRUPTED */
    current: function () { return read(KEYS.player, null); },

    hasPlayed: function (mobile) { return read(KEYS.players, []).indexOf(mobile) >= 0; },

    /* playerId: the ID returned by the Google Sheets API (a local demo ID only when the API is disabled). */
    register: function (name, mobile, playerId) {
      var rec = {
        playerId: playerId || nextPlayerId(), name: name, mobile: mobile, registeredAt: nowSL(),
        gameStarted: false, gameCompleted: false, status: 'REGISTERED', score: null,
        eligible: false, facebookVisited: false, followConfirmed: false,
        awarenessAnswers: null, awarenessScore: null, awarenessCompleted: false, isWinner: false,
        playedAt: null, awarenessCompletedAt: null,
        scoreSaved: false, pendingAnswers: null
      };
      write(KEYS.player, rec);
      var list = read(KEYS.players, []);
      if (list.indexOf(mobile) < 0) { list.push(mobile); write(KEYS.players, list); }
      return rec;
    },

    /* Merge changes into the current record and save immediately. */
    update: function (changes) {
      var rec = read(KEYS.player, null);
      if (!rec) return null;
      for (var k in changes) if (Object.prototype.hasOwnProperty.call(changes, k)) rec[k] = changes[k];
      write(KEYS.player, rec);
      return rec;
    },

    /* Leaderboard: name + score only (never the mobile number). */
    addScore: function (rec) {
      var board = Store.board();
      if (!board.some(function (e) { return e.id === rec.playerId; })) {
        board.push({ id: rec.playerId, name: rec.name, score: rec.score, won: rec.isWinner === true, at: Date.now() });
        write(KEYS.board, board);
      }
    },
    /* Flag a Hall of Fame entry as a 5/5 awareness winner (shows the trophy). */
    markWinner: function (playerId) {
      var b = read(KEYS.board, []);
      if (!Array.isArray(b)) return;
      b.forEach(function (e) { if (e && e.id === playerId) e.won = true; });
      write(KEYS.board, b);
    },
    board: function () {
      var b = read(KEYS.board, []);
      return (Array.isArray(b) ? b : []).filter(function (e) {
        return e && typeof e.name === 'string' && isFinite(e.score) && e.score >= 0;
      }).map(function (e) { return { id: e.id, name: e.name, score: e.score, won: e.won === true }; })
        .sort(function (a, b) { return b.score - a.score; });
    },

    muted: function () { return read(KEYS.muted, false) === true; },
    setMuted: function (m) { write(KEYS.muted, !!m); }
  };

  root.SlicStore = Store;
})(window);

/**
 * SLIC General Motor Game – password-protected player records for playerrecords.html.
 * Add this file to the EXISTING Apps Script project (File › + › Script, name it StaffRecords).
 *
 * Action (POST body JSON, same endpoint as the game):
 *   getPlayerRecords { password } → { success, records:[…10 columns…], generatedAt }
 *   getLeaderboard   { playerId? } → { success, players:[{name, score, awareness, winner, me?}] }  (public, no personal data)
 *
 * The password is kept ONLY in Script Properties (private to project editors), never in the website.
 * Five wrong passwords lock access for 15 minutes.
 *
 * ── ONE-TIME SETUP ─────────────────────────────────────────────────────────────────────────────────
 * 1. Project Settings › Script Properties › Add property:
 *        STAFF_PASSWORD = (your dashboard password)
 * 2. In your existing doPost(e), right after the request body is parsed into `body` and BEFORE the
 *    "Invalid action." fallback, add:
 *
 *        var staffResult = handleStaffAction_(body);
 *        if (staffResult) {
 *          return ContentService.createTextOutput(JSON.stringify(staffResult))
 *                               .setMimeType(ContentService.MimeType.JSON);
 *        }
 *
 * 3. Deploy › Manage deployments › edit the existing deployment › Version: New version › Deploy.
 * ──────────────────────────────────────────────────────────────────────────────────────────────────
 */

var STAFF_CFG = {
  playersSheet: 'Players',
  maxFails: 5,
  lockSeconds: 15 * 60,
  columns: ['playerId', 'name', 'mobile', 'registeredAt', 'gameStatus', 'drivingScore',
            'facebookConfirmed', 'awarenessScore', 'winner', 'lastUpdated']
};

/** Returns a response object for staff actions, or null for any other action. */
function handleStaffAction_(body) {
  if (!body || (body.action !== 'getPlayerRecords' && body.action !== 'getLeaderboard')) return null;
  try {
    return body.action === 'getLeaderboard' ? publicLeaderboard_(body) : staffGetPlayerRecords_(body);
  } catch (err) {
    console.error('getPlayerRecords failed: ' + (err && err.stack || err));
    return { success: false, error: 'Server error. Please try again.' };
  }
}

function staffSafeEqual_(a, b) {
  a = String(a); b = String(b);
  var diff = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function staffGetPlayerRecords_(body) {
  var expected = PropertiesService.getScriptProperties().getProperty('STAFF_PASSWORD');
  if (!expected) return { success: false, error: 'STAFF_PASSWORD is not set in Script Properties.' };

  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('stf_fails') || 0);
  if (fails >= STAFF_CFG.maxFails) {
    return { success: false, error: 'Too many wrong passwords. Please wait 15 minutes.', authRequired: true };
  }
  if (typeof body.password !== 'string' || !staffSafeEqual_(body.password, expected)) {
    cache.put('stf_fails', String(fails + 1), STAFF_CFG.lockSeconds);
    return { success: false, error: 'Incorrect password.', authRequired: true };
  }
  cache.remove('stf_fails');

  var ss = SpreadsheetApp.getActiveSpreadsheet(); // standalone script? use SpreadsheetApp.openById('…')
  var sh = ss.getSheetByName(STAFF_CFG.playersSheet);
  if (!sh) throw new Error('Sheet "' + STAFF_CFG.playersSheet + '" not found.');
  var last = sh.getLastRow();
  var values = last > 1 ? sh.getRange(2, 1, last - 1, 10).getValues() : [];
  var tz = 'Asia/Colombo';

  var records = [];
  values.forEach(function (row) {
    if (row.every(function (v) { return v === '' || v === null; })) return;
    var rec = {};
    STAFF_CFG.columns.forEach(function (col, i) {
      var v = row[i];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
      rec[col] = v;
    });
    // Mobile numbers stored as numbers lose their leading zero; restore 07XXXXXXXX.
    var m = String(rec.mobile == null ? '' : rec.mobile).trim();
    if (/^7\d{8}$/.test(m)) m = '0' + m;
    rec.mobile = m;
    records.push(rec);
  });

  return { success: true, records: records, generatedAt: Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX") };
}

// ── Public leaderboard for the game's "All Winners" screen (no password) ───────────────────────────
// Returns ONLY: display name (first name + surname initial), driving score, awareness score, winner flag.
// Never returns mobile numbers or Player IDs (an ID would let anyone change that player's result).
// `me: true` marks the caller's own row when they send their own playerId.
function publicLeaderboard_(body) {
  var cache = CacheService.getScriptCache();
  var rows = null, cached = cache.get('pub_board_v1');
  if (cached) rows = JSON.parse(cached);
  if (!rows) {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STAFF_CFG.playersSheet);
    var last = sh ? sh.getLastRow() : 0;
    var values = last > 1 ? sh.getRange(2, 1, last - 1, 10).getValues() : [];
    rows = [];
    values.forEach(function (r) {
      var score = r[5];
      if (score === '' || score === null || !isFinite(Number(score))) return; // only finished games
      var aw = r[7];
      rows.push({
        id: String(r[0]),
        name: publicName_(r[1]),
        score: Number(score),
        awareness: aw === '' || aw === null || !isFinite(Number(aw)) ? null : Number(aw),
        winner: r[8] === true || /^(yes|true|y|1)$/i.test(String(r[8]).trim())
      });
    });
    rows.sort(function (a, b) { return b.score - a.score; });
    rows = rows.slice(0, 500);
    try { cache.put('pub_board_v1', JSON.stringify(rows), 30); } catch (e) {} // 30 s cache keeps the sheet light
  }
  var me = typeof body.playerId === 'string' ? body.playerId : '';
  return {
    success: true,
    players: rows.map(function (r) {
      var o = { name: r.name, score: r.score, awareness: r.awareness, winner: r.winner };
      if (me && r.id === me) o.me = true;
      return o;
    })
  };
}
function publicName_(raw) {
  var parts = String(raw || '').trim().split(/\s+/).filter(String);
  if (!parts.length) return 'Player';
  return parts.length > 1 ? parts[0] + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '.' : parts[0];
}

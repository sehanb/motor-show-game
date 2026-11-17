/**
 * SLIC Motor Show 2026 – short Player IDs (SLIC-001, SLIC-002, …) with a hidden access key.
 * Add this file to the Apps Script project (File › + › Script, name it PlayerIds).
 *
 * Short IDs are guessable, so each registration also gets a random Access Key (column K of
 * the Players sheet – hide that column). Score/challenge saves must send the matching key,
 * so nobody can change another player's result by typing their ID.
 * Older rows with long UUID IDs have no key and keep working.
 *
 * ── SETUP ─────────────────────────────────────────────────────────────────────────────────────────
 * 1. In Code.gs replace registerPlayer with the version below (REGISTER_PLAYER_REPLACEMENT).
 * 2. Add as the FIRST line inside updateGameScore(data) and completeChallenge(data):
 *        verifyPlayerKey_(data);
 *    (use your parameter name if it isn't `data`)
 * 3. Optional: to restart numbering, set Script Property PLAYER_SEQ = 0 (next ID = SLIC-001).
 * 4. Save, then Deploy › Manage deployments › edit › Version: New version › Deploy.
 * ──────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * REGISTER_PLAYER_REPLACEMENT – paste over the existing registerPlayer in Code.gs:
 *
 *   function registerPlayer(data) {
 *     const name = String(data.name || "").trim();
 *     const mobile = String(data.mobile || "").trim();
 *     if (!name || name.length > 100) throw new Error("Valid player name required.");
 *     if (!/^(?:0?7\d{8}|\+947\d{8})$/.test(mobile)) throw new Error("Invalid Sri Lankan mobile number.");
 *
 *     const lock = LockService.getScriptLock();
 *     lock.waitLock(10000);
 *     try {
 *       const sheet = getPlayersSheet();
 *       ensureAccessKeyHeader_(sheet);
 *       const playerId = nextPlayerId_();   // SLIC-001, SLIC-002, …
 *       const accessKey = newAccessKey_();
 *       const now = new Date();
 *       // Every registration creates a new attempt.
 *       sheet.appendRow([playerId, name, "'" + mobile, now, "Registered", "", "No", "", "No", now, accessKey]);
 *       SpreadsheetApp.flush();
 *       return { playerId: playerId, accessKey: accessKey, status: "Registered" };
 *     } finally {
 *       lock.releaseLock();
 *     }
 *   }
 */

var PLAYER_KEY_COL = 11; // column K "Access Key"

/** Next sequential ID. Call only while holding the script lock (registerPlayer does). */
function nextPlayerId_() {
  var props = PropertiesService.getScriptProperties();
  var n = (parseInt(props.getProperty('PLAYER_SEQ'), 10) || 0) + 1;
  props.setProperty('PLAYER_SEQ', String(n));
  return 'SLIC-' + (n < 1000 ? ('00' + n).slice(-3) : String(n));
}

function newAccessKey_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function ensureAccessKeyHeader_(sheet) {
  var cell = sheet.getRange(1, PLAYER_KEY_COL);
  if (!cell.getValue()) cell.setValue('Access Key');
}

/** Throws unless data.accessKey matches the player's stored key (rows without a key are legacy and allowed). */
function verifyPlayerKey_(data) {
  var playerId = String((data && data.playerId) || '').trim();
  if (!playerId) throw new Error('Player ID required.');
  var sheet = getPlayersSheet();
  var hit = sheet.getRange('A:A').createTextFinder(playerId).matchEntireCell(true).findNext();
  if (!hit) throw new Error('Player not found.');
  var stored = String(sheet.getRange(hit.getRow(), PLAYER_KEY_COL).getValue() || '');
  if (!stored) return; // legacy row registered before access keys existed
  var given = String((data && data.accessKey) || '');
  if (!staffSafeEqual_(given, stored)) throw new Error('Player not found.');
}

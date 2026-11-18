/**
 * SLIC General Motor Game – event settings from Script Properties.
 * Add this file to the Apps Script project (File › + › Script, name it GameSettings).
 *
 * Script Properties (Project Settings › Script Properties) – both optional:
 *   MIN_WIN_SCORE   Points a player must BEAT to unlock the challenge. Missing/invalid → 1000.
 *                   e.g. 1000 means 1,001 or more qualifies.
 *   EVENT_END_DATE  When the game link stops accepting new players (Sri Lanka time, UTC+05:30).
 *                   "2026-11-30"        → ends at the end of 30 Nov 2026 (23:59:59)
 *                   "2026-11-30 18:00"  → ends at 6:00 pm on 30 Nov 2026
 *                   Missing/empty → no end date.
 *
 * Staff can also change both from the Player Records dashboard (saveGameSettings, password required).
 * The game receives these through the existing public getLeaderboard action (field `settings`),
 * so no new API is needed.
 *
 * ── SETUP in Code.gs ──────────────────────────────────────────────────────────────────────────────
 * 1. First line inside registerPlayer(data):
 *        assertEventOpen_();
 * 2. In updateGameScore, where eligibility is decided, replace the fixed 1000 with minWinScore_():
 *        var eligible = score > minWinScore_();
 * 3. Save, then Deploy › Manage deployments › edit › Version: New version › Deploy.
 * ──────────────────────────────────────────────────────────────────────────────────────────────────
 */

var DEFAULT_MIN_WIN_SCORE = 1000;

function minWinScore_() {
  var raw = PropertiesService.getScriptProperties().getProperty('MIN_WIN_SCORE');
  var n = parseInt(String(raw || '').replace(/[,\s]/g, ''), 10);
  return isFinite(n) && n >= 0 ? n : DEFAULT_MIN_WIN_SCORE;
}

/** Event end as a Date, or null when EVENT_END_DATE is not set / not understood. */
function eventEndDate_(text) {
  var raw = String(text != null ? text : (PropertiesService.getScriptProperties().getProperty('EVENT_END_DATE') || '')).trim();
  var m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (!m) return null;
  var time = m[4] != null ? ('0' + m[4]).slice(-2) + ':' + m[5] + ':00' : '23:59:59';
  var d = new Date(m[1] + '-' + m[2] + '-' + m[3] + 'T' + time + '+05:30');
  return isNaN(d.getTime()) ? null : d;
}

function isEventEnded_() {
  var end = eventEndDate_();
  return !!end && Date.now() > end.getTime();
}

/** Throws when the event has ended (blocks new registrations). */
function assertEventOpen_() {
  if (isEventEnded_()) throw new Error('This event has ended. Thank you for your interest!');
}

/** Public settings sent to the game. */
function publicGameSettings_() {
  var end = eventEndDate_();
  return {
    minWinScore: minWinScore_(),
    eventEnd: end ? end.toISOString() : null,
    eventEnded: !!end && Date.now() > end.getTime()
  };
}

// ── Staff dashboard (playerrecords.html) – password already checked by StaffRecords.gs ────────────

/** Current values for the dashboard form. eventEndDate is the raw "YYYY-MM-DD[ HH:mm]" text or "". */
function staffGameSettings_() {
  var raw = String(PropertiesService.getScriptProperties().getProperty('EVENT_END_DATE') || '').trim();
  var s = publicGameSettings_();
  s.eventEndDate = eventEndDate_() ? raw : '';
  s.defaultMinWinScore = DEFAULT_MIN_WIN_SCORE;
  return s;
}

/** saveGameSettings { password, minWinScore, eventEndDate } – empty eventEndDate removes the end date. */
function staffSaveGameSettings_(body) {
  var score = Number(body.minWinScore);
  if (!isFinite(score) || score < 0 || score > 1000000 || Math.floor(score) !== score) {
    return { success: false, error: 'Minimum score must be a whole number between 0 and 1,000,000.' };
  }
  var end = String(body.eventEndDate == null ? '' : body.eventEndDate).trim().replace('T', ' ');
  if (end && !/^\d{4}-\d{2}-\d{2}( \d{1,2}:\d{2})?$/.test(end)) {
    return { success: false, error: 'End date must look like 2026-11-30 or 2026-11-30 18:00.' };
  }
  if (end && !eventEndDate_(end)) return { success: false, error: 'That end date is not a real date.' };
  var props = PropertiesService.getScriptProperties();
  props.setProperty('MIN_WIN_SCORE', String(score));
  if (end) props.setProperty('EVENT_END_DATE', end); else props.deleteProperty('EVENT_END_DATE');
  return { success: true, settings: staffGameSettings_() };
}

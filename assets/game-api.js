/* SLIC General Motor Game – Google Apps Script API client.
   Endpoint: SLIC_CONFIG.googleSheets.webAppUrl (assets/config.js).

   Cross-origin notes (tested against the deployed web app):
   - The request is a CORS "simple request": POST with a text/plain body and no custom headers.
     Apps Script does not answer CORS preflights, so Content-Type: application/json would fail.
   - Apps Script replies 302 → script.googleusercontent.com; both hops send
     Access-Control-Allow-Origin: *, so fetch() follows the redirect and the JSON is readable.
   - credentials: 'omit' keeps Google cookies out of the request (required with ACAO *,
     and avoids multi-account sign-in issues in Chrome and Safari).
   - Never use mode: 'no-cors': the response (and playerId) would be unreadable.

   Every call resolves with the API's JSON when success === true, otherwise rejects with an
   Error whose message is safe to show. Only name, mobile, score and quiz answers are sent;
   nothing is ever read back from the sheet. */
(function (root) {
  'use strict';
  var cfg = (root.SLIC_CONFIG && root.SLIC_CONFIG.googleSheets) || {};
  var URL_ = typeof cfg.webAppUrl === 'string' ? cfg.webAppUrl.trim() : '';
  var ENABLED = cfg.enabled === true && /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(URL_);
  var TIMEOUT_MS = 20000; // Apps Script cold starts can take several seconds
  var inFlight = {};      // one request per action at a time (blocks repeated taps)

  function friendly(err) {
    if (err && err.name === 'AbortError') return 'The connection timed out.';
    if (root.navigator && root.navigator.onLine === false) return 'Your phone appears to be offline.';
    return 'We could not reach the SLIC General server.';
  }

  function post(action, data) {
    if (inFlight[action]) return inFlight[action];
    var body = { action: action };
    for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) body[k] = data[k];
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : 0;

    var p = fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error('Server error (' + res.status + ').');
      return res.json().catch(function () { throw new Error('Unexpected server response.'); });
    }, function (err) {
      throw new Error(friendly(err));
    }).then(function (json) {
      if (!json || json.success !== true) {
        var e = new Error((json && typeof json.error === 'string' && json.error) || 'The server could not save your details.');
        e.server = true; // the server answered and refused (not a network problem)
        throw e;
      }
      return json;
    });

    inFlight[action] = p;
    var done = function () { clearTimeout(timer); delete inFlight[action]; };
    p.then(done, done);
    return p;
  }

  // Short IDs (SLIC-001) are guessable; the secret accessKey from registerPlayer proves the attempt is ours.
  function withKey(o, accessKey) { if (accessKey) o.accessKey = accessKey; return o; }

  root.SlicApi = {
    enabled: ENABLED,
    busy: function (action) { return !!inFlight[action]; },
    /* → { playerId, accessKey } */
    registerPlayer: function (name, mobile) { return post('registerPlayer', { name: name, mobile: mobile }); },
    /* → { playerId, score, eligible } */
    updateGameScore: function (playerId, score, accessKey) { return post('updateGameScore', withKey({ playerId: playerId, score: score }, accessKey)); },
    /* Public leaderboard: [{ name, score, awareness, winner, me? }] – no mobiles or IDs are ever returned. */
    getLeaderboard: function (playerId) { return post('getLeaderboard', playerId ? { playerId: playerId } : {}); },
    /* answers: exactly five booleans (true = YES). → { playerId, awarenessScore, winner } */
    completeChallenge: function (playerId, facebookConfirmed, answers, accessKey) {
      return post('completeChallenge', withKey({ playerId: playerId, facebookConfirmed: facebookConfirmed === true, answers: answers.map(function (a) { return a === true; }) }, accessKey));
    }
  };
})(window);

/* SLIC General Motor Game – mobile driving challenge + service awareness flow (static prototype).
   Flow: REGISTER → PLAY ONCE → SCORE → (score > 1,000) FACEBOOK → SERVICE AWARENESS CHALLENGE → RESULT → ALL WINNERS
   All participation data goes through window.SlicStore (assets/game-store.js). */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const Store = window.SlicStore;

  // ================= CONFIG =================
  const CONFIG = {
    duration: 30,                // seconds
    eligibilityThreshold: 1000,  // score must be STRICTLY greater than this
    // Verify this is the official SLIC General page before the event.
    facebookUrl: 'https://www.facebook.com/SriLankaInsuranceGeneral',
  };
  // Testing Mode, from assets/config.js. Only the literal boolean true enables it; anything else = false.
  const MULTI_ATTEMPTS = !!(window.SLIC_CONFIG && window.SLIC_CONFIG.allowMultipleGameAttempts === true);
  // Google Sheets API (assets/game-api.js). When disabled in config.js the game runs on this phone only.
  const Api = window.SlicApi;
  const ONLINE = !!(Api && Api.enabled);

  // SLIC General – Digital Services Awareness Quiz. Edit questions, options and correct answers here.
  // `correct` is the index of the right option. The API receives one boolean per question
  // (true = answered correctly); 5/5 correct = winner.
  const TF = ['True', 'False'];
  const AWARENESS_QUESTIONS = [
    { service: 'Bee Express – Quick Claim Settlement', icon: '🐝',
      question: 'Bee Express offers a faster and more convenient way to settle your motor claims.',
      options: TF, correct: 0,
      more: 'Bee Express gives you a faster, more convenient way to settle your motor claims.' },
    { service: 'AI-Powered BeeChat Assistant', icon: '🤖',
      question: 'SLIC General introduced Sri Lanka’s first trilingual AI-powered chatbot, BeeChat, allowing customers to access claim updates anytime, anywhere through their mobile phones.',
      options: TF, correct: 0,
      more: 'BeeChat is Sri Lanka’s first trilingual AI-powered chatbot – get claim updates anytime, anywhere on your phone.' },
    { service: 'BeeChat – Customer Assistance', icon: '💬',
      question: 'You can use BeeChat to get assistance with your general insurance-related inquiries anytime.',
      options: TF, correct: 0,
      more: 'Ask BeeChat about your general insurance inquiries, any time of day.' },
    { service: 'Virtual Motor Claim Office', icon: '🏢',
      question: 'What services can you access through the SLIC General Virtual Motor Claim Office?',
      options: ['A. Upload claim-related documents.', 'B. Connect with a claim officer for assistance.', 'C. Receive claim payments directly to your bank account.', 'D. All of the above.'], correct: 3,
      more: 'The Virtual Motor Claim Office lets you upload documents, talk to a claim officer and receive payments to your bank account.' },
    { service: 'Virtual Vehicle Inspection', icon: '📱',
      question: 'You can get your vehicle inspected remotely through a simple web link on your mobile phone.',
      options: TF, correct: 0,
      more: 'Get your vehicle inspected remotely through a simple web link on your mobile phone.' },
  ];
  // ================= CANVAS =================
  const stage = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');
  let W = 360, H = 720, DPR = 1;
  const logo = new Image(); logo.src = 'assets/logo.png';

  function resize() {
    const r = stage.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width || 360; H = r.height || 720;
    cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const c = $('confetti'); c.width = W * DPR; c.height = H * DPR;
    asphalt = makeAsphalt();
  }
  const geo = () => {
    const verge = W * 0.13, roadW = W - verge * 2, laneW = roadW / 3;
    const carW = laneW * 0.5, carH = carW * 1.85;
    return { verge, roadW, laneW, carW, carH, py: H * 0.8 };
  };
  const laneX = (l) => { const g = geo(); return g.verge + g.laneW * (l + 0.5); };

  let asphalt = null;
  function makeAsphalt() {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const x = c.getContext('2d');
    x.fillStyle = '#2f3a42'; x.fillRect(0, 0, 96, 96);
    for (let i = 0; i < 420; i++) {
      const v = 40 + Math.random() * 40 | 0;
      x.fillStyle = `rgba(${v},${v + 8},${v + 14},${0.25 + Math.random() * 0.35})`;
      x.fillRect(Math.random() * 96, Math.random() * 96, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5);
    }
    return ctx.createPattern(c, 'repeat');
  }

  // ================= AUDIO / HAPTICS =================
  let ac = null, muted = Store.muted();
  function tone(f, d = 0.1, type = 'square', v = 0.06, slide = 0) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d);
    } catch (e) { /* audio unavailable */ }
  }
  const buzz = (ms) => { try { if (!muted && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* no vibration */ } };
  const sfx = {
    shield: () => { tone(880, 0.08, 'triangle', 0.08); setTimeout(() => tone(1320, 0.12, 'triangle', 0.08), 60); },
    coin: () => { tone(988, 0.07, 'square', 0.05); setTimeout(() => tone(1568, 0.18, 'square', 0.05), 70); },
    crash: () => { tone(160, 0.35, 'sawtooth', 0.1, 40); buzz([60, 40, 80]); },
    splash: () => { tone(300, 0.3, 'sine', 0.08, 90); buzz(40); },
    block: () => { tone(600, 0.2, 'sine', 0.1, 200); buzz(30); },
    move: () => tone(420, 0.04, 'sine', 0.03),
    beep: (hi) => tone(hi ? 1046 : 523, hi ? 0.4 : 0.15, 'square', 0.06),
    tick: () => tone(1200, 0.02, 'square', 0.025),
    fanfare: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.08), i * 110)),
  };
  function setMuted(m) { muted = m; Store.setMuted(m); $('muteBtn').textContent = m ? '🔇' : '🔊'; $('muteBtn').setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound'); }
  $('muteBtn').onclick = () => setMuted(!muted);
  setMuted(muted);

  // ================= SCREENS =================
  const OVS = ['reg', 'countOv', 'pauseOv', 'eligibleOv', 'doneOv', 'fbOv', 'quizOv', 'winOv', 'thanksOv', 'endedOv', 'boardOv', 'saveOv'];
  let screen = 'reg';
  function show(id) {
    screen = id || 'playing';
    OVS.forEach((o) => $(o).classList.toggle('on', o === id));
    stage.dataset.screen = screen;
  }
  function playing(on) {
    $('hud').classList.toggle('on', on); $('tap').classList.toggle('on', on); $('timebar').classList.toggle('on', on);
    $('hint').style.display = on ? 'flex' : 'none';
    if (!on) $('combo').classList.remove('on');
  }

  // ================= GAME STATE =================
  let S = null, raf = 0, last = 0, paused = false;
  function newState() {
    return { t: 0, score: 0, lane: 1, x: laneX(1), items: [], side: [], spawn: 0.6, scroll: 0,
      shields: 0, coins: 0, dodged: 0, crashes: 0, protect: 0, inv: 0, stun: 0, shake: 0, combo: 0, comboT: 0,
      parts: [], texts: [], tilt: 0, running: false, flash: 0 };
  }

  // ================= SAVING STATE =================
  // Friendly loading screen while the API saves; on failure it says plainly that nothing was saved and offers a retry.
  let saveRetry = null;
  function saving(title, msg) {
    saveRetry = null;
    $('saveOv').classList.remove('failed');
    $('saveTitle').textContent = title;
    $('saveMsg').textContent = msg;
    $('saveErr').textContent = '';
    show('saveOv');
  }
  function saveFailed(message, retry) {
    saveRetry = retry;
    $('saveOv').classList.add('failed');
    $('saveTitle').textContent = 'NOT SAVED YET';
    $('saveMsg').textContent = 'Your result has not been saved. Please check your connection and try again.';
    $('saveErr').textContent = message;
    show('saveOv');
  }
  $('saveRetry').onclick = () => { const f = saveRetry; saveRetry = null; if (f) f(); };

  // ================= REGISTRATION =================
  let registering = false;
  $('regForm').onsubmit = (e) => {
    e.preventDefault();
    if (registering) return;
    const name = Store.cleanName($('pname').value);
    const mobile = Store.normaliseMobile($('pphone').value);
    if (!name) return ($('err').textContent = 'Please enter your name (letters only, 2–40 characters).');
    if (!mobile) return ($('err').textContent = 'Please enter a valid Sri Lankan mobile number, e.g. 077 123 4567.');
    if (MULTI_ATTEMPTS) return registerTestingSession(name, mobile);
    const cur = Store.current();
    if (cur && cur.status !== 'REGISTERED') return route(cur); // this browser already has an attempt
    if (Store.hasPlayed(mobile) && !(cur && cur.mobile === mobile && cur.status === 'REGISTERED')) {
      return ($('err').textContent = 'You have already participated in the SLIC Motor Show Challenge. Thank you for joining us!');
    }
    if (!(cur && cur.mobile === mobile && cur.status === 'REGISTERED')) return registerPlayer(name, mobile);
    $('err').textContent = '';
    Store.update({ name });
    if (document.activeElement) document.activeElement.blur();
    countdown();
  };
  // Testing Mode registration: always a brand-new session (new ID, score, Facebook step, eligibility and awareness challenge).
  // Hall of Fame entries from earlier sessions are kept because they live in a separate store.
  function registerTestingSession(name, mobile) { registerPlayer(name, mobile); }

  // Every registration creates a new Google Sheets row and returns its playerId for this attempt.
  // The game only starts once the server has confirmed the registration.
  function registerPlayer(name, mobile) {
    $('err').textContent = '';
    if (document.activeElement) document.activeElement.blur();
    if (!ONLINE) { Store.register(name, mobile); return countdown(); }
    // Stay on the registration screen while saving (no flash of the road behind it).
    setRegBusy(true);
    Api.registerPlayer(name, mobile).then((res) => {
      if (typeof res.playerId !== 'string' || !res.playerId) throw new Error('Unexpected server response.');
      Store.register(name, mobile, res.playerId, typeof res.accessKey === 'string' ? res.accessKey : null);
      setRegBusy(false);
      countdown();
    }).catch((err) => {
      setRegBusy(false);
      $('err').textContent = 'Registration was not saved. ' + err.message + ' Please try again.';
    });
  }
  function setRegBusy(on) {
    registering = on;
    const btn = $('regBtn');
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.disabled = on; btn.classList.toggle('busy', on);
    btn.textContent = on ? 'REGISTERING…' : btn.dataset.label;
    $('pname').disabled = on; $('pphone').disabled = on;
  }

  // ================= START / PAUSE =================
  function countdown() {
    // Reserve the single attempt before anything else happens.
    Store.update({ status: 'IN_PROGRESS', gameStarted: true, playedAt: Store.nowSL() });
    S = newState(); seedSide(); playing(false); show('countOv');
    let n = 3;
    const step = () => {
      const el = $('countNum');
      el.textContent = n > 0 ? n : 'GO!'; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      sfx.beep(n === 0);
      if (n-- > 0) setTimeout(step, 750); else setTimeout(start, 500);
    };
    step();
  }
  function start() {
    show(null); playing(true); $('hint').style.opacity = 0.85;
      S.running = true; paused = false; last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function pause() { if (S && S.running && !paused) { paused = true; show('pauseOv'); } }
  $('pauseBtn').onclick = pause;
  $('resumeBtn').onclick = () => { paused = false; show(null); last = performance.now(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  // ================= INPUT =================
  function steer(d) {
    if (!S || !S.running || paused) return;
    const nl = Math.max(0, Math.min(2, S.lane + d));
    if (nl !== S.lane) { S.lane = nl; S.tilt = d * 0.2; sfx.move(); }
  }
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') steer(-1);
    if (e.key === 'ArrowRight' || e.key === 'd') steer(1);
    if (e.key === 'Escape') pause();
  });
  let tx = null, swiped = false;
  const tap = $('tap');
  tap.addEventListener('pointerdown', (e) => { tx = e.clientX; swiped = false; });
  tap.addEventListener('pointermove', (e) => {
    if (tx == null || swiped) return;
    const dx = e.clientX - tx;
    if (Math.abs(dx) > 24) { steer(dx > 0 ? 1 : -1); swiped = true; }
  });
  tap.addEventListener('pointerup', (e) => {
    if (tx != null && !swiped) { const r = stage.getBoundingClientRect(); steer(e.clientX - r.left < r.width / 2 ? -1 : 1); }
    tx = null;
  });
  tap.addEventListener('pointercancel', () => { tx = null; });

  // ================= WORLD =================
  const HUES = ['#8a96a3', '#5b6b78', '#c9ced3', '#6d4fa1', '#2f5b8c', '#b23a3a', '#3b3f45'];
  // SLIC General motor insurance perks shown when a gold shield is collected.
  const PERKS = ['CASHLESS REPAIR', 'CLAIMS 24/7', 'VIRTUAL INSPECTION', 'ONLINE RENEWAL', 'FAST CLAIM SETTLEMENT', 'ISLANDWIDE ASSISTANCE'];
  function seedSide() { S.side = []; for (let y = -H; y < H * 1.2; y += H * 0.3) addSide(y); }
  function addSide(y) {
    const left = S.side.length % 2 === 0;
    const r = Math.random();
    // Right-hand verge alternates SLIC logo boards with SLIC service signs.
    S.side.push({ y, left, kind: r < 0.22 ? 'board' : r < 0.4 ? 'sign' : r < 0.58 ? 'lamp' : 'palm', r: 0.75 + Math.random() * 0.45, sign: (Math.random() * SIGNS.length) | 0 });
  }
  const SIGNS = [['SLIC', 'CLAIMS 24/7'], ['DRIVE', 'SAFE'], ['SLIC', 'MOTOR+'], ['CASHLESS', 'REPAIR']];
  // Constant speed for the whole 30 seconds, so every player gets the same road.
  function speed() { return H * 0.9; }

  // Sri Lankan traffic mix: cars, tuk-tuks, motorbikes, vans and red buses.
  function vehicleKind() { const r = Math.random(); return r < 0.38 ? 'sedan' : r < 0.58 ? 'tuk' : r < 0.74 ? 'bike' : r < 0.88 ? 'van' : 'bus'; }
  function spawn() {
    const r = Math.random(), lane = (Math.random() * 3) | 0;
    const busy = S.items.filter((it) => it.y < H * 0.2).map((it) => it.lane);
    if (busy.includes(lane)) return;
    // ~40% of spawns are shields (28% teal +100, 12% gold +200); the rest are traffic and road hazards.
    const type = r < 0.40 ? 'car' : r < 0.48 ? 'cone' : r < 0.54 ? 'flood' : r < 0.60 ? 'hole' : r < 0.88 ? 'shield' : 'gold';
    const mk = (t, l) => ({ type: t, lane: l, y: -H * 0.16, hue: HUES[(Math.random() * HUES.length) | 0], kind: t === 'car' ? vehicleKind() : (Math.random() < 0.5 ? 'barrier' : 'cone'), hit: false, passed: false, ph: Math.random() * 6 });
    S.items.push(mk(type, lane));
    if ((type === 'car' || type === 'cone') && Math.random() < 0.3) {
      const other = [0, 1, 2].filter((l) => l !== lane && !busy.includes(l));
      if (other.length === 2) S.items.push(mk('car', other[(Math.random() * 2) | 0]));
    }
  }

  function addScore(n, x, y, color) {
    S.score = Math.max(0, S.score + n);
    S.texts.push({ x, y, txt: (n > 0 ? '+' : '') + n, color, life: 1 });
  }
  function burst(x, y, color, n = 14, spd = 220) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * spd;
      S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.4, color, r: 2 + Math.random() * 3 });
    }
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    // Use one clock (performance.now) everywhere; rAF timestamps can be earlier than it → negative time.
    const now = performance.now();
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    if (!S) return;
    if (S.running && !paused) update(dt);
    draw();
  }

  function update(dt) {
    const g = geo(), sp = speed();
    S.t += dt;
    const left = Math.max(0, CONFIG.duration - S.t);
    if (left <= 0) return finish();
    S.scroll = (S.scroll + sp * dt) % 480; // 480 = common multiple of the 40/80 px markings and 96 px asphalt tile
    // Points come ONLY from shields: teal +100, gold +200.
    S.x += (laneX(S.lane) - S.x) * Math.min(1, dt * 16);
    S.tilt *= 0.85;
    if (S.stun > 0) S.tilt = Math.sin(S.t * 40) * 0.25; // spin-out wobble after a crash
    S.inv = Math.max(0, S.inv - dt); S.stun = Math.max(0, (S.stun || 0) - dt); S.shake = Math.max(0, S.shake - dt); S.flash = Math.max(0, S.flash - dt);

    S.spawn -= dt;
    if (S.spawn <= 0) { spawn(); S.spawn = 0.5 * (0.8 + Math.random() * 0.4); } // steady spawn rate

    for (const s of S.side) s.y += sp * dt;
    S.side = S.side.filter((s) => s.y < H + 120);
    while (S.side.length < 9) addSide(Math.min(...S.side.map((s) => s.y), H) - H * 0.3);

    const pw = g.carW, ph = g.carH;
    for (const it of S.items) {
      const v = it.type === 'car' ? sp * (it.kind === 'bike' ? 0.66 : it.kind === 'bus' ? 0.6 : 0.72) : sp;
      it.y += v * dt; it.ph += dt * 4;
      if (it.hit) continue;
      const ix = laneX(it.lane);
      const pickup = it.type === 'shield' || it.type === 'gold';
      const size = it.type === 'car' ? [it.kind === 'bike' ? pw * 0.55 : pw, it.kind === 'bus' ? ph * 1.6 : ph] : [g.laneW * 0.42, g.laneW * 0.42];
      const overlap = Math.abs(ix - S.x) < (pw + size[0]) / 2 * 0.8 && Math.abs(it.y - g.py) < (ph + size[1]) / 2 * 0.8;
      if (overlap && pickup && S.stun > 0) {
        // still spinning out after a crash – the shield slips past
      } else if (overlap) {
        it.hit = true;
        if (it.type === 'shield') {
          S.shields++; S.protect = 1;
          addScore(100, ix, it.y, '#4fe3dc'); burst(ix, it.y, '#4fe3dc'); sfx.shield(); buzz(15);
        } else if (it.type === 'gold') {
          S.shields++; S.coins++; S.protect = 1; // coins = gold shields collected
          addScore(200, ix, it.y, '#ffce69'); burst(ix, it.y, '#ffce69', 22); sfx.coin(); buzz(20);
          S.texts.push({ x: ix, y: it.y - 28, txt: PERKS[S.coins % PERKS.length], color: '#ffffff', life: 1.1, small: true });
        } else if (S.inv > 0) {
          // recovering – pass through
        } else if (S.protect) {
          S.protect = 0; S.inv = 0.8; burst(ix, it.y, '#4fe3dc', 24);
          S.texts.push({ x: S.x, y: g.py - ph, txt: 'SLIC PROTECTED!', color: '#4fe3dc', life: 1.2 }); sfx.block();
        } else {
          // No points lost – but the car spins out and can't collect shields for a moment.
          S.crashes++; S.inv = 1.2; S.stun = 0.9; S.shake = 0.4; S.flash = 0.35;
          S.texts.push({ x: S.x, y: g.py - ph, txt: 'CRASH!', color: '#ed4d60', life: 1 });
          if (it.type === 'flood') { burst(S.x, g.py, '#7fd3ff', 30, 260); sfx.splash(); }
          else { burst(S.x, g.py, '#ffb347', 26); sfx.crash(); }
        }
      } else if (!it.passed && it.y > g.py + ph / 2 && ['car', 'cone', 'hole', 'flood'].includes(it.type)) {
        it.passed = true; S.dodged++;
      }
    }
    S.items = S.items.filter((it) => it.y < H + 220 && !(it.hit && (it.type === 'shield' || it.type === 'gold')));
    for (const p of S.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; }
    S.parts = S.parts.filter((p) => p.life > 0);
    for (const t of S.texts) { t.y -= 60 * dt; t.life -= dt; }
    S.texts = S.texts.filter((t) => t.life > 0);

    // HUD
    const secs = Math.ceil(left);
    if ($('time').textContent !== String(secs)) { $('time').textContent = secs; if (secs <= 5) sfx.tick(); }
    $('timePill').classList.toggle('low', left <= 5);
    $('timebar').classList.toggle('low', left <= 5);
    $('timefill').style.transform = `scaleX(${left / CONFIG.duration})`;
    $('score').textContent = Math.floor(S.score).toLocaleString();
    $('shields').textContent = '🛡 ' + S.shields;
  }

  // ================= DRAW =================
  function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function shieldPath(cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.quadraticCurveTo(cx + s * 0.9, cy - s * 0.8, cx + s * 0.85, cy - s * 0.55);
    ctx.quadraticCurveTo(cx + s * 0.85, cy + s * 0.45, cx, cy + s);
    ctx.quadraticCurveTo(cx - s * 0.85, cy + s * 0.45, cx - s * 0.85, cy - s * 0.55);
    ctx.quadraticCurveTo(cx - s * 0.9, cy - s * 0.8, cx, cy - s);
    ctx.closePath();
  }

  function drawCar(x, y, w, h, body, opts = {}) {
    ctx.save(); ctx.translate(x, y); if (opts.tilt) ctx.rotate(opts.tilt);
    ctx.fillStyle = '#0006'; rr(-w / 2 + 4, -h / 2 + 6, w, h, w * 0.28); ctx.fill();
    if (opts.brand) {
      const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, h * 0.9);
      gl.addColorStop(0, '#4fe3dc55'); gl.addColorStop(1, '#4fe3dc00');
      ctx.fillStyle = gl; ctx.fillRect(-h, -h, h * 2, h * 2);
      // headlight beams
      const bm = ctx.createLinearGradient(0, -h / 2, 0, -h * 1.6);
      bm.addColorStop(0, '#fffbd055'); bm.addColorStop(1, '#fffbd000');
      ctx.fillStyle = bm; ctx.beginPath(); ctx.moveTo(-w * 0.4, -h / 2); ctx.lineTo(-w * 0.9, -h * 1.6); ctx.lineTo(w * 0.9, -h * 1.6); ctx.lineTo(w * 0.4, -h / 2); ctx.fill();
    }
    ctx.fillStyle = '#111';
    for (const [sx, sy] of [[-1, -0.3], [1, -0.3], [-1, 0.3], [1, 0.3]]) { rr(sx * w / 2 - (sx > 0 ? w * 0.12 : 0) - w * 0.06, sy * h - h * 0.09, w * 0.18, h * 0.18, 3); ctx.fill(); }
    const bg = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    bg.addColorStop(0, opts.dark || body); bg.addColorStop(0.5, body); bg.addColorStop(1, opts.dark || body);
    ctx.fillStyle = bg; rr(-w / 2, -h / 2, w, h, w * 0.3); ctx.fill();
    // glossy highlight
    const hl = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    hl.addColorStop(0, '#ffffff00'); hl.addColorStop(0.3, '#ffffff30'); hl.addColorStop(0.45, '#ffffff00');
    ctx.fillStyle = hl; rr(-w / 2, -h / 2, w, h, w * 0.3); ctx.fill();
    if (opts.brand) {
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#ed4d60'; ctx.fillRect(-w * 0.16, -h / 2 + 2, w * 0.1, h - 4); ctx.fillRect(w * 0.06, -h / 2 + 2, w * 0.1, h - 4);
    }
    ctx.fillStyle = '#0b1d26'; rr(-w * 0.36, -h * 0.24, w * 0.72, h * 0.16, 6); ctx.fill();
    rr(-w * 0.34, h * 0.24, w * 0.68, h * 0.1, 5); ctx.fill();
    ctx.fillStyle = opts.brand ? '#fff' : body; rr(-w * 0.36, -h * 0.07, w * 0.72, h * 0.3, 6); ctx.fill();
    if (opts.brand && logo.complete && logo.naturalWidth) {
      const lw = w * 0.66, lh = lw * logo.naturalHeight / logo.naturalWidth;
      ctx.drawImage(logo, -lw / 2, h * 0.08 - lh / 2, lw, lh);
    }
    ctx.fillStyle = opts.brand ? '#fffbd0' : '#ffe9a8'; rr(-w * 0.42, -h / 2 + 2, w * 0.2, 5, 2); ctx.fill(); rr(w * 0.22, -h / 2 + 2, w * 0.2, 5, 2); ctx.fill();
    ctx.fillStyle = '#ff3048'; rr(-w * 0.42, h / 2 - 6, w * 0.2, 4, 2); ctx.fill(); rr(w * 0.22, h / 2 - 6, w * 0.2, 4, 2); ctx.fill();
    if (opts.brand) { ctx.fillStyle = '#fff'; ctx.font = `900 ${w * 0.2}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('SLIC', 0, -h * 0.32); }
    ctx.restore();
  }
  function drawVan(x, y, w, h, body) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#0006'; rr(-w / 2 + 4, -h * 0.55 + 6, w, h * 1.1, 8); ctx.fill();
    ctx.fillStyle = '#111'; [[-1, -0.32], [1, -0.32], [-1, 0.34], [1, 0.34]].forEach(([sx, sy]) => { rr(sx * w / 2 - (sx > 0 ? w * 0.12 : 0) - w * 0.06, sy * h - h * 0.08, w * 0.18, h * 0.16, 3); ctx.fill(); });
    ctx.fillStyle = body; rr(-w / 2, -h * 0.55, w, h * 1.1, 8); ctx.fill();
    ctx.fillStyle = '#ffffff22'; rr(-w * 0.4, -h * 0.2, w * 0.8, h * 0.7, 4); ctx.fill();
    ctx.fillStyle = '#0b1d26'; rr(-w * 0.4, -h * 0.47, w * 0.8, h * 0.18, 5); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; rr(-w * 0.42, -h * 0.55 + 2, w * 0.2, 5, 2); ctx.fill(); rr(w * 0.22, -h * 0.55 + 2, w * 0.2, 5, 2); ctx.fill();
    ctx.restore();
  }
  function drawTuk(x, y, w, h) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#0007'; rr(-w * 0.5 + 4, -h * 0.5 + 5, w, h, 10); ctx.fill();
    ctx.fillStyle = '#111'; rr(-w * 0.12, -h * 0.56, w * 0.24, h * 0.15, 3); ctx.fill();
    rr(-w * 0.58, h * 0.25, w * 0.18, h * 0.19, 3); ctx.fill(); rr(w * 0.4, h * 0.25, w * 0.18, h * 0.19, 3); ctx.fill();
    ctx.fillStyle = '#bc3444'; ctx.beginPath(); ctx.moveTo(-w * 0.22, -h * 0.49); ctx.lineTo(w * 0.22, -h * 0.49); ctx.lineTo(w * 0.5, -h * 0.06); ctx.lineTo(w * 0.5, h * 0.47); ctx.lineTo(-w * 0.5, h * 0.47); ctx.lineTo(-w * 0.5, -h * 0.06); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f0c8b4'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#082b34'; rr(-w * 0.27, -h * 0.28, w * 0.54, h * 0.15, 3); ctx.fill();
    ctx.fillStyle = '#16262b'; rr(-w * 0.43, -h * 0.02, w * 0.86, h * 0.42, 5); ctx.fill();
    ctx.fillStyle = '#ffe4a0'; ctx.beginPath(); ctx.arc(0, -h * 0.38, w * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd84d'; ctx.fillRect(-w * 0.13, h * 0.38, w * 0.26, h * 0.045); ctx.restore();
  }
  function drawBike(x, y, w, h, body) {
    const bw = w * 0.42;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#0006'; rr(-bw / 2 + 3, -h * 0.45 + 5, bw, h * 0.9, bw / 2); ctx.fill();
    ctx.fillStyle = '#111'; rr(-bw * 0.22, -h * 0.47, bw * 0.44, h * 0.2, 4); ctx.fill(); rr(-bw * 0.22, h * 0.27, bw * 0.44, h * 0.2, 4); ctx.fill();
    ctx.fillStyle = body; rr(-bw / 2, -h * 0.28, bw, h * 0.56, bw * 0.4); ctx.fill();
    ctx.strokeStyle = '#c9d3d8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w * 0.42, -h * 0.26); ctx.lineTo(w * 0.42, -h * 0.26); ctx.stroke();
    ctx.fillStyle = '#20272c'; ctx.beginPath(); ctx.ellipse(0, -h * 0.02, bw * 0.55, h * 0.13, 0, 0, 7); ctx.fill(); // rider shoulders
    ctx.fillStyle = '#e8edf0'; ctx.beginPath(); ctx.arc(0, -h * 0.06, bw * 0.38, 0, 7); ctx.fill(); // helmet
    ctx.fillStyle = '#0b1d26'; ctx.beginPath(); ctx.arc(0, -h * 0.1, bw * 0.24, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(0, -h * 0.46, 3, 0, 7); ctx.fill();
    ctx.restore();
  }
  // Sri Lankan red passenger bus (longer than other traffic)
  function drawBus(x, y, w, h) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#0007'; rr(-w / 2 + 4, -h / 2 + 6, w, h, 8); ctx.fill();
    ctx.fillStyle = '#111'; [[-1, -0.33], [1, -0.33], [-1, 0.3], [1, 0.3]].forEach(([sx, sy]) => { rr(sx * w / 2 - (sx > 0 ? w * 0.1 : 0) - w * 0.05, sy * h - h * 0.05, w * 0.15, h * 0.1, 3); ctx.fill(); });
    ctx.fillStyle = '#b3202f'; rr(-w / 2, -h / 2, w, h, 8); ctx.fill();
    ctx.fillStyle = '#f2c230'; ctx.fillRect(-w / 2, -h * 0.08, w, h * 0.05); ctx.fillRect(-w / 2, h * 0.22, w, h * 0.05);
    ctx.fillStyle = '#ffffff30'; rr(-w * 0.36, -h * 0.34, w * 0.72, h * 0.2, 4); ctx.fill(); // roof hatch
    ctx.fillStyle = '#0b1d26'; rr(-w * 0.42, -h * 0.48, w * 0.84, h * 0.09, 4); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; rr(-w * 0.44, -h * 0.5 + 1, w * 0.18, 4, 2); ctx.fill(); rr(w * 0.26, -h * 0.5 + 1, w * 0.18, 4, 2); ctx.fill();
    ctx.restore();
  }
  function drawVehicle(it, x, y, g) {
    if (it.kind === 'bus') return drawBus(x, y, g.carW * 1.12, g.carH * 1.6);
    if (it.kind === 'tuk') drawTuk(x, y, g.carW, g.carH);
    else if (it.kind === 'bike') drawBike(x, y, g.carW, g.carH * 0.85, it.hue);
    else if (it.kind === 'van') drawVan(x, y, g.carW * 1.05, g.carH, it.hue);
    else drawCar(x, y, g.carW, g.carH, it.hue, { dark: '#0005' });
  }
  function drawPalm(x, y, r) {
    ctx.strokeStyle = '#8d7957'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + 24 * r); ctx.quadraticCurveTo(x - 8, y, x, y - 14 * r); ctx.stroke();
    for (let leaf = 0; leaf < 7; leaf++) {
      const a = leaf * Math.PI * 2 / 7;
      ctx.strokeStyle = leaf % 2 ? '#70ac65' : '#398858'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y - 14 * r);
      ctx.quadraticCurveTo(x + Math.cos(a) * 18 * r, y - 14 * r + Math.sin(a) * 12 * r, x + Math.cos(a) * 26 * r, y - 7 * r + Math.sin(a) * 22 * r); ctx.stroke();
    }
  }

  function draw() {
    const g = geo();
    ctx.save();
    if (S && S.shake > 0) ctx.translate((Math.random() - 0.5) * 12 * S.shake, (Math.random() - 0.5) * 12 * S.shake);
    const sc0 = S ? S.scroll : 0, sc = sc0 % 80;
    // sea + beach (left), grass (right)
    const sea = ctx.createLinearGradient(0, 0, W * 0.085, 0); sea.addColorStop(0, '#05606c'); sea.addColorStop(1, '#0a8c98');
    ctx.fillStyle = '#175643'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = sea; ctx.fillRect(0, 0, W * 0.085, H);
    ctx.fillStyle = '#ffffff30'; for (let y = -80 + sc * 0.6 % 80; y < H; y += 80) ctx.fillRect(W * 0.07, y, W * 0.015, 30);
    ctx.fillStyle = '#d9c795'; ctx.fillRect(W * 0.085, 0, W * 0.045, H);
    ctx.fillStyle = '#1a5c3b'; for (let y = -80 + sc; y < H; y += 80) ctx.fillRect(W - g.verge, y, g.verge, 40);
    // asphalt with scrolling texture
    ctx.save(); ctx.beginPath(); ctx.rect(g.verge, 0, g.roadW, H); ctx.clip();
    ctx.translate(0, sc0 % 96); ctx.fillStyle = asphalt || '#2f3a42'; ctx.fillRect(g.verge, -96, g.roadW, H + 192); ctx.restore();
    const shade = ctx.createLinearGradient(g.verge, 0, W - g.verge, 0);
    shade.addColorStop(0, '#0005'); shade.addColorStop(0.15, '#0000'); shade.addColorStop(0.85, '#0000'); shade.addColorStop(1, '#0005');
    ctx.fillStyle = shade; ctx.fillRect(g.verge, 0, g.roadW, H);
    // kerbs (SLIC coral/white)
    for (let y = -80 + sc; y < H; y += 40) {
      ctx.fillStyle = (Math.floor((y - sc) / 40) % 2) ? '#ed4d60' : '#ffffff';
      ctx.fillRect(g.verge - 7, y, 7, 40); ctx.fillRect(W - g.verge, y, 7, 40);
    }
    // lane lines
    ctx.fillStyle = '#ffffffb8';
    for (let l = 1; l < 3; l++) for (let y = -80 + sc; y < H; y += 80) ctx.fillRect(g.verge + g.laneW * l - 2, y, 4, 44);
    // speed streaks late in the run
    if (S && S.running) { // constant light speed streaks (speed no longer ramps up)
      ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { const sx = g.verge + ((i * 97 + sc0 * 3) % g.roadW); const sy = (i * 173 + sc0 * 9) % H; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + 50); ctx.stroke(); }
    }

    if (S) {
      for (const s of S.side) {
        const x = s.left ? W * 0.108 : W - g.verge / 2;
        if (s.kind === 'palm') drawPalm(x, s.y, s.r);
        else if (s.kind === 'lamp') {
          ctx.fillStyle = '#596770'; ctx.fillRect(x - 1.5, s.y - 20, 3, 34);
          const lg = ctx.createRadialGradient(x, s.y - 20, 1, x, s.y - 20, 22); lg.addColorStop(0, '#ffe9a8cc'); lg.addColorStop(1, '#ffe9a800');
          ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, s.y - 20, 22, 0, 7); ctx.fill();
        } else if (s.kind === 'sign' && !s.left) {
          // SLIC roadside service sign on a post
          const bw = g.verge * 0.9, bh = bw * 0.62, [l1, l2] = SIGNS[s.sign];
          ctx.fillStyle = '#596770'; ctx.fillRect(x - 1.5, s.y, 3, bh * 0.9);
          ctx.fillStyle = '#0008'; rr(x - bw / 2 + 2, s.y - bh / 2 + 3, bw, bh, 3); ctx.fill();
          ctx.fillStyle = '#00adb8'; rr(x - bw / 2, s.y - bh / 2, bw, bh, 3); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = `900 ${Math.max(6, bh * 0.3)}px Inter, sans-serif`; ctx.fillText(l1, x, s.y - bh * 0.18, bw - 4);
          ctx.font = `800 ${Math.max(5, bh * 0.22)}px Inter, sans-serif`; ctx.fillText(l2, x, s.y + bh * 0.2, bw - 4);
        } else if (!s.left) {
          const bw = g.verge * 0.86, bh = bw * 0.8;
          ctx.fillStyle = '#0008'; ctx.fillRect(x - bw / 2 + 3, s.y - bh / 2 + 4, bw, bh);
          ctx.fillStyle = '#fff'; ctx.fillRect(x - bw / 2, s.y - bh / 2, bw, bh);
          if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, x - bw / 2 + 2, s.y - bh / 2 + 2, bw - 4, bh - 4);
        }
      }
      for (const it of S.items) {
        const x = laneX(it.lane), y = it.y, s = g.laneW * 0.22;
        if (it.type === 'car') drawVehicle(it, x, y, g);
        else if (it.type === 'cone') {
          if (it.kind === 'barrier') {
            const bw = g.laneW * 0.62, bh = s * 0.9;
            ctx.fillStyle = '#0006'; ctx.fillRect(x - bw / 2 + 3, y - bh / 2 + 4, bw, bh);
            ctx.save(); ctx.beginPath(); ctx.rect(x - bw / 2, y - bh / 2, bw, bh); ctx.clip();
            ctx.fillStyle = '#fff'; ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
            ctx.fillStyle = '#ed4d60'; for (let k = -bw; k < bw; k += 14) { ctx.beginPath(); ctx.moveTo(x + k, y + bh / 2); ctx.lineTo(x + k + 7, y + bh / 2); ctx.lineTo(x + k + 7 + bh, y - bh / 2); ctx.lineTo(x + k + bh, y - bh / 2); ctx.fill(); }
            ctx.restore();
            ctx.fillStyle = '#ffce69'; ctx.beginPath(); ctx.arc(x - bw / 2 + 4, y - bh / 2, 3, 0, 7); ctx.arc(x + bw / 2 - 4, y - bh / 2, 3, 0, 7); ctx.fill();
          } else {
            ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(x + 3, y + s * 0.8, s * 0.9, s * 0.35, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.75, y + s * 0.8); ctx.lineTo(x - s * 0.75, y + s * 0.8); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(x - s * 0.4, y, s * 0.8, s * 0.25);
            ctx.fillStyle = '#ffcc00'; ctx.fillRect(x - s * 1.2, y + s * 0.8, s * 2.4, s * 0.25);
          }
        } else if (it.type === 'flood') {
          const fw = g.laneW * 0.46, fh = s * 1.1;
          const wg = ctx.createRadialGradient(x, y, 2, x, y, fw); wg.addColorStop(0, '#3fa7c9dd'); wg.addColorStop(0.7, '#1d6e8fcc'); wg.addColorStop(1, '#1d6e8f00');
          ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(x, y, fw, fh, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = '#bff1ff88'; ctx.lineWidth = 1.5;
          for (let k = 0; k < 2; k++) { const rp = ((it.ph * 0.4 + k * 0.5) % 1); ctx.globalAlpha = 1 - rp; ctx.beginPath(); ctx.ellipse(x, y, fw * 0.3 + fw * 0.6 * rp, fh * 0.3 + fh * 0.6 * rp, 0, 0, 7); ctx.stroke(); }
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#ffffffcc'; ctx.font = `800 ${Math.max(8, s * 0.42)}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FLOOD', x, y);
        } else if (it.type === 'hole') {
          ctx.fillStyle = '#1a2227'; ctx.beginPath(); ctx.ellipse(x, y, s * 1.2, s * 0.75, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#3d6b8a99'; ctx.beginPath(); ctx.ellipse(x, y + 2, s * 0.9, s * 0.5, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = '#0b1114'; ctx.lineWidth = 2; ctx.stroke();
        } else if (it.type === 'shield') {
          const k = 1 + Math.sin(it.ph) * 0.08, ss = s * 1.15 * k;
          const gl = ctx.createRadialGradient(x, y, 2, x, y, ss * 2); gl.addColorStop(0, '#4fe3dc88'); gl.addColorStop(1, '#4fe3dc00');
          ctx.fillStyle = gl; ctx.fillRect(x - ss * 2, y - ss * 2, ss * 4, ss * 4);
          shieldPath(x, y, ss);
          const sg = ctx.createLinearGradient(x - ss, y - ss, x + ss, y + ss); sg.addColorStop(0, '#5ff0e8'); sg.addColorStop(1, '#00808a');
          ctx.fillStyle = sg; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
          shieldPath(x, y + ss * 0.08, ss * 0.55); ctx.fillStyle = '#ed4d60'; ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = `900 ${ss * 0.42}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SLIC', x, y - ss * 0.02);
        } else if (it.type === 'gold') {
          // Gold shield (+200): same shape and pulse as the teal shield, gold rim, SLIC logo in the centre
          const k = 1 + Math.sin(it.ph) * 0.08, ss = s * 1.15 * k;
          const gl = ctx.createRadialGradient(x, y, 2, x, y, ss * 2); gl.addColorStop(0, '#ffce6999'); gl.addColorStop(1, '#ffce6900');
          ctx.fillStyle = gl; ctx.fillRect(x - ss * 2, y - ss * 2, ss * 4, ss * 4);
          shieldPath(x, y, ss);
          const sg = ctx.createLinearGradient(x - ss, y - ss, x + ss, y + ss); sg.addColorStop(0, '#fff1c2'); sg.addColorStop(0.45, '#ffce69'); sg.addColorStop(1, '#b48420');
          ctx.fillStyle = sg; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
          ctx.save();
          shieldPath(x, y + ss * 0.04, ss * 0.68); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
          if (logo.complete && logo.naturalWidth) { const lw = ss * 1.15, lh = lw * logo.naturalHeight / logo.naturalWidth; ctx.drawImage(logo, x - lw / 2, y - lh / 2 - ss * 0.05, lw, lh); }
          ctx.restore();
        }
      }
      const blink = S.inv > 0 && Math.floor(S.inv * 12) % 2 === 0;
      if (!blink) drawCar(S.x, g.py, g.carW * 1.08, g.carH * 1.08, '#00afba', { brand: true, dark: '#047882', tilt: S.tilt });
      if (S.protect) {
        const r = g.carH * 0.72, a = 0.5 + Math.sin(performance.now() / 150) * 0.15;
        ctx.strokeStyle = `rgba(79,227,220,${a})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(S.x, g.py, r * 0.62, r, 0, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(79,227,220,.10)'; ctx.fill();
      }
      for (const p of S.parts) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      for (const t of S.texts) {
        ctx.globalAlpha = Math.min(1, t.life * 1.5); ctx.font = t.small ? '900 13px Inter, sans-serif' : '900 22px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.lineWidth = 5; ctx.strokeStyle = '#04121a'; ctx.strokeText(t.txt, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y);
      }
      ctx.globalAlpha = 1;
      if (S.flash > 0) { ctx.fillStyle = `rgba(237,77,96,${S.flash})`; ctx.fillRect(0, 0, W, H); }
    }
    ctx.restore();
  }

  // ================= FINISH & ELIGIBILITY =================
  function countUp(el, value) {
    let v = 0; const step = Math.max(1, value / 35);
    const id = setInterval(() => { v = Math.min(value, v + step); el.textContent = Math.floor(v).toLocaleString(); if (v >= value) clearInterval(id); }, 25);
  }
  function finish() {
    S.running = false; cancelAnimationFrame(raf); playing(false);
    const score = Math.floor(S.score);
    const eligible = score > CONFIG.eligibilityThreshold;
    const rec = Store.update({ status: 'COMPLETED', gameCompleted: true, score, shields: S.shields, coins: S.coins, dodged: S.dodged, eligible, scoreSaved: !ONLINE });
    if (!ONLINE) { Store.addScore(rec); return route(rec, true); }
    saveScore(true);
  }
  // Results are only shown once the server has confirmed the score.
  function saveScore(fresh) {
    const rec = Store.current();
    if (!rec) return show('reg');
    saving('SAVING YOUR SCORE…', 'Great drive! Hold tight while we record your result.');
    Api.updateGameScore(rec.playerId, rec.score, rec.accessKey).then((res) => {
      const saved = Store.update({ scoreSaved: true, eligible: typeof res.eligible === 'boolean' ? res.eligible : rec.eligible });
      Store.addScore(saved);
      route(saved, fresh);
    }).catch((err) => saveFailed(err.message, () => saveScore(fresh)));
  }

  // Decide which screen a saved record belongs on (also used when the page is reopened).
  function route(rec, fresh) {
    if (!rec) return show('reg');
    if (rec.status === 'REGISTERED') {
      $('pname').value = rec.name; $('pphone').value = rec.mobile;
      return show('reg');
    }
    if (rec.status === 'IN_PROGRESS' || rec.status === 'INTERRUPTED') {
      if (rec.status === 'IN_PROGRESS') Store.update({ status: 'INTERRUPTED' });
      return show('endedOv');
    }
    // COMPLETED
    if (ONLINE && rec.scoreSaved === false) return saveScore(false);
    if (!rec.eligible) {
      $('stShield').textContent = rec.shields || 0; $('stCoin').textContent = rec.coins || 0; $('stDodge').textContent = rec.dodged || 0;
      show('doneOv');
      if (fresh) { countUp($('doneScore'), rec.score); tone(523, 0.12); setTimeout(() => tone(659, 0.2), 120); }
      else $('doneScore').textContent = rec.score.toLocaleString();
      return;
    }
    if (rec.awarenessCompleted) return showResult(rec, false);
    if (Array.isArray(rec.pendingAnswers)) return submitChallenge(false);
    if (rec.followConfirmed) return openQuiz();
    show('eligibleOv');
    if (fresh) { countUp($('eligScore'), rec.score); sfx.fanfare(); buzz([40, 30, 40, 30, 120]); confetti(); }
    else $('eligScore').textContent = rec.score.toLocaleString();
  }

  // ================= FACEBOOK =================
  // Following is self-declared: we only know the page was opened and the player tapped "Yes".
  function fbConfirmMode(on) {
    $('fbBtn').hidden = on;
    $('fbConfirm').hidden = !on;
    $('fbTiny').textContent = on
      ? 'Your answer is self-declared. Thank you for staying connected with SLIC General!'
      : 'Opens in a new tab. Your game is saved – come back here to continue.';
  }
  $('toFacebook').onclick = () => {
    const rec = Store.current();
    fbConfirmMode(!!(rec && rec.facebookVisited));
    show('fbOv');
  };
  $('fbLink').href = CONFIG.facebookUrl;
  function visitFacebook() {
    Store.update({ facebookVisited: true });
    fbConfirmMode(true);
  }
  $('fbBtn').onclick = () => { window.open(CONFIG.facebookUrl, '_blank', 'noopener'); visitFacebook(); };
  $('fbLink').onclick = visitFacebook;
  $('toQuiz').onclick = () => { Store.update({ followConfirmed: true }); openQuiz(); };

  // ================= SERVICE AWARENESS CHALLENGE =================
  let qIndex = 0, answers = [], picks = [];
  function openQuiz() {
    const rec = Store.current();
    if (!rec || !rec.eligible) return route(rec);
    if (rec.awarenessCompleted) return showResult(rec, false);
    qIndex = 0; picks = AWARENESS_QUESTIONS.map(() => null); // no default – the player must choose an option
    show('quizOv');
    renderQuestion(false);
  }
  function renderQuestion(animate) {
    const q = AWARENESS_QUESTIONS[qIndex], n = AWARENESS_QUESTIONS.length;
    const card = $('quizCard');
    const fill = () => {
      $('quizNum').textContent = String(qIndex + 1).padStart(2, '0');
      $('quizOf').textContent = `QUESTION ${qIndex + 1} OF ${n}`;
      $('quizIcon').textContent = q.icon;
      $('quizService').textContent = q.service.toUpperCase();
      $('quizQ').textContent = q.question;
      renderChoices(q);
      $('quizNext').textContent = qIndex === n - 1 ? 'SEE MY RESULT →' : 'NEXT QUESTION →';
      $('quizBar').style.width = ((qIndex + 1) / n) * 100 + '%';
    };
    if (!animate) { fill(); return; }
    card.classList.add('out');
    setTimeout(() => { fill(); card.classList.remove('out'); card.classList.add('in'); setTimeout(() => card.classList.remove('in'), 400); }, 220);
  }
  // Option buttons for the current question (True/False side by side, multiple choice stacked).
  function renderChoices(q) {
    const box = $('quizChoices');
    box.textContent = '';
    box.classList.toggle('many', q.options.length > 2);
    q.options.forEach((label, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice opt'; b.setAttribute('role', 'radio');
      const mark = document.createElement('b'); mark.textContent = q.options.length > 2 ? String.fromCharCode(65 + i) : (i === 0 ? '✓' : '✕');
      const text = document.createElement('span'); text.textContent = q.options.length > 2 ? label.replace(/^[A-D]\.\s*/, '') : label.toUpperCase();
      b.append(mark, text);
      b.onclick = () => { setChoice(i); tone(720, 0.08); buzz(10); };
      box.append(b);
    });
    setChoice(picks[qIndex]);
  }
  // pick: chosen option index, or null (nothing highlighted, Next disabled)
  function setChoice(pick) {
    picks[qIndex] = pick;
    [...$('quizChoices').children].forEach((b, i) => { b.classList.toggle('sel', i === pick); b.setAttribute('aria-checked', String(i === pick)); });
    $('quizNext').disabled = typeof pick !== 'number';
  }
  $('quizNext').onclick = () => {
    if (screen !== 'quizOv' || typeof picks[qIndex] !== 'number') return;
    if (qIndex < AWARENESS_QUESTIONS.length - 1) { qIndex++; tone(660, 0.06); renderQuestion(true); return; }
    // One boolean per question: true = answered correctly.
    answers = AWARENESS_QUESTIONS.map((q, i) => picks[i] === q.correct);
    Store.update({ pendingAnswers: answers.slice() });
    submitChallenge(true);
  };
  // Sends the five answers; the result screen uses the awareness score and winner status returned by the server.
  function submitChallenge(fresh) {
    const rec = Store.current();
    if (!rec || !Array.isArray(rec.pendingAnswers)) return route(rec);
    const a = rec.pendingAnswers.slice();
    const finalise = (awarenessScore, isWinner) => {
      const saved = Store.update({
        awarenessAnswers: a, awarenessScore, awarenessCompleted: true, isWinner,
        awarenessCompletedAt: Store.nowSL(), pendingAnswers: null
      });
      if (isWinner) Store.markWinner(saved.playerId);
      showResult(saved, fresh);
    };
    const local = () => finalise(a.filter(Boolean).length, a.every((x) => x === true));
    if (!ONLINE) return local();
    saving('CHECKING YOUR ANSWERS…', 'Saving your Service Awareness Challenge result.');
    Api.completeChallenge(rec.playerId, rec.followConfirmed === true, a, rec.accessKey).then((res) => {
      const n = Number(res.awarenessScore);
      if (!Number.isFinite(n) || typeof res.winner !== 'boolean') throw new Error('Unexpected server response.');
      finalise(n, res.winner);
    }).catch((err) => {
      // Retry after a lost response: the server already stored these exact answers for this playerId.
      if (err.server && /already completed/i.test(err.message)) return local();
      saveFailed(err.message, () => submitChallenge(fresh));
    });
  }
  // ================= RESULTS =================
  function showResult(rec, fresh) {
    const score = (rec.score || 0).toLocaleString();
    if (rec.isWinner) {
      $('winName').textContent = rec.name;
      $('winScore').textContent = score;
      show('winOv');
      if (fresh) { sfx.fanfare(); buzz([40, 30, 40, 30, 120]); confetti(); setTimeout(confetti, 1400); }
    } else {
      const a = Array.isArray(rec.awarenessAnswers) ? rec.awarenessAnswers : [];
      $('thName').textContent = rec.name;
      $('thScore').textContent = score;
      $('thKnown').textContent = `${rec.awarenessScore || 0} out of ${AWARENESS_QUESTIONS.length}`;
      $('thList').innerHTML = AWARENESS_QUESTIONS.filter((q, i) => a[i] !== true)
        .map((q) => `<li><span class="dl-icon" aria-hidden="true">${q.icon}</span><span><b>${esc(q.service)}</b>${esc(q.more)}</span></li>`).join('');
      show('thanksOv');
      if (fresh) { tone(523, 0.12); setTimeout(() => tone(659, 0.2), 120); }
    }
  }
  // ================= ALL WINNERS (live from Google Sheets) =================
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // entries: [{ name, score, awareness, winner, me }]
  function boardRows(entries) {
    return entries.map((e, i) => `<div class="${i < 3 ? 'rank' + (i + 1) : ''}${e.me ? ' me' : ''}"><span><span class="pos">${String(i + 1).padStart(2, '0')}</span> ${e.winner ? '<span class="hof-cup" title="5/5 awareness winner" aria-label="Awareness challenge winner">🏆</span> ' : ''}${esc(e.name)}${e.me ? ' <small class="you">YOU</small>' : ''}${e.awareness != null && isFinite(e.awareness) ? ` <small class="hof-aw">${Number(e.awareness)}/5</small>` : ''}</span><strong>${Number(e.score).toLocaleString()}</strong></div>`).join('');
  }
  function renderLocalBoard(id, rec) {
    const top = Store.board();
    $(id).innerHTML = top.length
      ? boardRows(top.map((e) => ({ name: e.name, score: e.score, winner: e.won, me: rec && e.id === rec.playerId })))
      : '<div class="empty-score">No results yet.</div>';
  }
  let boardReq = 0;
  function renderBoard(id, rec) {
    if (!ONLINE) return renderLocalBoard(id, rec);
    const req = ++boardReq;
    $(id).innerHTML = '<div class="empty-score">Loading all players…</div>';
    Api.getLeaderboard(rec && rec.playerId).then((res) => {
      if (req !== boardReq) return;
      const list = Array.isArray(res.players) ? res.players.filter((p) => p && isFinite(p.score)) : [];
      $(id).innerHTML = list.length ? boardRows(list) : '<div class="empty-score">No results yet – be the first!</div>';
    }).catch(() => {
      if (req !== boardReq) return;
      $(id).innerHTML = '<div class="empty-score">Could not load the live results. <button class="link-btn" type="button" id="boardRetry">Try again</button></div>';
      $('boardRetry').onclick = () => renderBoard(id, Store.current());
    });
  }
  document.querySelectorAll('[data-hof]').forEach((b) => {
    b.onclick = () => {
      $('boardBack').dataset.back = screen;
      renderBoard('board', Store.current());
      show('boardOv');
    };
  });
  $('boardBack').onclick = () => route(Store.current(), false);

  // ================= CONFETTI =================
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = $('confetti'), x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0);
    const cols = ['#00afba', '#ed4d60', '#ffce69', '#ffffff', '#4fe3dc'];
    const ps = Array.from({ length: 150 }, () => ({ x: W / 2, y: H * 0.35, vx: (Math.random() - 0.5) * 720, vy: -Math.random() * 720 - 200, r: Math.random() * 6, c: cols[(Math.random() * 5) | 0], s: 4 + Math.random() * 6 }));
    let t = performance.now();
    const f = (now) => {
      const dt = Math.min(0.05, (now - t) / 1000); t = now; x.clearRect(0, 0, W, H); let alive = false;
      for (const p of ps) {
        p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 8; if (p.y < H + 20) alive = true;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore();
      }
      if (alive) requestAnimationFrame(f); else x.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(f);
  }

  // ================= BOOT =================
  addEventListener('resize', resize); resize();
  S = newState(); seedSide();
  // Attract-mode road behind the screens
  (function idle() {
    if (!S.running) {
      const dt = 1 / 60; S.scroll = (S.scroll + H * 0.4 * dt) % 480;
      for (const s of S.side) s.y += H * 0.4 * dt;
      S.side = S.side.filter((s) => s.y < H + 120);
      while (S.side.length < 9) addSide(Math.min(...S.side.map((s) => s.y), H) - H * 0.3);
      S.x = laneX(1); draw();
    }
    requestAnimationFrame(idle);
  })();
  if (MULTI_ATTEMPTS) {
    // Testing Mode: every visit starts at an empty registration form. An unfinished earlier session is closed off.
    const prev = Store.current();
    if (prev && prev.status === 'IN_PROGRESS') Store.update({ status: 'INTERRUPTED' });
    $('pname').value = ''; $('pphone').value = '';
    // Finish any save that was cut off (e.g. page reloaded while offline) before allowing a new registration.
    if (ONLINE && prev && prev.status === 'COMPLETED' && (prev.scoreSaved === false || Array.isArray(prev.pendingAnswers))) route(prev, false);
    else show('reg');
  } else {
    route(Store.current(), false);
  }
})();

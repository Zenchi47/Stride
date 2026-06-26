// ══════════════════════════════════════════
// js/workout.js — GPS · Cadence · Workout state
// Depends on: core.js
// ══════════════════════════════════════════

// ── Tracking mode ────────────────────────
let mode = 'manual';

function setMode(m) {
  mode = m;
  document.getElementById('mbtn-gps').classList.toggle('sel', m === 'gps');
  document.getElementById('mbtn-manual').classList.toggle('sel', m === 'manual');
  document.getElementById('gps-panel').classList.toggle('hidden', m !== 'gps');
  document.getElementById('manual-panel').classList.toggle('hidden', m !== 'manual');
  const liveCard = document.getElementById('live-card');
  if (m === 'gps') liveCard.classList.remove('hidden');
  else if (!W.active && !W.paused) liveCard.classList.add('hidden');
}

// ── GPS permission ────────────────────────
let gpsGranted = false;

function setPill(type, txt) {
  const el = document.getElementById('gps-pill');
  el.textContent = txt; el.className = 'gps-pill ' + type;
}
function setGPSMsg(txt) { document.getElementById('gps-msg').textContent = txt; }

function askGPS() {
  if (!navigator.geolocation) {
    setPill('gps-err', '❌ No GPS');
    setGPSMsg('Your browser or device does not support GPS.');
    return;
  }
  const btn = document.getElementById('gps-req-btn');
  btn.textContent = '⏳ Waiting…'; btn.disabled = true;
  setGPSMsg('A popup may appear at the top of Chrome. Tap "Allow". Works fully offline — no WiFi or data needed.');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      gpsGranted = true;
      const acc = Math.round(pos.coords.accuracy);
      setPill('gps-ok', `✅ GPS ready ±${acc}m`);
      setGPSMsg('GPS working — keeps working offline. You can now start a workout.');
      btn.textContent = '✅ GPS Granted — Ready!'; btn.disabled = false; btn.classList.add('hidden');
      document.getElementById('btn-start').disabled = false;
    },
    (err) => {
      btn.textContent = '📡 Try Again'; btn.disabled = false; gpsGranted = false;
      if (err.code === 1) {
        const isHttp = location.protocol === 'http:' && location.hostname !== 'localhost';
        if (isHttp) {
          setPill('gps-err', '❌ http:// blocks GPS');
          setGPSMsg('Android Chrome blocks GPS on http://. Use Manual mode, or open via file:// or https://.');
        } else {
          setPill('gps-err', '❌ Permission denied');
          setGPSMsg('Tapped Deny, or Chrome blocked it. Open Chrome ⋮ → Settings → Site Settings → Location → find this site → Allow. Then tap Try Again.');
        }
      } else if (err.code === 2) {
        setPill('gps-warn', '⚠️ No signal');
        setGPSMsg('No GPS signal. Go outside away from tall buildings, then tap Try Again.');
      } else {
        setPill('gps-warn', '⚠️ Timeout');
        setGPSMsg('GPS timed out. Go outside and tap Try Again.');
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

// ── Cadence via DeviceMotion ──────────────
// iOS 13+ requires an explicit DeviceMotionEvent.requestPermission() call,
// triggered by a user gesture, before 'devicemotion' will ever fire.
// Without this, the code would just silently never receive events on
// iPhone — cadence/step count would sit at "--"/0 forever with no
// indication of why. Android (and older iOS/desktop) doesn't have this
// API at all, so requestPermission is only called when it actually exists.
const CADENCE = {
  stepCount: 0,
  stepTimes: [],
  lastMag: 0,
  threshold: 1.5,   // g-force delta to count a step
  cooldown: 250,    // ms minimum between steps
  lastStep: 0,
  motionHandler: null,
  permissionState: 'unknown', // 'unknown' | 'granted' | 'denied' | 'unsupported'

  // Must be called from a user-gesture handler (e.g. the Start button tap)
  // on iOS, or the permission prompt will not appear at all.
  async requestPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const result = await DeviceMotionEvent.requestPermission();
        this.permissionState = result === 'granted' ? 'granted' : 'denied';
      } catch (_) {
        this.permissionState = 'denied';
      }
    } else if (window.DeviceMotionEvent) {
      // No requestPermission() needed (Android, older iOS, desktop) —
      // motion events work without an explicit prompt.
      this.permissionState = 'granted';
    } else {
      this.permissionState = 'unsupported';
    }
    return this.permissionState;
  },

  // Returns true if cadence tracking actually started, false otherwise —
  // callers can use this to show a clear message instead of a silent "--".
  async start() {
    if (this.permissionState === 'unknown') await this.requestPermission();

    if (this.permissionState !== 'granted') {
      const hint = document.getElementById('cadence-hint');
      if (this.permissionState === 'denied') {
        hint.textContent = 'Motion permission denied — steps unavailable. Re-enable in Settings → Safari → Motion & Orientation Access.';
      } else {
        hint.textContent = 'Step/cadence tracking is not supported on this device.';
      }
      hint.style.color = 'var(--warn)';
      return false;
    }

    this.stepCount = 0; this.stepTimes = []; this.lastMag = 0; this.lastStep = 0;
    this.motionHandler = (e) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const mag = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
      const delta = Math.abs(mag - this.lastMag);
      const now = Date.now();
      if (delta > this.threshold && now - this.lastStep > this.cooldown) {
        this.stepCount++;
        this.lastStep = now;
        this.stepTimes.push(now);
        const cutoff = now - 10000;
        this.stepTimes = this.stepTimes.filter(t => t > cutoff);
        this._updateUI();
      }
      this.lastMag = mag;
    };
    window.addEventListener('devicemotion', this.motionHandler, { passive: true });
    return true;
  },

  stop() {
    if (this.motionHandler) {
      window.removeEventListener('devicemotion', this.motionHandler);
      this.motionHandler = null;
    }
  },

  _updateUI() {
    const spm = this.stepTimes.length >= 2
      ? Math.round((this.stepTimes.length / ((Date.now() - this.stepTimes[0]) / 1000)) * 60)
      : 0;
    document.getElementById('cadence-val').textContent = spm || '--';
    document.getElementById('step-count').textContent = this.stepCount;
    const hint = document.getElementById('cadence-hint');
    if (spm > 0) {
      if (spm < 160)       { hint.textContent = `${spm} spm — try to increase cadence`; hint.style.color = 'var(--warn)'; }
      else if (spm <= 185) { hint.textContent = `${spm} spm — great cadence ✓`;         hint.style.color = 'var(--green)'; }
      else                 { hint.textContent = `${spm} spm — slightly high`;            hint.style.color = 'var(--blue)'; }
    } else {
      hint.textContent = 'Target: 170–180 spm';
      hint.style.color = 'var(--muted)';
    }
  },

  reset() {
    this.stepCount = 0; this.stepTimes = []; this.lastMag = 0; this.lastStep = 0;
    document.getElementById('cadence-val').textContent = '--';
    document.getElementById('step-count').textContent = '0';
    document.getElementById('cadence-hint').textContent = 'Target: 170–180 spm';
    document.getElementById('cadence-hint').style.color = 'var(--muted)';
  },
};

// ── Workout state object ──────────────────
const W = {
  active: false, type: 'run',
  startTime: 0, elapsed: 0,
  distM: 0, elevUp: 0, elevDown: 0,
  lastAlt: null, altBuf: [],
  paceWin: [], lastLat: null, lastLon: null, lastGPSt: null, lastAcc: null,
  speedKmh: 0, paceSecKm: 0, bestPace: Infinity,
  paceHistory: [],
  lapStartM: 0, lapStartT: 0, lapPaceSec: 0, lapCount: 0,
  fastestKmSec: Infinity,
  route: [],   // [[lat,lon], …] for post-workout replay
  goalKm: 5, goalOn: true, goalReached: false,
  timerIv: null, watchId: null,
  paused: false, pausedAt: 0, totalPaused: 0,
};

// ── GPS watch ─────────────────────────────
const GPS_MAX_ACCURACY = 25;
const MAX_HUMAN_SPEED_MS = 7;

function startGPSWatch() {
  if (W.watchId !== null) return;
  W.watchId = navigator.geolocation.watchPosition(onPos, onPosErr, {
    enableHighAccuracy: true, timeout: 20000, maximumAge: 0,
  });
}
function stopGPSWatch() {
  if (W.watchId !== null) { navigator.geolocation.clearWatch(W.watchId); W.watchId = null; }
}

function onPos(pos) {
  const { latitude: lat, longitude: lon, altitude: alt, accuracy: acc } = pos.coords;
  const ts = pos.timestamp;

  setPill(
    acc < 15 ? 'gps-ok' : acc <= GPS_MAX_ACCURACY ? 'gps-warn' : 'gps-err',
    acc < 15 ? `✅ GPS ±${Math.round(acc)}m` : acc <= GPS_MAX_ACCURACY ? `📡 GPS ±${Math.round(acc)}m` : `⚠️ Weak GPS ±${Math.round(acc)}m`
  );

  if (!W.active || W.paused) return;
  if (acc > GPS_MAX_ACCURACY) return;

  // Store route point (thinned to 500 max)
  const last = W.route[W.route.length - 1];
  if (!last || haversine(last[0], last[1], lat, lon) > 10) {
    W.route.push([lat, lon]);
    if (W.route.length > 500) W.route = W.route.filter((_, i) => i % 2 === 0);
  }

  if (W.lastLat !== null) {
    const dist = haversine(W.lastLat, W.lastLon, lat, lon);
    const dtSec = (ts - W.lastGPSt) / 1000;
    const lastAcc = W.lastAcc ?? acc;
    const noiseFloor = Math.max(3, (acc + lastAcc) * 0.5);
    const impliedSpeed = dtSec > 0 ? dist / dtSec : 0;

    if (dtSec > 0.5 && dtSec < 30 && dist > noiseFloor && dist <= 150 && impliedSpeed <= MAX_HUMAN_SPEED_MS) {
      W.distM += dist; W.speedKmh = impliedSpeed * 3.6;
      if (W.distM > 10) {
        const raw = 1000 / impliedSpeed;
        W.paceWin.push(raw); if (W.paceWin.length > 8) W.paceWin.shift();
        W.paceSecKm = W.paceWin.reduce((a, b) => a + b, 0) / W.paceWin.length;
        if (W.paceSecKm > 30 && W.paceSecKm < W.bestPace) W.bestPace = W.paceSecKm;
        W.paceHistory.push(W.paceSecKm); if (W.paceHistory.length > 60) W.paceHistory.shift();

        // Lap every 1 km
        if (W.distM - W.lapStartM >= 1000) {
          const lapSec = W.elapsed - W.lapStartT;
          W.lapPaceSec = lapSec; W.lapCount++;
          if (lapSec > 0 && lapSec < W.fastestKmSec) W.fastestKmSec = lapSec;
          W.lapStartM = W.distM; W.lapStartT = W.elapsed;
          showLapToast(W.lapCount, lapSec);
        }
      }
      W.lastLat = lat; W.lastLon = lon; W.lastGPSt = ts; W.lastAcc = acc;
    } else if (dtSec >= 30 || W.lastLat === null) {
      W.lastLat = lat; W.lastLon = lon; W.lastGPSt = ts; W.lastAcc = acc;
    }
  } else {
    W.lastLat = lat; W.lastLon = lon; W.lastGPSt = ts; W.lastAcc = acc;
  }

  // Elevation (5-sample moving average)
  if (alt !== null && acc <= GPS_MAX_ACCURACY) {
    W.altBuf.push(alt); if (W.altBuf.length > 5) W.altBuf.shift();
    const sm = W.altBuf.reduce((a, b) => a + b, 0) / W.altBuf.length;
    if (W.lastAlt !== null) {
      const d = sm - W.lastAlt;
      if (d > 1) W.elevUp += d; else if (d < -1) W.elevDown += -d;
    }
    W.lastAlt = sm;
  }

  updateLiveUI();

  // Goal completion
  if (W.goalOn && !W.goalReached && W.distM / 1000 >= W.goalKm) {
    W.goalReached = true;
    const lbl = W.goalKm >= 1 ? W.goalKm.toFixed(2) + ' km' : (W.goalKm * 1000).toFixed(0) + ' m';
    document.getElementById('goal-modal-txt').textContent = `${lbl} goal complete! 🎉 Keep going!`;
    document.getElementById('goal-modal').classList.remove('hidden');
    confetti();
    setTimeout(() => closeModal('goal-modal'), 4000);
  }
}

function onPosErr(err) {
  const msgs = { 1: 'GPS denied', 2: 'No signal — go outside', 3: 'GPS timeout' };
  setPill('gps-err', '❌ ' + (msgs[err.code] || 'GPS error'));
}

// ── Lap toast ─────────────────────────────
let lapToastTimer = null;
function showLapToast(lapNum, lapSec) {
  const el = document.getElementById('lap-toast');
  el.textContent = `🏁 Lap ${lapNum} — ${fmtPace(lapSec)} /km`;
  el.classList.add('show');
  if (lapToastTimer) clearTimeout(lapToastTimer);
  lapToastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

// ── Live UI update ────────────────────────
function updateLiveUI() {
  const km = W.distM / 1000;
  document.getElementById('hd').textContent   = km.toFixed(2);
  document.getElementById('hspd').textContent = W.speedKmh.toFixed(1);
  document.getElementById('heu').textContent  = '+' + Math.round(W.elevUp)   + ' m';
  document.getElementById('hed').textContent  = '-' + Math.round(W.elevDown) + ' m';
  document.getElementById('hp-live').textContent = fmtPace(W.paceSecKm);
  const avgPaceVal = km > 0 && W.elapsed > 0 ? W.elapsed / km : 0;
  document.getElementById('hp-avg').textContent  = fmtPace(avgPaceVal);
  document.getElementById('hp-best').textContent = isFinite(W.bestPace) && W.bestPace > 0 ? fmtPace(W.bestPace) : '--:--';
  document.getElementById('hlap').textContent    = W.lapPaceSec > 0 ? fmtPace(W.lapPaceSec) : '--:--';

  // Pace trend mini-bars
  const bars = document.getElementById('pace-bars');
  const hist = W.paceHistory.slice(-20);
  if (hist.length > 1) {
    const minP = Math.min(...hist), maxP = Math.max(...hist), range = maxP - minP || 1;
    bars.innerHTML = hist.map((p, i) => {
      const h   = Math.round(4 + ((p - minP) / range) * 24);
      const rel = (p - minP) / range;
      const col = rel < 0.25 ? 'var(--green)' : rel < 0.6 ? 'var(--blue)' : 'var(--warn)';
      const isLatest = i === hist.length - 1;
      return `<div style="flex:1;height:${h}px;background:${col};border-radius:3px 3px 0 0;opacity:${isLatest ? 1 : 0.55 + (i / hist.length) * 0.45};${isLatest ? 'outline:1px solid rgba(255,255,255,.3)' : ''}"></div>`;
    }).join('');
    document.getElementById('pace-latest-label').textContent = 'Latest: ' + fmtPace(hist[hist.length - 1]);
  }

  // Goal progress bar
  if (W.goalOn) {
    const pct = Math.min(100, (km / W.goalKm) * 100);
    document.getElementById('gbar').style.width = pct + '%';
    document.getElementById('goal-pct').textContent = Math.round(pct) + '%';
    document.getElementById('goal-lbl').textContent = km.toFixed(2) + ' / ' + W.goalKm.toFixed(2) + ' km';
  }
}

// ── Button state helper ───────────────────
function showBtns(state) {
  document.getElementById('btns-idle').classList.toggle('hidden', state !== 'idle');
  const activEl = document.getElementById('btns-active');
  const pauseEl = document.getElementById('btns-paused');
  activEl.classList.toggle('hidden', state !== 'active');
  pauseEl.classList.toggle('hidden', state !== 'paused');
  activEl.style.display = state === 'active' ? 'grid' : '';
  pauseEl.style.display = state === 'paused' ? 'grid' : '';
}

// ── Start / Pause / Resume / Stop ─────────
function startWorkout() {
  if (!gpsGranted) { setGPSMsg('Grant GPS permission first — tap "Request GPS Permission" above.'); return; }
  Object.assign(W, {
    active: true, paused: false,
    startTime: Date.now(), elapsed: 0, pausedAt: 0, totalPaused: 0,
    distM: 0, elevUp: 0, elevDown: 0, lastAlt: null, altBuf: [], paceWin: [],
    lastLat: null, lastLon: null, lastGPSt: null, lastAcc: null,
    speedKmh: 0, paceSecKm: 0, bestPace: Infinity,
    paceHistory: [], lapStartM: 0, lapStartT: 0, lapPaceSec: 0, lapCount: 0, fastestKmSec: Infinity,
    route: [], goalReached: false, goalKm: getGoalKm(),
    goalOn: document.getElementById('tog-goal').classList.contains('on'),
  });
  const isRun = W.type === 'run';
  document.getElementById('home-status').innerHTML = `<span class="sdot on"></span>${isRun ? 'Running' : 'Walking'}…`;
  document.getElementById('type-badge').textContent = isRun ? '🏃 Run' : '🚶 Walk';
  document.getElementById('type-badge').className = 'badge ' + (isRun ? 'bg-g' : 'bg-b');
  document.getElementById('gbar').style.width = '0%';
  document.getElementById('goal-lbl').textContent = W.goalOn ? '0.00 / ' + W.goalKm.toFixed(2) + ' km' : 'No goal set';
  showBtns('active');

  W.timerIv = setInterval(() => {
    if (W.paused) return;
    W.elapsed = (Date.now() - W.startTime - W.totalPaused) / 1000;
    document.getElementById('home-timer').textContent = fmtTime(W.elapsed);
    document.getElementById('hc').textContent = calcCal(W.type, W.elapsed, W.distM / 1000, W.elevUp);
  }, 100);

  startGPSWatch();
  CADENCE.start();
  if ('wakeLock' in navigator) navigator.wakeLock.request('screen').catch(() => {});
}

function pauseWorkout() {
  if (!W.active || W.paused) return;
  W.paused = true; W.pausedAt = Date.now();
  stopGPSWatch(); CADENCE.stop();
  document.getElementById('home-status').innerHTML = '<span class="sdot off"></span>⏸ Paused';
  showBtns('paused');
}

function resumeWorkout() {
  if (!W.active || !W.paused) return;
  W.paused = false; W.totalPaused += Date.now() - W.pausedAt;
  startGPSWatch(); CADENCE.start();
  const isRun = W.type === 'run';
  document.getElementById('home-status').innerHTML = `<span class="sdot on"></span>${isRun ? 'Running' : 'Walking'}…`;
  showBtns('active');
}

function stopWorkout() {
  clearInterval(W.timerIv); stopGPSWatch(); CADENCE.stop(); CADENCE.reset();
  W.active = false; W.paused = false;
  document.getElementById('home-status').innerHTML = '<span class="sdot off"></span>Not started';
  document.getElementById('home-timer').textContent = '00:00';
  showBtns('idle');
  const km = W.distM / 1000;
  if (km < 0.03 || W.elapsed < 10) return;
  saveRecord({
    type: W.type, distKm: +km.toFixed(3), elapsedSec: Math.round(W.elapsed),
    cal: calcCal(W.type, W.elapsed, km, W.elevUp),
    elevUp: +W.elevUp.toFixed(1), elevDown: +W.elevDown.toFixed(1),
    avgPace: W.elapsed > 0 && km > 0 ? W.elapsed / km : 0,
    bestPace: isFinite(W.bestPace) ? W.bestPace : 0,
    fastestKm: isFinite(W.fastestKmSec) ? W.fastestKmSec : 0,
    steps: CADENCE.stepCount,
    route: W.route.length > 1 ? W.route : null,
    goalKm: W.goalOn ? W.goalKm : null, goalReached: W.goalReached, source: 'gps',
  });
}

// ── Manual entry terrain + preview ────────
const TERRAIN = {
  flat:    { grade: '0%',    gainPerKm: 0,   dropPerKm: 0,   label: 'Flat road / treadmill' },
  rolling: { grade: '2–5%', gainPerKm: 35,  dropPerKm: 28,  label: 'Rolling hills' },
  hilly:   { grade: '8–15%',gainPerKm: 115, dropPerKm: 92,  label: 'Hilly / trail' },
  steep:   { grade: '20%+', gainPerKm: 220, dropPerKm: 176, label: 'Steep / mountains' },
};
let currentTerrain = 'flat';

function setTerrain(t) {
  currentTerrain = t;
  ['flat','rolling','hilly','steep'].forEach(k => document.getElementById('tb-' + k).classList.toggle('sel', k === t));
  previewManual();
}

function getDistKm() {
  const v = parseFloat(document.getElementById('m-dist').value) || 0;
  const u = document.getElementById('m-dist-unit').value;
  return u === 'km' ? v : u === 'mi' ? v * 1.60934 : v / 1000;
}

function previewManual() {
  const distKm = getDistKm(), durMin = parseFloat(document.getElementById('m-dur').value) || 0;
  const prev = document.getElementById('manual-preview');
  if (distKm <= 0 || durMin <= 0) { prev.style.display = 'none'; return; }
  prev.style.display = 'block';
  const terrain = TERRAIN[currentTerrain];
  const elevUp = distKm * terrain.gainPerKm;
  const elapsedSec = durMin * 60;
  const paceSecKm = elapsedSec / distKm;
  const type = document.getElementById('btn-run').classList.contains('bg-g') ? 'run' : 'walk';
  const cal = calcCal(type, elapsedSec, distKm, elevUp);
  document.getElementById('prev-pace').textContent = fmtPace(paceSecKm);
  document.getElementById('prev-elev').textContent = Math.round(elevUp) + ' m';
  document.getElementById('prev-cal').textContent  = cal + ' kcal';
}

function saveManual() {
  const distKm = getDistKm(), durMin = parseFloat(document.getElementById('m-dur').value) || 0;
  if (distKm <= 0) { alert('Enter a distance.'); return; }
  if (durMin <= 0) { alert('Enter a duration.'); return; }
  const terrain = TERRAIN[currentTerrain];
  const elevUp     = parseFloat((distKm * terrain.gainPerKm).toFixed(1));
  const elevDown   = parseFloat((distKm * terrain.dropPerKm).toFixed(1));
  const elapsedSec = durMin * 60;
  const type       = document.getElementById('btn-run').classList.contains('bg-g') ? 'run' : 'walk';
  const avgPace    = elapsedSec / distKm;
  const cal        = calcCal(type, elapsedSec, distKm, elevUp);
  const dateVal    = document.getElementById('m-date').value;
  const workoutDate = dateVal ? new Date(dateVal + 'T12:00:00').toISOString() : new Date().toISOString();

  const saved = saveRecord({ type, distKm, elapsedSec, cal, elevUp, elevDown, avgPace, bestPace: avgPace,
    terrain: currentTerrain, goalKm: null, goalReached: false, source: 'manual' }, workoutDate);

  // saveRecord() already showed a storage-error alert if this failed —
  // don't also show the "Saved!" success modal in that case.
  if (!saved) return;

  document.getElementById('m-dist').value = '';
  document.getElementById('m-dur').value  = '';
  document.getElementById('manual-preview').style.display = 'none';
  const lbl = distKm.toFixed(2) + ' km · ' + Math.round(durMin) + ' min · ' + cal + ' kcal · ↑' + Math.round(elevUp) + 'm';
  document.getElementById('save-modal-txt').textContent = lbl;
  document.getElementById('save-modal').classList.remove('hidden');
  confetti();
}

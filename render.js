// ══════════════════════════════════════════
// js/render.js — All DOM rendering functions
// Depends on: core.js, data.js
// ══════════════════════════════════════════

function refreshAll() {
  renderHome();
  renderSettings();
  renderAchievements();
  renderHistory();
}

// ── Rank helper ───────────────────────────
function getRank(km, sec) {
  const score = km * 100 - (sec / 60) * 0.5;
  if (score >= 500) return { icon:'🏆', label:'S', css:'rank-s' };
  if (score >= 200) return { icon:'🥇', label:'A', css:'rank-a' };
  if (score >= 100) return { icon:'🥈', label:'B', css:'rank-b' };
  if (score >= 40)  return { icon:'🥉', label:'C', css:'rank-c' };
  return               { icon:'📗', label:'D', css:'rank-d' };
}

// ── Home page: streak badge + recent 5 ───
function renderHome() {
  const wkts  = DB.get('workouts', []);
  const stats = DB.get('stats', { streak: 0 });
  document.getElementById('streak-badge').textContent = `🔥 ${stats.streak} day streak`;
  const el = document.getElementById('recent-list');
  if (!wkts.length) {
    el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:16px 0;font-size:14px">No workouts yet</div>';
    return;
  }
  el.innerHTML = [...wkts].reverse().slice(0, 5).map(w => {
    const d   = new Date(w.date);
    const lb  = d.toLocaleDateString('en-IN', { weekday:'short', month:'short', day:'numeric' });
    const rk  = getRank(w.distKm, w.elapsedSec);
    const src = w.source === 'manual' ? ' ✏️' : ' 📍';
    return `<div class="wrow">
      <div class="wico">${w.type === 'run' ? '🏃' : '🚶'}</div>
      <div class="winfo">
        <div class="wtitle">${cap(w.type)} · ${w.distKm.toFixed(2)} km${src}</div>
        <div class="wsub">${lb} · ${fmtTime(w.elapsedSec)} · ${w.cal} kcal</div>
      </div>
      <div class="${rk.css}" style="font-size:20px">${rk.icon}</div>
    </div>`;
  }).join('');
}

// ── Settings page ─────────────────────────
function renderSettings() {
  const stats = DB.get('stats', { totalDistKm:0, totalCal:0, totalElevM:0, workouts:0, bestPace:null, totalSec:0 });
  setText('st-dist',  (stats.totalDistKm || 0).toFixed(1));
  setText('st-wkts',  stats.workouts || 0);
  setText('st-cal',   stats.totalCal  || 0);
  setText('st-elev',  Math.round(stats.totalElevM || 0));
  setText('st-bp',    fmtPace(stats.bestPace));
  const ap = stats.workouts > 0 && stats.totalDistKm > 0 ? stats.totalSec / stats.totalDistKm : null;
  setText('st-ap', fmtPace(ap));
  renderWeeklyChart();
}

// ── Weekly bar chart ──────────────────────
function renderWeeklyChart() {
  const wkts = DB.get('workouts', []);
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const data = new Array(7).fill(0);
  const now  = new Date();
  for (const w of wkts) {
    const diff = Math.floor((now - new Date(w.date)) / 86400000);
    if (diff < 7) data[(new Date(w.date).getDay() + 6) % 7] += w.distKm;
  }
  const todayIdx = (now.getDay() + 6) % 7;
  const maxV     = Math.max(...data, 0.5);
  document.getElementById('wkchart').innerHTML = data.map((v, i) => {
    const pct = Math.max(2, Math.round((v / maxV) * 100));
    return `<div class="bar-col">
      <div class="bar-val">${v > 0 ? v.toFixed(1) : ''}</div>
      <div class="bar-fill" style="height:${pct}%"></div>
      <div class="bar-day${i === todayIdx ? ' today' : ''}">${days[i]}</div>
    </div>`;
  }).join('');
}

// ── Achievements page ─────────────────────
function renderAchievements() {
  const earned = DB.get('achievements', {});
  const stats  = DB.get('stats', { totalDistKm:0, totalElevM:0, streak:0 });
  const wkts   = DB.get('workouts', []);
  const maxKm  = wkts.length ? Math.max(...wkts.map(w => w.distKm)) : 0;

  function row(a, prog, total, unit) {
    const ok  = !!earned[a.id];
    const pct = Math.min(100, (prog / total) * 100);
    const ds  = ok ? new Date(earned[a.id]).toLocaleDateString('en-IN', { month:'short', day:'numeric', year:'numeric' }) : null;
    return `<div class="ach">
      <div class="ach-ico ${ok ? 'e' : 'l'}">${a.icon}</div>
      <div style="flex:1">
        <div class="ach-title">${a.title}</div>
        <div class="ach-desc">${a.desc}</div>
        ${ok
          ? `<div class="ach-date">✓ ${ds}</div>`
          : `<div style="font-size:11px;color:var(--muted);margin-top:4px">${Math.min(prog, total).toFixed(unit === 'km' ? 2 : 0)} / ${total} ${unit}</div>
             <div class="prog-bg"><div class="prog-bar" style="width:${pct}%"></div></div>`
        }
      </div>
    </div>`;
  }

  document.getElementById('ach-dist').innerHTML   = ACH_DIST.map(a   => row(a, maxKm,              a.km,   'km')).join('');
  document.getElementById('ach-elev').innerHTML   = ACH_ELEV.map(a   => row(a, stats.totalElevM || 0, a.m, 'm')).join('');
  document.getElementById('ach-streak').innerHTML = ACH_STREAK.map(a => row(a, stats.streak || 0,  a.days, 'days')).join('');
}

// ── History page ──────────────────────────
function renderHistory() { renderWorkoutHistory(); renderPersonalRecords(); }

function renderWorkoutHistory() {
  const wkts = DB.get('workouts', []);
  const el   = document.getElementById('hist-list');
  if (!wkts.length) {
    el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:16px 0;font-size:14px">No workouts yet</div>';
    return;
  }
  el.innerHTML = [...wkts].reverse().map(w => {
    const d        = new Date(w.date);
    const lb       = d.toLocaleDateString('en-IN', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    const rk       = getRank(w.distKm, w.elapsedSec);
    const src      = w.source === 'manual' ? ' ✏️' : ' 📍';
    const stepStr  = w.steps ? ` · 👟 ${w.steps} steps` : '';
    const routeBtn = w.route && w.route.length > 1
      ? `<button onclick="showRouteModal(${w.id})" style="background:none;border:none;color:var(--blue);font-size:11px;cursor:pointer;padding:0;margin-top:2px">🗺 View route</button>`
      : '';
    return `<div class="wrow">
      <div class="wico">${w.type === 'run' ? '🏃' : '🚶'}</div>
      <div class="winfo">
        <div class="wtitle">${cap(w.type)} ${w.distKm.toFixed(2)} km · ${rk.label}${src}</div>
        <div class="wsub">${lb} · ${fmtTime(w.elapsedSec)}</div>
        <div class="wsub">↑${Math.round(w.elevUp||0)}m · ${w.cal} kcal · ${fmtPace(w.avgPace)}/km${stepStr}</div>
        ${routeBtn}
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div class="${rk.css}" style="font-size:20px">${rk.icon}</div>
        <button class="del-btn" onclick="promptDelete(${w.id})" title="Delete">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

// ── Post-workout route modal (SVG polyline) ─
function showRouteModal(id) {
  const wkts = DB.get('workouts', []);
  const w    = wkts.find(x => x.id === id);
  if (!w || !w.route || w.route.length < 2) return;
  const pts    = w.route;
  const lats   = pts.map(p => p[0]), lons = pts.map(p => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const W_ = 300, H_ = 180, pad = 15;
  const scaleX = v => pad + (v - minLon) / (maxLon - minLon || 1e-6) * (W_ - 2*pad);
  const scaleY = v => pad + (maxLat - v) / (maxLat - minLat || 1e-6) * (H_ - 2*pad);
  const polyline = pts.map(p => `${scaleX(p[1]).toFixed(1)},${scaleY(p[0]).toFixed(1)}`).join(' ');
  const start = pts[0], end = pts[pts.length - 1];

  const div = document.createElement('div');
  div.className = 'overlay'; div.id = 'route-modal';
  div.innerHTML = `<div class="modal" style="padding:20px">
    <div style="font-size:16px;font-weight:700;margin-bottom:12px">🗺 Route Map</div>
    <svg viewBox="0 0 ${W_} ${H_}" xmlns="http://www.w3.org/2000/svg" style="width:100%;background:var(--surf2);border-radius:8px">
      <polyline points="${polyline}" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${scaleX(start[1]).toFixed(1)}" cy="${scaleY(start[0]).toFixed(1)}" r="5" fill="var(--green)"/>
      <circle cx="${scaleX(end[1]).toFixed(1)}"   cy="${scaleY(end[0]).toFixed(1)}"   r="5" fill="var(--red)"/>
    </svg>
    <div style="font-size:11px;color:var(--muted);margin-top:8px;text-align:center">🟢 Start &nbsp;&nbsp; 🔴 Finish · ${pts.length} GPS points</div>
    <button class="btn btn-s" style="margin-top:14px;padding:11px;font-size:14px" onclick="this.closest('.overlay').remove()">Close</button>
  </div>`;
  document.body.appendChild(div);
}

// ── Personal records card ─────────────────
function renderPersonalRecords() {
  const wkts = DB.get('workouts', []);
  const pr   = document.getElementById('pr-card');
  if (!wkts.length) { pr.innerHTML = '<div style="color:var(--muted);font-size:13px">Complete workouts to see records.</div>'; return; }
  const bd = [...wkts].sort((a,b) => b.distKm - a.distKm)[0];
  const bp = [...wkts].filter(w => w.bestPace > 0).sort((a,b) => a.bestPace - b.bestPace)[0];
  const fk = [...wkts].filter(w => w.fastestKm > 0).sort((a,b) => a.fastestKm - b.fastestKm)[0];
  const bc = [...wkts].sort((a,b) => b.cal - a.cal)[0];
  const be = [...wkts].sort((a,b) => b.elevUp - a.elevUp)[0];
  pr.innerHTML = [
    { ico:'🏅', t:'Longest',     v:bd.distKm.toFixed(2) + ' km',      d:bd.date },
    bp ? { ico:'⚡', t:'Best pace',   v:fmtPace(bp.bestPace) + '/km',    d:bp.date } : null,
    fk ? { ico:'🎯', t:'Fastest 1km', v:fmtPace(fk.fastestKm) + '/km',  d:fk.date } : null,
    { ico:'🔥', t:'Most kcal',   v:bc.cal + ' kcal',                    d:bc.date },
    { ico:'⛰️', t:'Most climb',  v:Math.round(be.elevUp || 0) + 'm',    d:be.date },
  ].filter(Boolean).map((p, i, arr) => `
    <div class="ach" style="${i === arr.length - 1 ? 'border:none;padding-bottom:0' : ''}">
      <div class="ach-ico e">${p.ico}</div>
      <div>
        <div class="ach-title">${p.t}</div>
        <div class="ach-desc">${p.v} · ${new Date(p.d).toLocaleDateString('en-IN',{month:'short',day:'numeric'})}</div>
      </div>
    </div>`).join('');
}

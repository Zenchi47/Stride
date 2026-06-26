// ══════════════════════════════════════════
// js/training.js — Jack Daniels VDOT method
//                  Training paces + weekly plan
// Depends on: core.js
// ══════════════════════════════════════════

// VDOT lookup table [vdot, 5k_seconds]
// Source: Jack Daniels' Running Formula (approximate)
const VDOT_TABLE = [
  [30,2400],[32,2280],[34,2160],[36,2060],[38,1970],[40,1890],
  [42,1820],[44,1760],[46,1700],[48,1650],[50,1600],[52,1555],
  [54,1512],[56,1472],[58,1434],[60,1398],[62,1364],[64,1332],
  [66,1302],[68,1273],[70,1246],[72,1220],[74,1196],[76,1173],
  [78,1150],[80,1129],[85,1081],[90,1038],
];

function vdotFrom5k(sec5k) {
  for (let i = 0; i < VDOT_TABLE.length - 1; i++) {
    const [v1, s1] = VDOT_TABLE[i], [v2, s2] = VDOT_TABLE[i + 1];
    if (sec5k >= s2 && sec5k <= s1) {
      const t = (s1 - sec5k) / (s1 - s2);
      return v1 + t * (v2 - v1);
    }
  }
  if (sec5k > VDOT_TABLE[0][1])                    return VDOT_TABLE[0][0];
  return VDOT_TABLE[VDOT_TABLE.length - 1][0];
}

// Training pace multipliers relative to 5K pace
function trainingPaces(sec5k) {
  const pacePerKm = sec5k / 5;
  return {
    easy:      { mult:1.38, label:'Easy',       color:'var(--blue)',   emoji:'😌', desc:'Conversational pace. Most of your weekly mileage.' },
    marathon:  { mult:1.15, label:'Marathon',   color:'var(--green)',  emoji:'🏃', desc:'Comfortable but focused. Builds aerobic threshold.' },
    threshold: { mult:1.06, label:'Tempo',      color:'var(--warn)',   emoji:'🔥', desc:'Comfortably hard — can speak 3-4 words. 20-40 min max.' },
    interval:  { mult:0.98, label:'Interval',   color:'var(--red)',    emoji:'⚡', desc:'Hard effort, ~400m–1km repeats. 3-5 min recovery jog.' },
    rep:       { mult:0.93, label:'Repetition', color:'var(--purple)', emoji:'🚀', desc:'Maximum controlled effort, 200m–400m. Full recovery.' },
    pacePerKm,
  };
}

function getVO2Label(vdot) {
  if (vdot < 35) return 'Beginner';
  if (vdot < 42) return 'Recreational';
  if (vdot < 50) return 'Intermediate';
  if (vdot < 55) return 'Advanced';
  if (vdot < 60) return 'Sub-Elite';
  return 'Elite';
}

// ── Main calculation + render ─────────────
function calcPlan() {
  const curStr = document.getElementById('plan-current').value;
  const tgtStr = document.getElementById('plan-target').value;
  const curSec = parseMMSS(curStr);
  const tgtSec = parseMMSS(tgtStr);
  if (!curSec || curSec < 600) return; // sanity: must be at least 10:00

  const vdotCur = vdotFrom5k(curSec);
  document.getElementById('plan-vdot').textContent = `Current VDOT: ${vdotCur.toFixed(1)} — ${getVO2Label(vdotCur)}`;

  const zones     = trainingPaces(curSec);
  const zoneOrder = ['easy','marathon','threshold','interval','rep'];

  // Pace zones card
  document.getElementById('pace-zones-card').innerHTML = zoneOrder.map(k => {
    const z    = zones[k];
    const p    = zones.pacePerKm * z.mult;
    const pLo  = p * 0.97, pHi = p * 1.03;
    return `<div style="background:rgba(255,255,255,.04);border-left:3px solid ${z.color};margin-bottom:8px;padding:10px 12px;border-radius:0 10px 10px 0">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${z.color};margin-bottom:4px">${z.emoji} ${z.label}</div>
      <div style="font-size:22px;font-weight:800;letter-spacing:-.5px;color:${z.color}">
        ${fmtPace(pLo)}–${fmtPace(pHi)}
        <span style="font-size:12px;font-weight:400;color:var(--muted)">/km</span>
      </div>
      <div style="font-size:11px;margin-top:4px;opacity:.75;line-height:1.5;color:var(--muted)">${z.desc}</div>
    </div>`;
  }).join('');

  // Weekly structure card
  const weekRows = [
    ['Mon', 'Rest or cross-train',                                                                      'var(--muted)', '🧘'],
    ['Tue', `Easy run 5–6 km @ ${fmtPace(zones.pacePerKm * zones.easy.mult)}/km`,                     'var(--blue)',   '😌'],
    ['Wed', `Tempo 3×10 min @ ${fmtPace(zones.pacePerKm * zones.threshold.mult)}/km, 3 min jog`,      'var(--warn)',   '🔥'],
    ['Thu', 'Easy run 4–5 km',                                                                          'var(--blue)',   '😌'],
    ['Fri', 'Rest',                                                                                      'var(--muted)', '💤'],
    ['Sat', `Intervals 6×400 m @ ${fmtPace(zones.pacePerKm * zones.interval.mult)}/km, 2 min recovery`,'var(--red)',    '⚡'],
    ['Sun', `Long easy run 8–12 km @ ${fmtPace(zones.pacePerKm * zones.easy.mult)}/km`,               'var(--green)',  '🏃'],
  ];
  document.getElementById('weekly-plan-card').innerHTML = `
    <div style="font-size:13px;color:var(--muted);margin-bottom:10px;line-height:1.6">Beginner-intermediate 5K block (adjust to your level):</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${weekRows.map(([day, desc, color, emoji]) => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:8px;background:var(--surf2);border-radius:8px">
          <div style="font-size:12px;font-weight:700;color:${color};min-width:30px">${day}</div>
          <div style="font-size:13px;line-height:1.5">${emoji} ${desc}</div>
        </div>`).join('')}
    </div>`;

  // Timeline estimate
  const timelineCard = document.getElementById('goal-timeline-card');
  if (tgtSec > 0 && tgtSec < curSec) {
    const vdotTarget    = vdotFrom5k(tgtSec);
    const vdotGain      = vdotTarget - vdotCur;
    const gainPerMonth  = vdotCur < 40 ? 0.9 : vdotCur < 50 ? 0.7 : 0.5;
    const monthsNeeded  = Math.ceil(vdotGain / gainPerMonth);
    const paceGain      = curSec - tgtSec;
    timelineCard.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div class="met"><div class="mval g">${vdotTarget.toFixed(1)}</div><div class="mlab">target VDOT</div></div>
        <div class="met"><div class="mval b">${vdotGain.toFixed(1)}</div><div class="mlab">VDOT to gain</div></div>
        <div class="met"><div class="mval w">${Math.floor(paceGain/60)}:${String(Math.round(paceGain%60)).padStart(2,'0')}</div><div class="mlab">min/km faster</div></div>
        <div class="met"><div class="mval p">~${monthsNeeded}</div><div class="mlab">months est.</div></div>
      </div>
      <div style="font-size:12px;color:var(--muted);background:var(--surf2);border-radius:8px;padding:10px;line-height:1.6">
        ⚠️ Estimate. With consistent training (4× runs/week, no injuries), target in
        <strong style="color:var(--green)">${monthsNeeded}–${monthsNeeded+2} months</strong>.
        Current: ${curStr} → Target: ${tgtStr} — a ${(((curSec-tgtSec)/curSec)*100).toFixed(0)}% improvement.
      </div>`;
  } else {
    timelineCard.innerHTML = '<div style="color:var(--muted);font-size:13px">Enter a target time faster than your current 5K.</div>';
  }

  document.getElementById('plan-zones').classList.remove('hidden');
}

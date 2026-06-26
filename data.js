// ══════════════════════════════════════════
// js/data.js — Records · Stats · Achievements
//              Delete · Export · Import
// Depends on: core.js
// ══════════════════════════════════════════

// ── Save a completed workout ──────────────
function saveRecord(rec, dateOverride) {
  rec.id   = Date.now();
  rec.date = dateOverride || new Date().toISOString();
  DB.push('workouts', rec);
  const stats  = updateStats(rec, dateOverride);
  const newAchs = checkAch(rec.distKm, stats.totalDistKm, stats.totalElevM, stats.streak);
  refreshAll();
  if (newAchs.length) setTimeout(() => showAchModal(newAchs[0]), 500);
}

// ── Update aggregate stats ────────────────
function updateStats(rec, dateOverride) {
  const stats = DB.get('stats', {
    totalDistKm: 0, totalCal: 0, totalElevM: 0, totalSec: 0,
    workouts: 0, bestPace: null, streak: 0, lastDate: null,
  });
  stats.totalDistKm += rec.distKm;
  stats.totalCal    += rec.cal;
  stats.totalElevM  += rec.elevUp;
  stats.totalSec    += rec.elapsedSec;
  stats.workouts    += 1;
  if (!stats.bestPace || (rec.bestPace > 0 && rec.bestPace < stats.bestPace)) stats.bestPace = rec.bestPace;

  // Streak — use the actual workout date for manual entries
  const workoutDate = dateOverride ? new Date(dateOverride).toDateString() : new Date().toDateString();
  if (stats.lastDate !== workoutDate) {
    const lastD = stats.lastDate ? new Date(stats.lastDate) : null;
    const workD = dateOverride ? new Date(dateOverride) : new Date();
    const diff  = lastD ? Math.round((workD - lastD) / 86400000) : 999;
    stats.streak   = diff === 1 ? stats.streak + 1 : 1;
    stats.lastDate = workoutDate;
  }
  DB.set('stats', stats);
  return stats;
}

// ── Achievements ──────────────────────────
const ACH_DIST = [
  { id:'d100m', icon:'🌱', title:'First Steps',     desc:'100 m completed',          km:0.1   },
  { id:'d200m', icon:'🐣', title:'Getting Moving',  desc:'200 m completed',          km:0.2   },
  { id:'d400m', icon:'🏟️', title:'Track Lap',       desc:'One full 400 m lap',       km:0.4   },
  { id:'d500m', icon:'🌿', title:'Half-K',          desc:'500 m completed',          km:0.5   },
  { id:'d800m', icon:'🔵', title:'800 m Runner',    desc:'800 m middle distance',    km:0.8   },
  { id:'d1km',  icon:'🔑', title:'1 Kilometre',     desc:'First full km!',           km:1.0   },
  { id:'d1600', icon:'🌀', title:'1600 m / Mile',   desc:'1600 m done!',             km:1.6   },
  { id:'d1mi',  icon:'🦅', title:'One Mile',        desc:'1 mile = 1.609 km',        km:1.609 },
  { id:'d5km',  icon:'⭐', title:'5K Club',         desc:'5 km — welcome!',          km:5     },
  { id:'d10km', icon:'💫', title:'10K Legend',      desc:'10 km — real runner!',     km:10    },
  { id:'d21km', icon:'🥇', title:'Half Marathoner', desc:'21.097 km completed!',     km:21.097},
  { id:'d42km', icon:'🏆', title:'Marathoner',      desc:'42.195 km full marathon!', km:42.195},
];
const ACH_ELEV = [
  { id:'e50',   icon:'⛰️', title:'Hill Climber',  desc:'50 m total climbed',    m:50   },
  { id:'e100',  icon:'🌄', title:'100 m Climber', desc:'100 m — Eiffel Tower',  m:100  },
  { id:'e200',  icon:'🗼', title:'Tower Climber', desc:'200 m total',           m:200  },
  { id:'e500',  icon:'🏔️', title:'Mountain Goat', desc:'500 m total!',          m:500  },
  { id:'e1000', icon:'🌋', title:'Peak Bagger',   desc:'1000 m total climbed!', m:1000 },
];
const ACH_STREAK = [
  { id:'s3',  icon:'🌤️', title:'3-Day Streak',  desc:'Active 3 days in a row', days:3  },
  { id:'s7',  icon:'🔥', title:'Week Warrior',  desc:'7-day streak!',           days:7  },
  { id:'s14', icon:'💪', title:'Fortnight',     desc:'14 days in a row!',       days:14 },
  { id:'s30', icon:'🚀', title:'Monthly Hero',  desc:'30 consecutive days!',    days:30 },
];

function checkAch(workoutKm, totalKm, totalElevM, streak) {
  const earned = DB.get('achievements', {}); const fresh = [];
  for (const a of ACH_DIST)   if (!earned[a.id] && workoutKm  >= a.km)   { earned[a.id] = Date.now(); fresh.push(a); }
  for (const a of ACH_ELEV)   if (!earned[a.id] && totalElevM >= a.m)    { earned[a.id] = Date.now(); fresh.push(a); }
  for (const a of ACH_STREAK) if (!earned[a.id] && streak     >= a.days) { earned[a.id] = Date.now(); fresh.push(a); }
  DB.set('achievements', earned);
  return fresh;
}

function showAchModal(a) {
  document.getElementById('am-icon').textContent = a.icon;
  document.getElementById('am-title').textContent = a.title;
  document.getElementById('am-desc').textContent  = a.desc;
  document.getElementById('ach-modal').classList.remove('hidden');
}

// ── Delete workout ────────────────────────
let pendingDeleteId = null;

function promptDelete(id) {
  pendingDeleteId = id;
  document.getElementById('del-modal').classList.remove('hidden');
}

function confirmDelete() {
  if (pendingDeleteId === null) return;
  const wkts = DB.get('workouts', []).filter(w => w.id !== pendingDeleteId);
  DB.set('workouts', wkts);

  // Recalculate stats from scratch
  const fresh = { totalDistKm:0, totalCal:0, totalElevM:0, totalSec:0, workouts:0, bestPace:null, streak:0, lastDate:null };
  for (const w of wkts) {
    fresh.totalDistKm += w.distKm; fresh.totalCal  += w.cal;
    fresh.totalElevM  += w.elevUp || 0; fresh.totalSec  += w.elapsedSec;
    fresh.workouts++;
    if (!fresh.bestPace || (w.bestPace > 0 && w.bestPace < fresh.bestPace)) fresh.bestPace = w.bestPace;
  }
  if (wkts.length > 0) {
    const dates = [...new Set(wkts.map(w => new Date(w.date).toDateString()))].sort((a, b) => new Date(a) - new Date(b));
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i]) - new Date(dates[i-1])) / 86400000;
      streak = diff === 1 ? streak + 1 : 1;
    }
    const today = new Date().toDateString(), yest = new Date(Date.now() - 86400000).toDateString();
    const lastDate = dates[dates.length - 1];
    fresh.streak   = lastDate === today || lastDate === yest ? streak : 0;
    fresh.lastDate = lastDate;
  }
  DB.set('stats', fresh);
  pendingDeleteId = null;
  closeModal('del-modal');
  refreshAll();
}

// ── Export / Import ───────────────────────
function exportData() {
  const blob = new Blob([JSON.stringify(DB.all(), null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `stride-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  document.getElementById('export-status').textContent = '✅ Exported successfully';
  setTimeout(() => document.getElementById('export-status').textContent = '', 3000);
}

function importData(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const obj = JSON.parse(e.target.result);
      if (!obj.workouts && !obj.stats) throw new Error('Invalid Stride backup file');
      DB.load(obj); refreshAll();
      document.getElementById('export-status').textContent =
        '✅ Import successful — ' + ((obj.workouts || []).length) + ' workouts loaded';
      setTimeout(() => document.getElementById('export-status').textContent = '', 4000);
    } catch (err) {
      document.getElementById('export-status').textContent = '❌ Import failed: ' + err.message;
    }
  };
  reader.readAsText(file);
  input.value = '';
}
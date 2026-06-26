// ══════════════════════════════════════════
// js/core.js — Storage · Math · Formatters
// ══════════════════════════════════════════
'use strict';

// ── LocalStorage wrapper ──────────────────
const DB = (() => {
  const KEY = 'stride_v4';
  let d = {};
  try { const s = localStorage.getItem(KEY); if (s) d = JSON.parse(s); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (_) {} };
  return {
    get:  (k, def = null) => k in d ? d[k] : def,
    set:  (k, v) => { d[k] = v; save(); },
    push: (k, v) => { if (!d[k]) d[k] = []; d[k].push(v); save(); },
    all:  () => d,
    load: (obj) => { d = obj; save(); },
  };
})();

// ── Haversine distance (metres) ───────────
function haversine(la1, lo1, la2, lo2) {
  const R = 6371000, r = Math.PI / 180;
  const φ1 = la1 * r, φ2 = la2 * r, Δφ = (la2 - la1) * r, Δλ = (lo2 - lo1) * r;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Calorie estimate (MET-based) ─────────
function calcCal(type, durSec, distKm, elevM) {
  const w = DB.get('weight', 70);
  const MET = type === 'run' ? 11.5 : 3.5;
  let cal = MET * w * (durSec / 3600);
  if (distKm > 0) cal += (elevM / distKm) * 0.04 * distKm;
  return Math.max(0, Math.round(cal));
}

// ── Format helpers ────────────────────────
function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function fmtPace(spkm) {
  if (!spkm || !isFinite(spkm) || spkm <= 0) return '--:--';
  return `${Math.floor(spkm / 60)}:${String(Math.round(spkm % 60)).padStart(2,'0')}`;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Parse "mm:ss" string → total seconds
function parseMMSS(str) {
  if (!str) return 0;
  str = str.trim();
  const parts = str.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0]) || 0, s = parseInt(parts[1]) || 0;
    return m * 60 + s;
  }
  return parseFloat(str) * 60 || 0;
}

function setText(id, v) { document.getElementById(id).textContent = v; }
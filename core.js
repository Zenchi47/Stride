// ══════════════════════════════════════════
// js/core.js — Storage · Math · Formatters
// ══════════════════════════════════════════
'use strict';

// ── LocalStorage wrapper ──────────────────
// save() now returns true/false instead of silently swallowing failures.
// If localStorage is full or unavailable, every write-returning method
// (set/push/load) reports false so the caller can warn the user instead
// of showing a "Saved!" confirmation for data that never persisted.
const DB = (() => {
  const KEY = 'stride_v4';
  let d = {};
  try { const s = localStorage.getItem(KEY); if (s) d = JSON.parse(s); } catch (_) {}
  let lastError = null;
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
      lastError = null;
      return true;
    } catch (err) {
      lastError = err;
      return false;
    }
  };
  return {
    get:  (k, def = null) => k in d ? d[k] : def,
    set:  (k, v) => { d[k] = v; return save(); },
    push: (k, v) => { if (!d[k]) d[k] = []; d[k].push(v); return save(); },
    all:  () => d,
    load: (obj) => { d = obj; return save(); },
    // Rough estimate of how full storage is (0–1). Used to warn before
    // the quota is actually hit, not just after a write fails.
    usageRatio: () => {
      try {
        const bytes = new Blob([JSON.stringify(d)]).size;
        return bytes / (5 * 1024 * 1024); // assume a conservative 5MB quota
      } catch (_) { return 0; }
    },
    lastErrorMsg: () => lastError ? (lastError.name === 'QuotaExceededError'
      ? 'Storage is full on this device.' : lastError.message) : null,
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

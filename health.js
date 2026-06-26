// ══════════════════════════════════════════
// js/health.js — Fitness tests & health metrics
// BMI · Waist-to-Height · VO2 Max (Cooper + RHR)
// Rockport Walk · Resting HR · Push-up · Sit & Reach
// Depends on: core.js, data.js (for confetti ref via app.js)
// ══════════════════════════════════════════

// ── Profile helpers ───────────────────────
function getProfile() {
  return {
    age:    parseInt(document.getElementById('t-age').value)    || DB.get('t-age', 25),
    gender: document.getElementById('t-gender').value           || DB.get('t-gender', 'm'),
    weight: parseFloat(document.getElementById('t-weight').value) || DB.get('weight', 70),
    height: parseFloat(document.getElementById('t-height').value) || DB.get('t-height', 170),
  };
}
function saveProfile() {
  const p = getProfile();
  DB.set('t-age', p.age); DB.set('t-gender', p.gender);
  DB.set('weight', p.weight); DB.set('t-height', p.height);
  document.getElementById('weight').value = p.weight;
}
function loadProfile() {
  document.getElementById('t-age').value    = DB.get('t-age', 25);
  document.getElementById('t-gender').value = DB.get('t-gender', 'm');
  document.getElementById('t-weight').value = DB.get('weight', 70);
}

// ── VO2 classification ────────────────────
function vo2Class(vo2, age, gender) {
  const thM = { poor:35, fair:42, good:48, excellent:55 };
  const thF = { poor:29, fair:35, good:41, excellent:48 };
  const th  = gender === 'f' ? thF : thM;
  const ageMod = age < 30 ? 3 : age < 40 ? 1 : age < 50 ? -2 : age < 60 ? -5 : -8;
  const p = th.poor+ageMod, fa = th.fair+ageMod, g = th.good+ageMod, ex = th.excellent+ageMod;
  if (vo2 < p)  return { label:'Poor',      color:'var(--red)',    emoji:'😓', tip:'Focus on easy runs 3×/week to build aerobic base.' };
  if (vo2 < fa) return { label:'Fair',      color:'var(--warn)',   emoji:'🙂', tip:'Add one longer run per week to improve endurance.' };
  if (vo2 < g)  return { label:'Good',      color:'var(--blue)',   emoji:'💪', tip:'Good base — try tempo runs to push higher.' };
  if (vo2 < ex) return { label:'Excellent', color:'var(--green)',  emoji:'🔥', tip:'Excellent! Interval training can take you to Elite.' };
  return               { label:'Elite',     color:'var(--purple)', emoji:'🏆', tip:'Elite level — top ~5% of your age group.' };
}

function showResult(id, vo2, age, gender, extraLines = []) {
  const el = document.getElementById(id); el.classList.remove('hidden');
  const c  = vo2Class(vo2, age, gender);
  const lines = extraLines.map(l => `<div style="font-size:12px;color:var(--muted)">${l}</div>`).join('');
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="font-size:32px">${c.emoji}</div>
      <div>
        <div style="font-size:18px;font-weight:800;color:${c.color}">VO2 Max ≈ ${vo2.toFixed(1)} ml/kg/min</div>
        <div style="font-size:14px;font-weight:600;color:${c.color}">${c.label}</div>
      </div>
    </div>
    ${lines}
    <div style="font-size:12px;background:rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;margin-top:8px;line-height:1.5">💡 ${c.tip}</div>`;
  return vo2;
}

// ── Temporary results store ───────────────
let lastResults = {};

// ── BMI ───────────────────────────────────
function calcBMI() {
  const { weight, height } = getProfile();
  if (!weight || !height) { alert('Enter weight and height in your profile above.'); return; }
  const bmi = weight / ((height / 100) ** 2);
  const el  = document.getElementById('res-bmi'); el.classList.remove('hidden');
  let label, color, tip;
  if (bmi < 18.5) { label='Underweight';    color='var(--blue)';  tip='Consider increasing calorie intake with nutrient-dense foods.'; }
  else if (bmi < 25){ label='Healthy Weight'; color='var(--green)'; tip='Great range. Keep up your activity and balanced diet.'; }
  else if (bmi < 30){ label='Overweight';     color='var(--warn)';  tip='Adding more cardio and reducing processed foods can help.'; }
  else if (bmi < 35){ label='Obese Class I';  color='var(--red)';   tip='Speaking with a doctor or dietitian can help you build a plan.'; }
  else              { label='Obese Class II+';color='var(--red)';   tip='Medical guidance is recommended. Running even 10 min/day helps.'; }
  lastResults.bmi = { bmi: +bmi.toFixed(1), label };
  el.innerHTML = `
    <div style="font-size:24px;font-weight:800;color:${color};margin-bottom:4px">${bmi.toFixed(1)}</div>
    <div style="font-size:15px;font-weight:700;color:${color};margin-bottom:8px">${label}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:8px;text-align:center">
      ${[['<18.5','Underweight','var(--blue)'],['18.5–24.9','Healthy','var(--green)'],['25–29.9','Overweight','var(--warn)'],['30+','Obese','var(--red)']].map(([v,l,c])=>`
        <div style="background:rgba(255,255,255,.05);border-radius:6px;padding:5px 2px">
          <div style="font-size:11px;font-weight:700;color:${c}">${v}</div>
          <div style="font-size:9px;color:var(--muted)">${l}</div>
        </div>`).join('')}
    </div>
    <div style="font-size:12px;background:rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;line-height:1.5">💡 ${tip}</div>`;
}

// ── Waist-to-Height Ratio ─────────────────
function calcWHR() {
  const waist = parseFloat(document.getElementById('waist-cm').value); if (!waist) return;
  const { height } = getProfile(); if (!height) { alert('Enter your height in the profile above.'); return; }
  const ratio = waist / height;
  const el    = document.getElementById('res-whr'); el.classList.remove('hidden');
  let label, color, tip;
  if (ratio < 0.4)  { label='Very Lean';       color='var(--blue)';  tip='Very lean. Ensure you are eating enough to fuel your training.'; }
  else if (ratio<0.5){ label='Healthy';         color='var(--green)'; tip='Healthy range. Good cardiovascular risk profile.'; }
  else if (ratio<0.53){label='Acceptable';      color='var(--blue)';  tip='Acceptable. Staying active and eating well maintains this.'; }
  else if (ratio<0.58){label='Increased Risk';  color='var(--warn)';  tip='Some increased risk. More cardio and less processed food helps.'; }
  else if (ratio<0.63){label='High Risk';       color='var(--red)';   tip='High cardiovascular risk. Diet changes and exercise are important.'; }
  else               { label='Very High Risk';  color='var(--red)';   tip='Very high risk. Medical guidance strongly recommended.'; }
  lastResults.whr = { ratio: +ratio.toFixed(3), waist, label };
  el.innerHTML = `
    <div style="font-size:24px;font-weight:800;color:${color};margin-bottom:4px">${ratio.toFixed(2)}</div>
    <div style="font-size:15px;font-weight:700;color:${color};margin-bottom:6px">${label}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Waist ${waist} cm ÷ Height ${height} cm · Keep below 0.5</div>
    <div style="font-size:12px;background:rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;line-height:1.5">💡 ${tip}</div>`;
}

// ── Resting HR health ─────────────────────
function calcRHRHealth() {
  const rhr = parseFloat(document.getElementById('rhr2-val').value); if (!rhr) return;
  const el  = document.getElementById('res-rhr2'); el.classList.remove('hidden');
  let label, color, tip;
  if (rhr < 40)       { label='Athletic / Elite'; color='var(--purple)'; tip='Elite level. Typical of serious endurance athletes.'; }
  else if (rhr < 50)  { label='Excellent';        color='var(--green)';  tip='Excellent cardiovascular fitness. Heart is very efficient.'; }
  else if (rhr < 60)  { label='Good';             color='var(--green)';  tip='Good heart efficiency. Keep up your aerobic training.'; }
  else if (rhr < 70)  { label='Normal';           color='var(--blue)';   tip='Normal range. Regular cardio will lower this over time.'; }
  else if (rhr < 80)  { label='Average';          color='var(--warn)';   tip='Average. 3× cardio sessions per week can improve this.'; }
  else if (rhr < 100) { label='High-Normal';      color='var(--warn)';   tip='Above average. Reduce stress, caffeine, increase aerobic exercise.'; }
  else                { label='Consult a Doctor'; color='var(--red)';    tip='Resting HR above 100 (tachycardia) — see a doctor.'; }
  lastResults.rhr2 = { rhr, label };
  el.innerHTML = `
    <div style="font-size:24px;font-weight:800;color:${color};margin-bottom:4px">${rhr} bpm</div>
    <div style="font-size:15px;font-weight:700;color:${color};margin-bottom:6px">${label}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px;text-align:center">
      ${[['<50','Excellent','var(--green)'],['50–69','Good/Normal','var(--blue)'],['70–99','Average–High','var(--warn)']].map(([v,l,c])=>`
        <div style="background:rgba(255,255,255,.05);border-radius:6px;padding:5px 2px">
          <div style="font-size:11px;font-weight:700;color:${c}">${v}</div>
          <div style="font-size:9px;color:var(--muted)">${l}</div>
        </div>`).join('')}
    </div>
    <div style="font-size:12px;background:rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;line-height:1.5">💡 ${tip}</div>`;
}

// ── Cooper 12-min run ─────────────────────
function calcCooper() {
  const m = parseFloat(document.getElementById('cooper-m').value); if (!m || m < 200) return;
  document.getElementById('cooper-km').value = (m / 1000).toFixed(2);
  const { age, gender } = getProfile();
  const vo2  = (m - 504.9) / 44.73;
  const pace = fmtPace(720 / (m / 1000));
  lastResults.cooper = { vo2, distM: m };
  showResult('res-cooper', vo2, age, gender, [`Distance: ${m} m`, `Equivalent pace: ${pace} /km`]);
}
function calcCooperKm() {
  const km = parseFloat(document.getElementById('cooper-km').value); if (!km || km < 0.2) return;
  document.getElementById('cooper-m').value = Math.round(km * 1000);
  calcCooper();
}

// ── VO2 via Resting HR (Uth-Sørensen) ────
function calcRHR() {
  const rhr      = parseFloat(document.getElementById('rhr-val').value); if (!rhr || rhr < 20) return;
  const mhrInput = parseFloat(document.getElementById('mhr-val').value);
  const { age, gender } = getProfile();
  const formula  = document.getElementById('mhr-formula').value;
  const mhr      = mhrInput || (formula === 'tanaka' ? 208 - 0.7 * age : 220 - age);
  const vo2      = 15 * (mhr / rhr);
  lastResults.rhr = { vo2, rhr, mhr };
  showResult('res-rhr', vo2, age, gender, [
    `Resting HR: ${rhr} bpm`,
    `Max HR used: ${mhr.toFixed(0)} bpm ${mhrInput ? '(entered)' : `(${formula === 'tanaka' ? 'Tanaka: 208−0.7×age' : 'Fox: 220−age'})`}`,
    `HRmax / HRrest ratio: ${(mhr / rhr).toFixed(2)}`,
  ]);
}

// ── Rockport 1-mile walk ──────────────────
function calcWalk() {
  const timeMin = parseFloat(document.getElementById('walk-min').value);
  const hr      = parseFloat(document.getElementById('walk-hr').value);
  if (!timeMin || !hr) return;
  const { age, gender, weight } = getProfile();
  const weightLb = weight * 2.20462, gM = gender === 'm' ? 1 : 0;
  const vo2 = 132.853 - (0.0769*weightLb) - (0.3877*age) + (6.315*gM) - (3.2649*timeMin) - (0.1565*hr);
  lastResults.walk = { vo2, timeMin, hr };
  const min = Math.floor(timeMin), sec = Math.round((timeMin - min) * 60);
  showResult('res-walk', vo2, age, gender, [`Time: ${min}:${String(sec).padStart(2,'0')}`, `Finish HR: ${hr} bpm`]);
}

// ── Sit & Reach ───────────────────────────
function calcReach() {
  const cm = parseFloat(document.getElementById('reach-cm').value); if (isNaN(cm)) return;
  const { age, gender } = getProfile();
  const el = document.getElementById('res-reach'); el.classList.remove('hidden');
  let label, color, tip;
  const ageAdj = Math.max(0, (age - 20) * 0.15);
  if (gender === 'm') {
    const adj = [-8, 0, 10, 20].map(v => v - ageAdj);
    if (cm < adj[0])      { label='Very Poor'; color='var(--red)';    tip='Yoga or daily hamstring stretching needed.'; }
    else if (cm < adj[1]) { label='Poor';      color='var(--warn)';   tip='Stretch hamstrings and lower back daily.'; }
    else if (cm < adj[2]) { label='Fair';      color='var(--blue)';   tip='Good start — add hip flexor stretches.'; }
    else if (cm < adj[3]) { label='Good';      color='var(--green)';  tip='Good flexibility — maintain with yoga or stretching.'; }
    else                  { label='Excellent'; color='var(--purple)'; tip='Excellent flexibility for a runner!'; }
  } else {
    const adj = [-5, 5, 15, 25].map(v => v - ageAdj);
    if (cm < adj[0])      { label='Very Poor'; color='var(--red)';    tip='Yoga or daily hamstring stretching needed.'; }
    else if (cm < adj[1]) { label='Poor';      color='var(--warn)';   tip='Stretch hamstrings and lower back daily.'; }
    else if (cm < adj[2]) { label='Fair';      color='var(--blue)';   tip='Good start — add hip flexor stretches.'; }
    else if (cm < adj[3]) { label='Good';      color='var(--green)';  tip='Good flexibility — maintain with yoga.'; }
    else                  { label='Excellent'; color='var(--purple)'; tip='Excellent flexibility for a runner!'; }
  }
  const sign = cm >= 0 ? '+' : '';
  lastResults.reach = { cm, label };
  el.innerHTML = `
    <div style="font-size:18px;font-weight:800;color:${color};margin-bottom:6px">${sign}${cm} cm — ${label}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:6px">Age-adjusted ACSM norms · Age ${age} · ${gender==='m'?'Male':'Female'}</div>
    <div style="font-size:12px;background:rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;line-height:1.5">💡 ${tip}</div>`;
}

// ── Push-up test ──────────────────────────
function calcPushup() {
  const n = parseInt(document.getElementById('pushup-n').value); if (!n || n < 0) return;
  const { age, gender } = getProfile();
  const el = document.getElementById('res-pushup'); el.classList.remove('hidden');
  const normsM = { 17:[17,22,29,36], 30:[13,18,24,30], 40:[11,15,20,25], 50:[9,12,17,21],  60:[6,10,14,18],  99:[5,8,12,15] };
  const normsF = { 17:[9,13,20,26],  30:[8,12,17,23],  40:[6,10,14,19],  50:[4,7,11,15],   60:[3,6,9,12],    99:[2,4,7,10] };
  const norms   = gender === 'm' ? normsM : normsF;
  const bracket = Object.keys(norms).find(k => age <= parseInt(k));
  const [poor, fair, good, ex] = norms[bracket] || [10, 15, 20, 25];
  let label, color, tip;
  if (n <= poor) { label='Poor';      color='var(--red)';    tip='Add push-up practice 3×/week. Start with knee push-ups if needed.'; }
  else if(n<=fair){label='Fair';      color='var(--warn)';   tip='Solid foundation — push toward Good with consistent training.'; }
  else if(n<=good){label='Good';      color='var(--blue)';   tip='Good upper body endurance. Add variations (decline, wide-grip).'; }
  else if(n<=ex)  {label='Excellent'; color='var(--green)';  tip='Excellent! Try weighted push-ups or one-arm variations.'; }
  else            {label='Elite';     color='var(--purple)'; tip='Elite push-up endurance — top of your age group!'; }
  lastResults.pushup = { n, label };
  el.innerHTML = `
    <div style="font-size:18px;font-weight:800;color:${color};margin-bottom:6px">${n} reps — ${label}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px">ACSM norms · Age ${age} · ${gender==='m'?'Male':'Female'}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:8px;text-align:center">
      ${[['Poor',poor,'var(--red)'],['Fair',fair,'var(--warn)'],['Good',good,'var(--blue)'],['Excellent',ex,'var(--green)']].map(([l,v,c])=>`
        <div style="background:rgba(255,255,255,.05);border-radius:6px;padding:5px 2px">
          <div style="font-size:13px;font-weight:700;color:${c}">${v}</div>
          <div style="font-size:10px;color:var(--muted)">${l}</div>
        </div>`).join('')}
    </div>
    <div style="font-size:12px;background:rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;line-height:1.5">💡 ${tip}</div>`;
}

// ── Save a test result ────────────────────
function saveTest(type) {
  const res = lastResults[type];
  if (!res) { alert('Calculate a result first.'); return; }
  const profile = getProfile();
  const ok = DB.push('testResults', { id: Date.now(), date: new Date().toISOString(), type, profile, ...res });
  if (!ok) { showStorageError(); return; }
  renderTestHist();
  confetti();
  alert('Result saved! ✅');
}

// ── Test result metadata ──────────────────
const TEST_META = {
  bmi:    { icon:'⚖️', name:'BMI',                   val: r => `${r.bmi} — ${r.label}` },
  whr:    { icon:'📐', name:'Waist-to-Height Ratio',  val: r => `${r.ratio} (waist ${r.waist} cm) — ${r.label}` },
  cooper: { icon:'🫁', name:'VO2 Max (Cooper Run)',   val: r => `${r.vo2.toFixed(1)} ml/kg/min · ${r.distM} m` },
  rhr:    { icon:'❤️', name:'VO2 Max (Resting HR)',  val: r => `${r.vo2.toFixed(1)} ml/kg/min · RHR ${r.rhr} bpm` },
  walk:   { icon:'🚶', name:'Aerobic Fitness (Walk)', val: r => `${r.vo2.toFixed(1)} ml/kg/min · ${r.timeMin?.toFixed(1)} min` },
  rhr2:   { icon:'💓', name:'Resting Heart Rate',     val: r => `${r.rhr} bpm — ${r.label}` },
  pushup: { icon:'💪', name:'Muscular Endurance',     val: r => `${r.n} push-ups — ${r.label}` },
  reach:  { icon:'🧘', name:'Lower Body Flexibility', val: r => `${r.cm >= 0 ? '+' : ''}${r.cm} cm — ${r.label}` },
};

// ── Test history list ─────────────────────
function renderTestHist() {
  const recs = DB.get('testResults', []);
  const el   = document.getElementById('test-hist');
  if (!recs.length) {
    el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:14px 0;font-size:14px">No tests saved yet</div>';
    return;
  }
  el.innerHTML = [...recs].reverse().map(r => {
    const m   = TEST_META[r.type] || { icon:'📊', name:r.type, val:()=>'' };
    const d   = new Date(r.date);
    const lbl = d.toLocaleDateString('en-IN', { weekday:'short', month:'short', day:'numeric' });
    return `<div class="wrow">
      <div class="wico">${m.icon}</div>
      <div class="winfo">
        <div class="wtitle">${m.name}</div>
        <div class="wsub">${m.val(r)}</div>
        <div class="wsub">${lbl} · Age ${r.profile?.age || '?'} · ${r.profile?.gender === 'f' ? 'Female' : 'Male'}</div>
      </div>
      <button class="del-btn" onclick="promptDelete(${r.id}, 'test')" title="Delete">🗑️</button>
    </div>`;
  }).join('');
}

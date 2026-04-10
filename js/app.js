/* ══════════════════════════════════
   STRIDE — App Module
   Multi-month plan generation
   ══════════════════════════════════ */

const PROXY_URL = 'https://stride-5g3v.onrender.com/generate';

let paceUnit = 'km';
let distUnit = 'km';
let generatedMonths = [];
window.strideProfile = {};

const DEFAULT_PROFILE = {
  pbMins: '',
  pbSecs: '',
  distance: '',
  goalHrs: '',
  goalMins: '',
  goalSecs: '',
  days: '',
  maxHR: '',
  raceDate: '',
  longestRun: '',
  longRunDay: 'Saturday',
  distUnit: 'km',
  paceUnit: 'km'
};

function setPaceUnit(unit) {
  paceUnit = unit;
  document.getElementById('pace-km').classList.toggle('active', unit === 'km');
  document.getElementById('pace-mile').classList.toggle('active', unit === 'mile');
}

function setDistUnit(unit) {
  distUnit = unit;
  document.getElementById('dist-km').classList.toggle('active', unit === 'km');
  document.getElementById('dist-mile').classList.toggle('active', unit === 'mile');
}

const HR_ZONES = [
  { zone: 'Z1', name: 'Recovery', pct: [0.50, 0.60], color: '#6bcfe8' },
  { zone: 'Z2', name: 'Aerobic', pct: [0.60, 0.70], color: '#4ecdc4' },
  { zone: 'Z3', name: 'Tempo', pct: [0.70, 0.80], color: '#ffe66d' },
  { zone: 'Z4', name: 'Threshold', pct: [0.80, 0.90], color: '#ff9f43' },
  { zone: 'Z5', name: 'VO2 Max', pct: [0.90, 1.00], color: '#ff6b6b' }
];

function toggleHRZones() {
  const panel = document.getElementById('hr-zones-panel');
  const maxHR = parseInt(document.getElementById('max-hr').value, 10);
  const btn = document.getElementById('btn-view-zones');

  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
    btn.textContent = 'Zones';
    return;
  }

  if (!maxHR || maxHR < 100) {
    showToast('Enter a valid max heart rate first.', 'error');
    return;
  }

  const grid = document.getElementById('hz-grid');
  grid.innerHTML = '';

  HR_ZONES.forEach((zone) => {
    const row = document.createElement('div');
    row.className = 'hz-row';
    row.style.background = `${zone.color}18`;
    row.innerHTML = `<div class="hz-dot" style="background:${zone.color}"></div><div class="hz-name" style="color:${zone.color}">${zone.zone} — ${zone.name}</div><div class="hz-range" style="color:${zone.color}">${Math.round(maxHR * zone.pct[0])}–${Math.round(maxHR * zone.pct[1])} bpm</div>`;
    grid.appendChild(row);
  });

  panel.style.display = 'block';
  btn.textContent = 'Hide';
}

function createEmptyPlanState() {
  return {
    profile: null,
    generatedMonths: [],
    allMonths: {},
    activeMonthKey: null
  };
}

function getEmptyCalendarMarkup() {
  return `
    <div class="empty-calendar">
      <div class="empty-icon">🏃</div>
      <div class="empty-text">Your plan will appear here</div>
      <div style="font-size:14px; color:var(--muted); text-align:center; max-width:300px; line-height:1.6;">Fill in your details including your race date, then hit Generate Plan to build your personalised training calendar.</div>
    </div>
  `;
}

function resetFormFields() {
  document.getElementById('pb-mins').value = DEFAULT_PROFILE.pbMins;
  document.getElementById('pb-secs').value = DEFAULT_PROFILE.pbSecs;
  document.getElementById('goal-distance').value = DEFAULT_PROFILE.distance;
  document.getElementById('goal-hrs').value = DEFAULT_PROFILE.goalHrs;
  document.getElementById('goal-mins').value = DEFAULT_PROFILE.goalMins;
  document.getElementById('goal-secs').value = DEFAULT_PROFILE.goalSecs;
  document.getElementById('training-days').value = DEFAULT_PROFILE.days;
  document.getElementById('max-hr').value = DEFAULT_PROFILE.maxHR;
  document.getElementById('race-date').value = DEFAULT_PROFILE.raceDate;
  document.getElementById('longest-run').value = DEFAULT_PROFILE.longestRun;
  document.getElementById('long-run-day').value = DEFAULT_PROFILE.longRunDay;
  setDistUnit(DEFAULT_PROFILE.distUnit);
  setPaceUnit(DEFAULT_PROFILE.paceUnit);
  document.getElementById('btn-view-zones').disabled = true;
  document.getElementById('btn-view-zones').textContent = 'Zones';
  document.getElementById('hr-zones-panel').style.display = 'none';
  document.getElementById('pb-preview').textContent = '';
  document.getElementById('goal-preview').textContent = '';
}

function applyProfile(profile = {}) {
  const merged = { ...DEFAULT_PROFILE, ...profile };
  document.getElementById('pb-mins').value = merged.pbMins;
  document.getElementById('pb-secs').value = merged.pbSecs;
  document.getElementById('goal-distance').value = merged.distance;
  document.getElementById('goal-hrs').value = merged.goalHrs;
  document.getElementById('goal-mins').value = merged.goalMins;
  document.getElementById('goal-secs').value = merged.goalSecs;
  document.getElementById('training-days').value = merged.days;
  document.getElementById('max-hr').value = merged.maxHR;
  document.getElementById('race-date').value = merged.raceDate;
  document.getElementById('longest-run').value = merged.longestRun;
  document.getElementById('long-run-day').value = merged.longRunDay || 'Saturday';
  setDistUnit(merged.distUnit || 'km');
  setPaceUnit(merged.paceUnit || 'km');

  const maxHR = parseInt(merged.maxHR, 10);
  document.getElementById('btn-view-zones').disabled = !(maxHR >= 100 && maxHR <= 220);
  document.getElementById('btn-view-zones').textContent = 'Zones';
  document.getElementById('hr-zones-panel').style.display = 'none';

  const pbMins = parseInt(merged.pbMins, 10) || 0;
  const pbSecs = parseInt(merged.pbSecs, 10) || 0;
  document.getElementById('pb-preview').textContent = (pbMins || pbSecs)
    ? `5K PB: ${pbMins}:${String(pbSecs).padStart(2, '0')}`
    : '';

  const goalHrs = parseInt(merged.goalHrs, 10) || 0;
  const goalMins = parseInt(merged.goalMins, 10) || 0;
  const goalSecs = parseInt(merged.goalSecs, 10) || 0;
  const label = merged.distance ? ` for ${merged.distance}` : '';
  let goalPreview = '';
  if (goalHrs || goalMins || goalSecs) {
    goalPreview = goalHrs > 0
      ? `${goalHrs}:${String(goalMins).padStart(2, '0')}:${String(goalSecs).padStart(2, '0')}${label}`
      : `${goalMins}:${String(goalSecs).padStart(2, '0')}${label}`;
  }
  document.getElementById('goal-preview').textContent = goalPreview;
}

function resetPlanWorkspace({ clearInputs = false } = {}) {
  generatedMonths = [];
  allMonths = {};
  activeMonthKey = null;
  window.strideProfile = {};

  if (clearInputs) {
    resetFormFields();
  }

  document.getElementById('plan-info-row').style.display = 'none';
  document.getElementById('plan-info-row').innerHTML = '';
  document.getElementById('calendar-legend').style.display = 'none';
  document.getElementById('month-tabs').style.display = 'none';
  document.getElementById('month-tabs').innerHTML = '';
  document.getElementById('next-month-btn').style.display = 'none';
  document.getElementById('race-countdown').style.display = 'none';
  document.getElementById('calendar-month-title').innerHTML = 'Your <span>Training</span> Plan';
  document.getElementById('calendar-container').innerHTML = getEmptyCalendarMarkup();
}

function persistCurrentUserPlan() {
  if (!window.StrideAuth?.saveCurrentUserPlan) return;

  const planData = createEmptyPlanState();
  planData.profile = Object.keys(window.strideProfile || {}).length ? { ...window.strideProfile } : null;
  planData.generatedMonths = [...generatedMonths];
  planData.allMonths = JSON.parse(JSON.stringify(allMonths));
  planData.activeMonthKey = activeMonthKey;

  window.StrideAuth.saveCurrentUserPlan(planData);
}

function getCurrentPhase(raceDateStr) {
  if (!raceDateStr) return 'base building';
  const weeksToRace = Math.ceil(daysUntilRace(raceDateStr) / 7);
  if (weeksToRace <= 2) return 'taper';
  if (weeksToRace <= 5) return 'peak / race specific';
  if (weeksToRace <= 10) return 'build';
  return 'base building';
}


const DAY_NAME_TO_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
};

function enforcePreferredLongRunDay(workouts, year, month, preferredDay, startDay, lastDay, raceDate) {
  const preferredIndex = DAY_NAME_TO_INDEX[preferredDay];
  if (preferredIndex === undefined) return workouts;

  const cloned = workouts.map((workout) => ({ ...workout }));
  const raceDay = raceDate && raceDate.getFullYear() === year && raceDate.getMonth() === month
    ? raceDate.getDate()
    : null;

  const weekRanges = [];
  let weekStart = startDay;
  while (weekStart <= lastDay) {
    const dayOfWeek = new Date(year, month, weekStart).getDay();
    const daysUntilWeekEnd = (7 - dayOfWeek) % 7;
    const weekEnd = Math.min(lastDay, weekStart + daysUntilWeekEnd);
    weekRanges.push([weekStart, weekEnd]);
    weekStart = weekEnd + 1;
  }

  for (const [weekStartDay, weekEndDay] of weekRanges) {
    const longRun = cloned.find((workout) =>
      workout.type === 'long' && workout.day >= weekStartDay && workout.day <= weekEndDay
    );

    if (!longRun) continue;

    let targetDay = null;
    for (let day = weekStartDay; day <= weekEndDay; day += 1) {
      if (day === raceDay) continue;
      if (new Date(year, month, day).getDay() === preferredIndex) {
        targetDay = day;
        break;
      }
    }

    if (!targetDay || targetDay === longRun.day) continue;

    const targetWorkout = cloned.find((workout) => workout.day === targetDay);
    if (targetWorkout) {
      targetWorkout.day = longRun.day;
    }
    longRun.day = targetDay;
  }

  return cloned.sort((a, b) => a.day - b.day);
}

function renderPlanSummary(profile) {
  const infoRow = document.getElementById('plan-info-row');
  infoRow.style.display = 'flex';
  infoRow.innerHTML = `
    <div class="info-chip">PB: <span>${profile.pb || 'no PB yet'}</span></div>
    <div class="info-chip">Goal: <span>${profile.goalTime || 'N/A'} ${profile.distance || ''}</span></div>
    <div class="info-chip">Days/wk: <span>${profile.days || '-'}</span></div>
    <div class="info-chip">Long run: <span>${profile.longRunDay || 'Saturday'}</span></div>
    <div class="info-chip">Phase: <span>${getCurrentPhase(profile.raceDate)}</span></div>
  `;
}

function restoreCurrentUserState() {
  const user = window.StrideAuth?.getCurrentUserRecord?.();
  if (!user) {
    resetPlanWorkspace({ clearInputs: false });
    return;
  }

  const savedProfile = user.planData?.profile || user.preferences || null;
  if (savedProfile) {
    applyProfile(savedProfile);
    window.strideProfile = { ...savedProfile };
  } else {
    resetFormFields();
  }

  const hasPlan = Array.isArray(user.planData?.generatedMonths) && user.planData.generatedMonths.length > 0;
  if (!hasPlan) {
    resetPlanWorkspace({ clearInputs: false });
    if (savedProfile) {
      applyProfile(savedProfile);
      window.strideProfile = { ...savedProfile };
    }
    return;
  }

  generatedMonths = [...user.planData.generatedMonths];
  allMonths = JSON.parse(JSON.stringify(user.planData.allMonths || {}));
  activeMonthKey = user.planData.activeMonthKey || generatedMonths[generatedMonths.length - 1] || null;
  window.strideProfile = { ...savedProfile };

  renderMonthTabs();
  if (activeMonthKey) {
    renderCalendarForKey(activeMonthKey);
  }
  renderPlanSummary(window.strideProfile);
  document.getElementById('calendar-legend').style.display = 'flex';
  updateRaceCountdown(window.strideProfile.raceDate);
  updateNextMonthButton(window.strideProfile);
}

function resetPlan() {
  const hasSavedPlan = generatedMonths.length > 0 || Object.keys(allMonths).length > 0 || Object.keys(window.strideProfile || {}).length > 0;
  if (hasSavedPlan) {
    const confirmed = window.confirm('Reset your saved plan and start fresh? This only clears the current account.');
    if (!confirmed) return;
  }

  window.StrideAuth?.clearCurrentUserPlan?.();
  resetPlanWorkspace({ clearInputs: true });
  showToast(hasSavedPlan ? 'Plan reset. You can build a new one now.' : 'Ready for a fresh plan.', hasSavedPlan ? 'success' : 'info');
}

window.restoreCurrentUserState = restoreCurrentUserState;
window.persistCurrentUserPlan = persistCurrentUserPlan;
window.handleUserLoggedOut = () => resetPlanWorkspace({ clearInputs: false });

function getPBTime() {
  const m = parseInt(document.getElementById('pb-mins').value, 10) || 0;
  const s = parseInt(document.getElementById('pb-secs').value, 10) || 0;
  if (!m && !s) return 'no PB yet';
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getGoalTime() {
  const h = parseInt(document.getElementById('goal-hrs').value, 10) || 0;
  const m = parseInt(document.getElementById('goal-mins').value, 10) || 0;
  const s = parseInt(document.getElementById('goal-secs').value, 10) || 0;
  if (!h && !m && !s) return '';
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function attachTimePreviews() {
  const updatePB = () => {
    const m = parseInt(document.getElementById('pb-mins').value, 10) || 0;
    const s = parseInt(document.getElementById('pb-secs').value, 10) || 0;
    document.getElementById('pb-preview').textContent = (m || s) ? `5K PB: ${m}:${String(s).padStart(2, '0')}` : '';
    if (s > 59) document.getElementById('pb-secs').value = 59;
  };

  const updateGoal = () => {
    const h = parseInt(document.getElementById('goal-hrs').value, 10) || 0;
    const m = parseInt(document.getElementById('goal-mins').value, 10) || 0;
    const s = parseInt(document.getElementById('goal-secs').value, 10) || 0;
    const dist = document.getElementById('goal-distance').value;
    const label = dist ? ` for ${dist}` : '';
    let preview = '';
    if (h || m || s) {
      preview = h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${label}`
        : `${m}:${String(s).padStart(2, '0')}${label}`;
    }
    document.getElementById('goal-preview').textContent = preview;
    if (m > 59) document.getElementById('goal-mins').value = 59;
    if (s > 59) document.getElementById('goal-secs').value = 59;
  };

  ['pb-mins', 'pb-secs'].forEach((id) => document.getElementById(id).addEventListener('input', updatePB));
  ['goal-hrs', 'goal-mins', 'goal-secs'].forEach((id) => document.getElementById(id).addEventListener('input', updateGoal));
  document.getElementById('goal-distance').addEventListener('change', updateGoal);
}

function getProfile() {
  return {
    pb: getPBTime(),
    pbMins: document.getElementById('pb-mins').value,
    pbSecs: document.getElementById('pb-secs').value,
    distance: document.getElementById('goal-distance').value,
    goalTime: getGoalTime(),
    goalHrs: document.getElementById('goal-hrs').value,
    goalMins: document.getElementById('goal-mins').value,
    goalSecs: document.getElementById('goal-secs').value,
    days: document.getElementById('training-days').value,
    maxHR: document.getElementById('max-hr').value.trim(),
    raceDate: document.getElementById('race-date').value,
    longestRun: document.getElementById('longest-run').value.trim(),
    longRunDay: document.getElementById('long-run-day').value,
    distUnit,
    paceUnit
  };
}

function daysUntilRace(raceDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(raceDateStr) - today) / (1000 * 60 * 60 * 24));
}

function updateRaceCountdown(raceDateStr) {
  const el = document.getElementById('race-countdown');
  const days = daysUntilRace(raceDateStr);
  if (days <= 0) {
    el.style.display = 'none';
    return;
  }
  const fmt = new Date(raceDateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  el.style.display = 'block';
  el.innerHTML = `<div class="rc-label">Race Countdown</div><div class="rc-days">${days}</div><div class="rc-sub">days until ${fmt}</div>`;
}

function updateNextMonthButton(profile) {
  const btn = document.getElementById('next-month-btn');
  if (!profile?.raceDate || !generatedMonths.length) {
    btn.style.display = 'none';
    return;
  }

  const raceDate = new Date(profile.raceDate);
  const lastKey = generatedMonths[generatedMonths.length - 1];
  const [ly, lm] = lastKey.split('-').map(Number);
  const nextDate = new Date(ly, lm, 1);
  if (nextDate > raceDate) {
    btn.style.display = 'none';
    return;
  }

  btn.style.display = 'block';
  const raceYear = raceDate.getFullYear();
  const raceMonth = raceDate.getMonth() + 1;
  if (nextDate.getFullYear() === raceYear && nextDate.getMonth() + 1 === raceMonth) {
    btn.textContent = '🏁 Generate Race Month';
  } else {
    btn.textContent = '+ Generate Next Month';
  }
}

async function generatePlan() {
  const profile = getProfile();
  if (!profile.distance || !profile.goalTime || !profile.days) {
    showToast('Please fill in goal distance, goal time, and training days.', 'error');
    return;
  }
  if (!profile.raceDate) {
    showToast('Please enter your race date.', 'error');
    return;
  }

  window.strideProfile = profile;
  window.StrideAuth?.saveCurrentUserPreferences?.(profile);
  generatedMonths = [];
  allMonths = {};
  activeMonthKey = null;

  const today = new Date();
  await generateMonth(today.getFullYear(), today.getMonth(), profile, 'first');
}

async function generateNextMonth() {
  const profile = window.strideProfile;
  const lastKey = generatedMonths[generatedMonths.length - 1];
  const [ly, lm] = lastKey.split('-').map(Number);
  const next = new Date(ly, lm, 1);
  await generateMonth(next.getFullYear(), next.getMonth(), profile, 'next');
}

async function generateMonth(year, month, profile, mode) {
  showLoading(true);
  const today = new Date();
  const startDay = (mode === 'first')
    ? (year === today.getFullYear() && month === today.getMonth() ? today.getDate() : 1)
    : 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
  const raceDate = new Date(profile.raceDate);
  const raceIsThisMonth = raceDate.getFullYear() === year && raceDate.getMonth() === month;
  const lastDay = raceIsThisMonth ? raceDate.getDate() - 1 : daysInMonth;
  const weeksToRace = Math.ceil(daysUntilRace(profile.raceDate) / 7);
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  let phase = 'base building';
  if (weeksToRace <= 2) phase = 'taper';
  else if (weeksToRace <= 5) phase = 'peak / race specific';
  else if (weeksToRace <= 10) phase = 'build';

  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: buildPrompt({ profile, year, month, monthName, startDay, daysInMonth, phase, weeksToRace, mode, raceDate }) })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.workouts || !Array.isArray(data.workouts)) {
      throw new Error('Unexpected response shape');
    }

    const alignedWorkouts = enforcePreferredLongRunDay(
      data.workouts,
      year,
      month,
      profile.longRunDay || 'Saturday',
      startDay,
      raceIsThisMonth ? raceDate.getDate() - 1 : daysInMonth,
      raceDate
    );

    storeMonthWorkouts(year, month, alignedWorkouts, profile.raceDate);
    generatedMonths.push(monthKey);
    renderMonthTabs();
    renderCalendarForKey(monthKey);
    renderPlanSummary(profile);
    persistCurrentUserPlan();

    document.getElementById('calendar-legend').style.display = 'flex';
    updateRaceCountdown(profile.raceDate);
    updateNextMonthButton(profile);
    showLoading(false);
    showToast(`${monthName} plan ready! ${mode === 'next' ? 'Continuing toward race day.' : 'Drag workouts to rearrange.'} ✅`, 'success');
  } catch (err) {
    showLoading(false);
    console.error('Generation error:', err);
    showToast(`Error: ${err.message}`, 'error');
  }
}

function buildPrompt({ profile, year, month, monthName, startDay, daysInMonth, phase, weeksToRace, mode, raceDate }) {
  const paceLabel = profile.paceUnit === 'km' ? 'min/km' : 'min/mile';
  const raceFmt = raceDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const raceIsThisMonth = raceDate.getFullYear() === year && raceDate.getMonth() === month;
  const lastDay = raceIsThisMonth ? raceDate.getDate() - 1 : daysInMonth;
  const hrSection = profile.maxHR
    ? `- Max HR: ${profile.maxHR} bpm\n  Z1: ${Math.round(profile.maxHR * 0.50)}–${Math.round(profile.maxHR * 0.60)} bpm | Z2: ${Math.round(profile.maxHR * 0.60)}–${Math.round(profile.maxHR * 0.70)} bpm | Z3: ${Math.round(profile.maxHR * 0.70)}–${Math.round(profile.maxHR * 0.80)} bpm | Z4: ${Math.round(profile.maxHR * 0.80)}–${Math.round(profile.maxHR * 0.90)} bpm | Z5: ${Math.round(profile.maxHR * 0.90)}–${profile.maxHR} bpm`
    : '- Max HR: not provided — use pace guidance only';
  const longestRun = profile.longestRun
    ? `- Current longest comfortable run: ${profile.longestRun} ${profile.distUnit}`
    : '';
  const continuation = mode === 'next' && generatedMonths.length > 0
    ? 'This is a continuation. The athlete has completed the previous month. Continue progressive overload building toward race day.'
    : '';
  const longRunDay = profile.longRunDay || 'Saturday';

  return `You are an expert running coach. Generate a training plan for ${monthName} ${year}.

ATHLETE PROFILE:
- 5K PB: ${profile.pb}
${longestRun}
- Race goal: ${profile.goalTime} for ${profile.distance}
- Race date: ${raceFmt} (${weeksToRace} weeks away)
- Training days per week: ${profile.days}
- Preferred long run day: ${longRunDay}
- Pace preference: ${paceLabel}
${hrSection}

TRAINING PHASE: ${phase.toUpperCase()}
${continuation}

CRITICAL RULES:
- Generate workouts for days ${startDay} to ${lastDay} ONLY
- Do NOT include days 1–${startDay - 1} (past days)
- Do NOT include days after ${lastDay}${raceIsThisMonth ? ' (race day is handled separately)' : ''}
- Schedule the long run on ${longRunDay} every week unless race week requires a different structure
- Hard sessions (intervals/tempo) always followed by easy or rest day
- Total running days per week = exactly ${profile.days}
- Build sessions progressively from athlete's current base of ${profile.longestRun || 'unknown'} ${profile.distUnit}

RESPOND with ONLY a valid JSON array, no markdown:
[
  {"day":${startDay},"type":"easy","title":"Easy Aerobic Run","warm_up":"...","main_session":"...","cool_down":"...","notes":"..."},
  {"day":${startDay + 1},"type":"rest","title":"Rest Day","description":"..."}
]

Types: easy | tempo | interval | long | rest
Non-rest days MUST have: warm_up, main_session, cool_down, notes
Always include HR zone AND ${paceLabel} pace in main_session
For intervals: number of reps, distance, target pace, recovery duration`;
}

function showLoading(show) {
  const overlay = document.getElementById('loading-overlay');
  if (show) {
    overlay.classList.add('show');
    const msgs = ['Analysing your fitness profile…', 'Calculating training phases…', 'Building your weekly structure…', 'Finalising your calendar…'];
    let i = 0;
    window._loadingInterval = setInterval(() => {
      i = (i + 1) % msgs.length;
      document.getElementById('loading-sub').textContent = msgs[i];
    }, 1800);
  } else {
    overlay.classList.remove('show');
    clearInterval(window._loadingInterval);
  }
}

let toastTimeout;
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 4500);
}

document.addEventListener('DOMContentLoaded', () => {
  const hrInput = document.getElementById('max-hr');
  hrInput.addEventListener('input', () => {
    const val = parseInt(hrInput.value, 10);
    document.getElementById('btn-view-zones').disabled = !(val >= 100 && val <= 220);
  });

  document.getElementById('reset-plan-btn').addEventListener('click', resetPlan);
  attachTimePreviews();

  if (window.StrideAuth?.getSession()) {
    restoreCurrentUserState();
  } else {
    resetPlanWorkspace({ clearInputs: false });
  }
});

/* ══════════════════════════════════
   STRIDE — Auth Module
   ══════════════════════════════════ */

const USERS_KEY   = 'stride_users';
const SESSION_KEY = 'stride_session';

function createEmptyPlanState() {
  return {
    profile: null,
    generatedMonths: [],
    allMonths: {},
    activeMonthKey: null
  };
}

function normaliseUserRecord(record = {}) {
  return {
    name: record.name || '',
    password: record.password || '',
    preferences: record.preferences || {},
    planData: {
      ...createEmptyPlanState(),
      ...(record.planData || {})
    }
  };
}

function getUsers() {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  Object.keys(users).forEach((email) => {
    users[email] = normaliseUserRecord(users[email]);
  });
  return users;
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getCurrentUserEmail() {
  return getSession()?.email || null;
}

function getCurrentUserRecord() {
  const email = getCurrentUserEmail();
  if (!email) return null;
  const users = getUsers();
  return users[email] || null;
}

function updateUserRecord(email, updater) {
  if (!email) return null;
  const users = getUsers();
  const current = normaliseUserRecord(users[email] || {});
  const next = typeof updater === 'function' ? updater(current) : updater;
  users[email] = normaliseUserRecord(next);
  saveUsers(users);
  return users[email];
}

function updateCurrentUserRecord(updater) {
  const email = getCurrentUserEmail();
  if (!email) return null;
  return updateUserRecord(email, updater);
}

window.StrideAuth = {
  getUsers,
  getSession,
  getCurrentUserEmail,
  getCurrentUserRecord,
  updateCurrentUserRecord,
  saveCurrentUserPlan(planData) {
    return updateCurrentUserRecord((user) => ({
      ...user,
      planData: {
        ...createEmptyPlanState(),
        ...(planData || {})
      }
    }));
  },
  saveCurrentUserPreferences(preferences) {
    return updateCurrentUserRecord((user) => ({
      ...user,
      preferences: {
        ...(user.preferences || {}),
        ...(preferences || {})
      }
    }));
  },
  clearCurrentUserPlan() {
    return updateCurrentUserRecord((user) => ({
      ...user,
      preferences: {},
      planData: createEmptyPlanState()
    }));
  }
};

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.querySelector(`.auth-tab[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById(`${tab}-form`).classList.add('active');
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const users = getUsers();
  const errorEl = document.getElementById('login-error');
  const user = users[email];

  if (user && user.password === btoa(password)) {
    errorEl.classList.remove('show');
    const session = { email, name: user.name };
    saveSession(session);
    showDashboard(session);
  } else {
    errorEl.classList.add('show');
  }
}

function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  const users = getUsers();
  const errorEl = document.getElementById('signup-error');

  if (users[email]) {
    errorEl.classList.add('show');
    return;
  }

  errorEl.classList.remove('show');
  users[email] = normaliseUserRecord({
    name,
    password: btoa(password)
  });
  saveUsers(users);

  const session = { email, name };
  saveSession(session);
  showDashboard(session);
  showToast(`Welcome to STRIDE, ${name}! 🎉`, 'success');
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('dashboard-screen').classList.remove('active');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  window.handleUserLoggedOut?.();
  showToast('Logged out. See you next run! 👋', 'info');
}

function showDashboard(session) {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('dashboard-screen').classList.add('active');
  document.getElementById('topbar-username').textContent = session.name;
  document.getElementById('user-avatar-initials').textContent = session.name.charAt(0).toUpperCase();
  window.restoreCurrentUserState?.();
}

window.addEventListener('DOMContentLoaded', () => {
  const session = getSession();
  if (session) showDashboard(session);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('race-date').min = tomorrow.toISOString().split('T')[0];
});

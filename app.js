/* app.js — client-side profile, namespaced storage, export/import helpers */

/* Utility: simple base64-like id from email */
function makeUserId(email) {
  if (!email) return null;
  // normalize: lowercase, trim
  const e = email.trim().toLowerCase();
  // safe base64 variant (replace +/ with -_)
  try {
    return 'user_' + btoa(e).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    // fallback hashing
    return 'user_' + encodeURIComponent(e);
  }
}

/* Profile storage: single "current profile" stored under 'userProfile' */
function getCurrentProfile() {
  try {
    return JSON.parse(localStorage.getItem('userProfile')) || null;
  } catch (e) { return null; }
}
function saveCurrentProfile(profile) {
  localStorage.setItem('userProfile', JSON.stringify(profile));
}

/* Namespaced keys for progress and quiz stats */
function progressKey(userId) { return `progress:${userId}`; }
function quizStatsKey(userId) { return `quizStats:${userId}`; }

/* Get/set progress & stats for current user */
function getUserProgress(userId) {
  return JSON.parse(localStorage.getItem(progressKey(userId))) || {};
}
function saveUserProgress(userId, progress) {
  localStorage.setItem(progressKey(userId), JSON.stringify(progress));
}
function getUserQuizStats(userId) {
  return JSON.parse(localStorage.getItem(quizStatsKey(userId))) || {};
}
function saveUserQuizStats(userId, stats) {
  localStorage.setItem(quizStatsKey(userId), JSON.stringify(stats));
}

/* Public helpers used by pages */

/* Ensure profile exists; if none, create a "Guest" profile (no email) */
function ensureProfile() {
  let p = getCurrentProfile();
  if (!p) {
    p = { name: 'Guest', email: '', id: 'user_guest' };
    saveCurrentProfile(p);
  }
  return p;
}

/* Update header UI (call from pages after DOM loads) */
function renderHeaderProfile(widgetSelector = '#profileWidget') {
  const container = document.querySelector(widgetSelector);
  if (!container) return;
  const profile = ensureProfile();
  container.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'profile-btn';
  btn.title = `Signed in as ${profile.name || 'Guest'}`;
  const avatar = document.createElement('span');
  avatar.className = 'profile-avatar';
  avatar.textContent = profile.name ? (profile.name[0] || 'G').toUpperCase() : 'G';
  const info = document.createElement('div');
  info.style.display = 'flex';
  info.style.flexDirection = 'column';
  info.style.alignItems = 'flex-start';
  const n = document.createElement('strong'); n.style.fontSize = '0.95rem'; n.textContent = profile.name || 'Guest';
  const e = document.createElement('span'); e.className = 'small'; e.style.marginTop='2px'; e.textContent = profile.email || 'Not signed in';
  info.appendChild(n); info.appendChild(e);
  btn.appendChild(avatar); btn.appendChild(info);
  btn.addEventListener('click', showProfileModal);
  container.appendChild(btn);
}

/* Show profile modal (inline DOM creation) */
function showProfileModal() {
  const existing = document.getElementById('profile-modal');
  if (existing) existing.remove();

  const profile = getCurrentProfile() || { name: '', email: '', id: '' };
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'profile-modal';

  const modal = document.createElement('div');
  modal.className = 'modal';

  modal.innerHTML = `
    <h3>Profile</h3>
    <div class="form-row">
      <label for="profileName">Full name</label>
      <input id="profileName" type="text" value="${escapeHtml(profile.name || '')}" />
    </div>
    <div class="form-row">
      <label for="profileEmail">Email (used to identify your progress)</label>
      <input id="profileEmail" type="email" value="${escapeHtml(profile.email || '')}" placeholder="you@example.com" />
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
      <button id="clearProfileBtn" class="btn ghost">Sign out</button>
      <button id="saveProfileBtn" class="btn">Save</button>
    </div>
    <p class="small" style="margin-top:10px">Your progress is stored locally in your browser under this profile. Use Export/Import to move between devices.</p>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // event handlers
  document.getElementById('saveProfileBtn').addEventListener('click', () => {
    const name = document.getElementById('profileName').value.trim() || 'Guest';
    const email = document.getElementById('profileEmail').value.trim().toLowerCase();
    const id = email ? makeUserId(email) : 'user_guest';
    const newProfile = { name, email, id };
    saveCurrentProfile(newProfile);
    // Merge: if previous guest progress exists and a new profile is set, we won't auto-merge to avoid accidental overwrites.
    showToast('✅ Profile saved');
    renderHeaderProfile();
    backdrop.remove();
  });

  document.getElementById('clearProfileBtn').addEventListener('click', () => {
    if (!confirm('Sign out and clear current profile selection? (This won’t erase progress stored to a profile in localStorage)')) return;
    localStorage.removeItem('userProfile');
    showToast('Signed out — using Guest');
    renderHeaderProfile();
    backdrop.remove();
  });

  // close modal clicking backdrop
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
}

/* Export a user's progress/quizStats to JSON and trigger download */
function exportUserData(userId, filename = 'learn-python-export.json') {
  const data = {
    exportedAt: new Date().toISOString(),
    userId,
    profile: getCurrentProfile(),
    progress: getUserProgress(userId),
    quizStats: getUserQuizStats(userId)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Exported progress JSON');
}

/* Import user data from JSON file. Returns a Promise that resolves to object or rejects. */
function importUserDataFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file'));
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        // Basic validation
        if (!obj || !obj.userId) {
          return reject(new Error('Invalid file format (missing userId)'));
        }
        // Write into localStorage under that userId
        if (obj.progress) localStorage.setItem(progressKey(obj.userId), JSON.stringify(obj.progress));
        if (obj.quizStats) localStorage.setItem(quizStatsKey(obj.userId), JSON.stringify(obj.quizStats));
        // Optionally set profile
        if (obj.profile) localStorage.setItem('userProfile', JSON.stringify(obj.profile));
        showToast('Imported progress JSON');
        resolve(obj);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

/* Small helpers */
function showToast(msg, duration = 1800) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; }, duration);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* On load, ensure profile is rendered (call after DOM ready) */
document.addEventListener('DOMContentLoaded', () => {
  // ensure profile exists
  ensureProfile();
  // if page has #profileWidget placeholder, render there
  renderHeaderProfile('#profileWidget');
});

/* Expose functions for pages */
window.learnApp = {
  ensureProfile,
  getCurrentProfile,
  saveCurrentProfile,
  getUserProgress,
  saveUserProgress,
  getUserQuizStats,
  saveUserQuizStats,
  exportUserData,
  importUserDataFromFile,
  renderHeaderProfile,
  showProfileModal,
  progressKey,
  quizStatsKey
};

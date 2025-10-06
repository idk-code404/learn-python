/* app.js — Professional profile widget + namespaced storage + export/import
   Replace previous app.js with this file. Exposes `window.learnApp` as before.
*/

/* -------------------------
   Utilities & storage helpers
   ------------------------- */
function makeUserId(email) {
  if (!email) return 'user_guest';
  const e = email.trim().toLowerCase();
  try {
    return 'user_' + btoa(e).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    return 'user_' + encodeURIComponent(e);
  }
}

function progressKey(userId) { return `progress:${userId}`; }
function quizStatsKey(userId) { return `quizStats:${userId}`; }

function getCurrentProfile() {
  try { return JSON.parse(localStorage.getItem('userProfile')) || null; } catch(e){ return null; }
}
function saveCurrentProfile(p) {
  localStorage.setItem('userProfile', JSON.stringify(p));
}

/* per-user progress/stats */
function getUserProgress(userId) { return JSON.parse(localStorage.getItem(progressKey(userId))) || {}; }
function saveUserProgress(userId, progress) { localStorage.setItem(progressKey(userId), JSON.stringify(progress)); }
function getUserQuizStats(userId) { return JSON.parse(localStorage.getItem(quizStatsKey(userId))) || {}; }
function saveUserQuizStats(userId, stats) { localStorage.setItem(quizStatsKey(userId), JSON.stringify(stats)); }

/* simple toast */
function showToast(msg, time = 1600) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(()=> t.style.opacity = '0', time);
}

/* escape helper */
function escapeHtml(s='') { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* -------------------------
   Export / Import helpers
   ------------------------- */
function exportUserData(userId, filename = 'learn-python-export.json') {
  const profile = getCurrentProfile() || { id: userId, name: 'Guest', email: '' };
  const payload = {
    exportedAt: new Date().toISOString(),
    userId,
    profile,
    progress: getUserProgress(userId),
    quizStats: getUserQuizStats(userId)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Exported progress');
}

function importUserDataFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        if (!obj || !obj.userId) return reject(new Error('Invalid file format'));
        // write data under that userId
        if (obj.progress) localStorage.setItem(progressKey(obj.userId), JSON.stringify(obj.progress));
        if (obj.quizStats) localStorage.setItem(quizStatsKey(obj.userId), JSON.stringify(obj.quizStats));
        if (obj.profile) localStorage.setItem('userProfile', JSON.stringify(obj.profile));
        showToast('Imported progress');
        resolve(obj);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

/* -------------------------
   Profile modal (edit profile)
   ------------------------- */
function showProfileModal() {
  const existing = document.getElementById('profile-modal');
  if (existing) existing.remove();

  const profile = getCurrentProfile() || { name: 'Guest', email: '', id: 'user_guest' };

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
      <label for="profileEmail">Email (optional — used to identify your data)</label>
      <input id="profileEmail" type="email" value="${escapeHtml(profile.email || '')}" placeholder="you@example.com" />
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
      <button id="signOutBtn" class="btn ghost">Sign out</button>
      <button id="saveProfileBtn" class="btn">Save</button>
    </div>
    <p class="small" style="margin-top:10px">Your progress is stored locally. Use Export to save or Import to load on another device.</p>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  document.getElementById('saveProfileBtn').addEventListener('click', () => {
    const name = document.getElementById('profileName').value.trim() || 'Guest';
    const email = document.getElementById('profileEmail').value.trim().toLowerCase();
    const id = email ? makeUserId(email) : 'user_guest';
    const newProfile = { name, email, id };
    saveCurrentProfile(newProfile);
    showToast('Profile saved');
    renderHeaderProfile('#profileWidget'); // re-render widget
    backdrop.remove();
  });

  document.getElementById('signOutBtn').addEventListener('click', () => {
    if (!confirm('Sign out (this won’t delete your saved progress)?')) return;
    localStorage.removeItem('userProfile');
    showToast('Signed out');
    renderHeaderProfile('#profileWidget');
    backdrop.remove();
  });

  // close by clicking backdrop
  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
}

/* -------------------------
   Professional profile widget rendering
   ------------------------- */
function renderHeaderProfile(selector = '#profileWidget') {
  const container = document.querySelector(selector);
  if (!container) return;

  // clear existing
  container.innerHTML = '';

  // ensure profile exists
  let profile = getCurrentProfile();
  if (!profile) {
    profile = { name: 'Guest', email: '', id: 'user_guest' };
    saveCurrentProfile(profile);
  }

  // create button
  const btn = document.createElement('button');
  btn.className = 'profile-btn';
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');

  const avatar = document.createElement('div');
  avatar.className = 'profile-avatar';
  avatar.textContent = (profile.name && profile.name[0]) ? profile.name[0].toUpperCase() : 'G';

  const info = document.createElement('div');
  info.className = 'profile-info';
  const nm = document.createElement('div'); nm.className = 'name'; nm.textContent = profile.name || 'Guest';
  const em = document.createElement('div'); em.className = 'email'; em.textContent = profile.email || 'Not signed in';
  em.style.fontSize = '0.78rem'; em.style.color = 'var(--muted)';

  info.appendChild(nm); info.appendChild(em);
  btn.appendChild(avatar); btn.appendChild(info);

  // append
  container.appendChild(btn);

  // create hidden file input for imports (reused)
  let hiddenInput = container.querySelector('input[data-import]');
  if (!hiddenInput) {
    hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    hiddenInput.accept = '.json,application/json';
    hiddenInput.style.display = 'none';
    hiddenInput.setAttribute('data-import', '1');
    container.appendChild(hiddenInput);
  }

  // dropdown menu creation + toggling
  let menu = null;
  function openMenu() {
    if (menu) return;
    menu = document.createElement('div');
    menu.className = 'profile-menu card';
    menu.setAttribute('role','menu');

    // user header
    const header = document.createElement('div');
    header.style.padding = '8px';
    header.style.borderRadius = '8px';
    header.innerHTML = `<div style="display:flex;align-items:center;gap:10px">
      <div style="width:40px;height:40px;border-radius:8px;background:var(--accent-gradient);color:#fff;display:grid;place-items:center;font-weight:800">${escapeHtml(profile.name ? profile.name[0].toUpperCase() : 'G')}</div>
      <div>
        <div style="font-weight:800">${escapeHtml(profile.name || 'Guest')}</div>
        <div class="small" style="color:var(--muted)">${escapeHtml(profile.email || 'Not signed in')}</div>
      </div>
    </div>`;
    menu.appendChild(header);

    // divider
    const hr = document.createElement('hr'); hr.style.border = 0; hr.style.borderTop = '1px solid var(--border)'; hr.style.margin = '8px 0';
    menu.appendChild(hr);

    // menu items
    const items = [
      { id: 'edit', label: 'Edit Profile', hint: '' },
      { id: 'export', label: 'Export Data', hint: 'Download JSON' },
      { id: 'import', label: 'Import Data', hint: 'Load JSON' },
      { id: 'signout', label: 'Sign out', hint: '' }
    ];
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'menu-item';
      row.setAttribute('role','menuitem');
      row.dataset.action = it.id;
      row.innerHTML = `<div style="font-weight:800">${escapeHtml(it.label)}</div><div class="hint">${escapeHtml(it.hint)}</div>`;
      row.addEventListener('click', onMenuAction);
      menu.appendChild(row);
    });

    // position menu relative to header
    // attach to body to avoid overflow clipping
    document.body.appendChild(menu);
    // compute position
    const rect = btn.getBoundingClientRect();
    const top = rect.bottom + 10;
    const right = Math.min(window.innerWidth - 12, rect.right);
    menu.style.top = `${top}px`;
    menu.style.left = `${Math.max(12, right - menu.offsetWidth)}px`;

    // close on outside click or escape
    setTimeout(() => { document.addEventListener('click', outsideHandler); document.addEventListener('keydown', escHandler); }, 10);
    btn.setAttribute('aria-expanded','true');
  }

  function closeMenu() {
    if (!menu) return;
    menu.remove();
    menu = null;
    document.removeEventListener('click', outsideHandler);
    document.removeEventListener('keydown', escHandler);
    btn.setAttribute('aria-expanded','false');
  }

  function outsideHandler(e) {
    if (!menu) return;
    if (!menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
  }
  function escHandler(e) { if (e.key === 'Escape') closeMenu(); }

  async function onMenuAction(e) {
    const action = e.currentTarget.dataset.action;
    const profileNow = getCurrentProfile() || { id: 'user_guest' };
    const userId = profileNow.id || 'user_guest';

    if (action === 'edit') {
      closeMenu();
      showProfileModal();
      return;
    }
    if (action === 'export') {
      closeMenu();
      const filename = `${(profileNow.name || 'progress').replace(/\s+/g,'-')}-${userId}.json`;
      exportUserData(userId, filename);
      return;
    }
    if (action === 'import') {
      closeMenu();
      // trigger hidden input
      hiddenInput.value = '';
      hiddenInput.click();
      hiddenInput.onchange = async (ev) => {
        const f = ev.target.files[0];
        if (!f) return;
        try {
          await importUserDataFromFile(f);
          // after import, re-render widget to new profile (if changed)
          renderHeaderProfile(selector);
          setTimeout(()=> location.reload(), 600);
        } catch (err) {
          alert('Import failed: ' + (err && err.message ? err.message : err));
        }
      };
      return;
    }
    if (action === 'signout') {
      closeMenu();
      if (!confirm('Sign out? This will stop using this profile locally (data remains stored).')) return;
      localStorage.removeItem('userProfile');
      renderHeaderProfile(selector);
      showToast('Signed out');
      return;
    }
  }

  // bind
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu) closeMenu(); else openMenu();
  });

  // keyboard: Enter/Space to open
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); btn.click();
    }
  });
}

/* -------------------------
   Boot: render minimal profile on load
   ------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const profile = getCurrentProfile();
  if (!profile) {
    saveCurrentProfile({ name: 'Guest', email: '', id: 'user_guest' });
  }
  // render if placeholder exists
  if (document.querySelector('#profileWidget')) {
    renderHeaderProfile('#profileWidget');
  }
});

/* expose API */
window.learnApp = {
  makeUserId,
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
  showToast
};

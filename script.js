// script.js
// Full renderer for lessons + exercises, with copy & run behavior

/* ---------- Helpers (copy, toast, open) ---------- */

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast('✅ Copied to clipboard');
    return true;
  } catch (err) {
    console.error('Copy failed', err);
    showToast('⚠️ Copy failed');
    return false;
  }
}

function showToast(msg, duration = 1600) {
  let t = document.getElementById('toast-notice');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast-notice';
    Object.assign(t.style, {
      position: 'fixed',
      bottom: '22px',
      right: '22px',
      padding: '10px 14px',
      background: 'rgba(0,0,0,0.85)',
      color: '#fff',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      zIndex: 9999,
      fontWeight: 700,
      opacity: '0',
      transition: 'opacity 0.18s',
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => { t.style.opacity = '0'; }, duration);
}

function openPlaygroundWithCodeInNewTab(code, newTabRef = null) {
  const url = `playground.html?code=${encodeURIComponent(code)}`;
  try {
    if (newTabRef && !newTabRef.closed) {
      newTabRef.location = url;
    } else {
      window.open(url, '_blank');
    }
  } catch (e) {
    window.open(url, '_blank');
  }
}

/* ---------- Rendering: lessons + exercises ---------- */

document.addEventListener('DOMContentLoaded', () => {
  const lessonsContainer = document.getElementById('lessons');
  const tocList = document.getElementById('toc-list');

  if (!lessonsContainer) return;

  fetch('lessons.json')
    .then(res => res.json())
    .then(lessons => {
      // Group lessons by category
      const categories = {};
      lessons.forEach(l => {
        const cat = l.category || 'Uncategorized';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(l);
      });

      // Render categories and TOC
      for (const category of Object.keys(categories)) {
        const sectionId = category.toLowerCase().replace(/\s+/g, '-');

        // Add TOC link
        if (tocList) {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = `#${sectionId}`;
          a.textContent = category;
          li.appendChild(a);
          tocList.appendChild(li);
        }

        // Category section
        const section = document.createElement('div');
        section.className = 'category';
        section.id = sectionId;

        const header = document.createElement('h2');
        header.textContent = category;
        header.className = 'category-header';
        header.addEventListener('click', () => section.classList.toggle('collapsed'));

        const lessonsList = document.createElement('div');
        lessonsList.className = 'lessons-list';

        categories[category].forEach(lesson => {
          // Lesson block
          const lessonEl = document.createElement('div');
          lessonEl.className = 'lesson';
          lessonEl.id = `lesson-${lesson.id}`;

          const title = document.createElement('h3');
          title.textContent = lesson.title;

          const desc = document.createElement('p');
          desc.textContent = lesson.content;

          const pre = document.createElement('pre');
          const codeEl = document.createElement('code');
          codeEl.textContent = lesson.code || '';
          pre.appendChild(codeEl);

          // Buttons for lesson (Try Code & Open)
          const btnRow = document.createElement('div');
          btnRow.style.marginTop = '8px';
          btnRow.style.display = 'flex';
          btnRow.style.gap = '8px';
          btnRow.style.flexWrap = 'wrap';

          const tryBtn = document.createElement('button');
          tryBtn.className = 'try-copy';
          tryBtn.textContent = '▶ Try Code (Copy & Open)';
          tryBtn.title = 'Copy lesson code and open playground';
          tryBtn.addEventListener('click', async () => {
            let newTab = null;
            try { newTab = window.open('', '_blank'); } catch (e) { newTab = null; }
            await copyToClipboard(lesson.code || '');
            if (newTab) openPlaygroundWithCodeInNewTab(lesson.code || '', newTab);
            else openPlaygroundWithCodeInNewTab(lesson.code || '', null);
          });

          const openBtn = document.createElement('button');
          openBtn.className = 'playground-open';
          openBtn.textContent = 'Open Playground';
          openBtn.title = 'Open playground (paste the code)';
          openBtn.style.background = '#2ecc71';
          openBtn.addEventListener('click', () => {
            openPlaygroundWithCodeInNewTab(lesson.code || '', null);
          });

          btnRow.appendChild(tryBtn);
          btnRow.appendChild(openBtn);

          // Exercises area (if any)
          let exercisesContainer = null;
          if (Array.isArray(lesson.exercises) && lesson.exercises.length > 0) {
            // Toggle control
            const toggle = document.createElement('button');
            toggle.textContent = 'Show exercises';
            toggle.className = 'btn';
            toggle.style.background = 'transparent';
            toggle.style.border = '1px solid rgba(0,0,0,0.06)';
            toggle.style.color = 'var(--primary)';
            toggle.style.fontWeight = '700';

            exercisesContainer = document.createElement('div');
            exercisesContainer.className = 'exercises';
            exercisesContainer.style.display = 'none';
            exercisesContainer.style.marginTop = '12px';

            toggle.addEventListener('click', () => {
              const open = exercisesContainer.style.display === 'block';
              exercisesContainer.style.display = open ? 'none' : 'block';
              toggle.textContent = open ? 'Show exercises' : 'Hide exercises';
            });

            // Render each exercise
            lesson.exercises.forEach((ex, exIndex) => {
              const exCard = document.createElement('div');
              exCard.className = 'lesson';
              exCard.style.background = '#fff';
              exCard.style.border = '1px solid rgba(0,0,0,0.04)';
              exCard.style.padding = '10px';
              exCard.style.marginBottom = '10px';

              const exTitle = document.createElement('h4');
              exTitle.textContent = `Exercise ${exIndex + 1}`;

              const exPrompt = document.createElement('p');
              exPrompt.textContent = ex.prompt;

              // starter code block
              const exPre = document.createElement('pre');
              const exCode = document.createElement('code');
              exCode.textContent = ex.starter_code || '';
              exPre.appendChild(exCode);

              // hint toggle
              const hintBtn = document.createElement('button');
              hintBtn.textContent = 'Show hint';
              hintBtn.className = 'btn';
              hintBtn.style.background = 'transparent';
              hintBtn.style.border = '1px solid rgba(0,0,0,0.06)';
              hintBtn.style.color = 'var(--primary)';
              hintBtn.style.fontWeight = '700';
              hintBtn.style.marginRight = '8px';

              const hintText = document.createElement('div');
              hintText.textContent = ex.hint || '';
              hintText.style.display = 'none';
              hintText.style.marginTop = '8px';
              hintText.style.color = 'var(--muted)';
              hintText.style.fontSize = '0.95rem';

              hintBtn.addEventListener('click', () => {
                const showing = hintText.style.display === 'block';
                hintText.style.display = showing ? 'none' : 'block';
                hintBtn.textContent = showing ? 'Show hint' : 'Hide hint';
              });

              // exercise buttons: Copy Starter, Run Starter
              const exBtns = document.createElement('div');
              exBtns.style.display = 'flex';
              exBtns.style.gap = '8px';
              exBtns.style.marginTop = '8px';
              exBtns.style.flexWrap = 'wrap';

              const copyStarter = document.createElement('button');
              copyStarter.className = 'try-copy';
              copyStarter.textContent = 'Copy Starter';
              copyStarter.addEventListener('click', async () => {
                await copyToClipboard(ex.starter_code || '');
              });

              const runStarter = document.createElement('button');
              runStarter.className = 'playground-open';
              runStarter.textContent = 'Run Starter (Copy & Open)';
              runStarter.style.background = '#2ecc71';
              runStarter.addEventListener('click', async () => {
                let newTab = null;
                try { newTab = window.open('', '_blank'); } catch (e) { newTab = null; }
                await copyToClipboard(ex.starter_code || '');
                if (newTab) openPlaygroundWithCodeInNewTab(ex.starter_code || '', newTab);
                else openPlaygroundWithCodeInNewTab(ex.starter_code || '', null);
              });

              exBtns.appendChild(copyStarter);
              exBtns.appendChild(runStarter);

              // solution reveal toggle (optional small "Show solution" button)
              const solBtn = document.createElement('button');
              solBtn.textContent = 'Show solution';
              solBtn.className = 'btn';
              solBtn.style.background = 'transparent';
              solBtn.style.border = '1px solid rgba(0,0,0,0.06)';
              solBtn.style.color = 'var(--primary)';
              solBtn.style.marginLeft = '8px';

              const solText = document.createElement('pre');
              const solCode = document.createElement('code');
              solCode.textContent = ex.solution || '';
              solText.appendChild(solCode);
              solText.style.display = 'none';
              solText.style.marginTop = '10px';
              solText.style.background = '#f6f8fa';
              solText.style.padding = '10px';
              solText.style.borderRadius = '6px';

              solBtn.addEventListener('click', () => {
                const showing = solText.style.display === 'block';
                solText.style.display = showing ? 'none' : 'block';
                solBtn.textContent = showing ? 'Show solution' : 'Hide solution';
              });

              // assemble exercise card
              exCard.appendChild(exTitle);
              exCard.appendChild(exPrompt);
              exCard.appendChild(exPre);
              exCard.appendChild(exBtns);
              exCard.appendChild(hintBtn);
              exCard.appendChild(solBtn);
              exCard.appendChild(hintText);
              exCard.appendChild(solText);

              exercisesContainer.appendChild(exCard);
            });

            // add toggle and container to lesson
            lessonEl.appendChild(toggle);
            lessonEl.appendChild(exercisesContainer);
          }

          // assemble lesson
          lessonEl.appendChild(title);
          lessonEl.appendChild(desc);
          lessonEl.appendChild(pre);
          lessonEl.appendChild(btnRow);

          lessonsList.appendChild(lessonEl);
        });

        section.appendChild(header);
        section.appendChild(lessonsList);
        lessonsContainer.appendChild(section);
      }

      // Scroll-spy for TOC highlighting
      const tocLinks = document.querySelectorAll('#toc a');
      const sections = document.querySelectorAll('.category');
      window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
          const rect = section.getBoundingClientRect();
          if (rect.top <= 120) current = section.id;
        });
        tocLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + current) link.classList.add('active');
        });
      });

      // If a hash targets lesson-<id>, smooth scroll it into view
      if (location.hash && location.hash.startsWith('#lesson-')) {
        const target = document.querySelector(location.hash);
        if (target) {
          setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
          // briefly highlight
          target.style.transition = 'box-shadow 0.6s ease';
          target.style.boxShadow = '0 6px 22px rgba(46,204,113,0.12)';
          setTimeout(() => { target.style.boxShadow = ''; }, 1800);
        }
      }
    })
    .catch(err => {
      lessonsContainer.innerHTML = '<p>Failed to load lessons.</p>';
      console.error(err);
    });
});

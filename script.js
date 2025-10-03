// script.js
// Handles lesson rendering, TOC, progress, quiz, clipboard copy + open playground.

function checkAnswer(selected, correct, lessonId) {
  if (selected === correct) {
    alert("✅ Correct!");
    localStorage.setItem(`lesson-${lessonId}`, "completed");
  } else {
    alert("❌ Try again.");
  }
}

function openPlaygroundWindowWithCodeEncoded(code) {
  const url = `playground.html?code=${encodeURIComponent(code)}`;
  // Open in a new tab/window (used as fallback if blank window couldn't be created earlier)
  window.open(url, "_blank");
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    showToast("✅ Code copied to clipboard");
    return true;
  } catch (err) {
    console.error("Copy failed", err);
    showToast("⚠️ Failed to copy (opening playground anyway)");
    return false;
  }
}

function showToast(msg, duration = 1800) {
  let t = document.getElementById("toast-notice");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast-notice";
    t.style.position = "fixed";
    t.style.bottom = "24px";
    t.style.right = "24px";
    t.style.padding = "10px 14px";
    t.style.background = "rgba(0,0,0,0.85)";
    t.style.color = "white";
    t.style.borderRadius = "8px";
    t.style.boxShadow = "0 6px 18px rgba(0,0,0,0.2)";
    t.style.zIndex = 9999;
    t.style.fontFamily = "system-ui, Arial, sans-serif";
    t.style.fontSize = "14px";
    t.style.transition = "opacity 0.25s";
    t.style.opacity = "0";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => {
    t.style.opacity = "0";
  }, duration);
}

// Build lessons, TOC, progress etc.
document.addEventListener("DOMContentLoaded", () => {
  const lessonsContainer = document.getElementById("lessons");
  const tocList = document.getElementById("toc-list");
  const progressContainer = document.getElementById("progress");

  // Load lessons and render
  if (lessonsContainer) {
    fetch("lessons.json")
      .then(response => response.json())
      .then(lessons => {
        // Group lessons by category
        const categories = {};
        lessons.forEach(lesson => {
          const cat = lesson.category || "Uncategorized";
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push(lesson);
        });

        // Build sections and TOC
        for (const category of Object.keys(categories)) {
          const sectionId = category.toLowerCase().replace(/\s+/g, "-");

          // TOC entry
          if (tocList) {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = `#${sectionId}`;
            a.textContent = category;
            li.appendChild(a);
            tocList.appendChild(li);
          }

          // Section wrapper
          const section = document.createElement("div");
          section.className = "category";
          section.id = sectionId;

          const header = document.createElement("h2");
          header.textContent = category;
          header.className = "category-header";
          header.addEventListener("click", () => section.classList.toggle("collapsed"));

          const lessonsList = document.createElement("div");
          lessonsList.className = "lessons-list";

          // Render each lesson
          categories[category].forEach(lesson => {
            const div = document.createElement("div");
            div.className = "lesson";

            const title = document.createElement("h3");
            title.textContent = lesson.title;

            const desc = document.createElement("p");
            desc.textContent = lesson.content;

            const pre = document.createElement("pre");
            const codeEl = document.createElement("code");
            codeEl.textContent = lesson.code;
            pre.appendChild(codeEl);

            // Buttons container
            const btnRow = document.createElement("div");
            btnRow.style.marginTop = "8px";

            // Try Code button (copies code to clipboard AND opens playground)
            const tryBtn = document.createElement("button");
            tryBtn.textContent = "▶ Try Code (Copy & Open)";
            tryBtn.title = "Copy this lesson's code to clipboard and open the playground";
            tryBtn.style.background = "#3498db";
            tryBtn.style.color = "#fff";

            // Open a blank tab synchronously to avoid popup blockers, then navigate it after copy completes.
            tryBtn.addEventListener("click", async (e) => {
              // open a blank tab synchronously (allowed because this handler runs on user click)
              const newWin = window.open("", "_blank");

              // attempt to copy
              await copyToClipboard(lesson.code);

              // navigate the opened tab to playground with code param (fallback if newWin was blocked)
              const playgroundUrl = `playground.html?code=${encodeURIComponent(lesson.code)}`;
              if (newWin) {
                try {
                  newWin.location = playgroundUrl;
                } catch (err) {
                  // In case assigning location fails, open via window.open fallback
                  window.open(playgroundUrl, "_blank");
                }
              } else {
                // If window.open failed (blocked), open normally (may be blocked too)
                window.open(playgroundUrl, "_blank");
              }
            });

            // Open Playground button (just open playground)
            const openBtn = document.createElement("button");
            openBtn.textContent = "Open Playground";
            openBtn.title = "Open the playground (paste code there)";
            openBtn.style.background = "#2ecc71";
            openBtn.style.color = "#fff";
            openBtn.addEventListener("click", () => {
              // open synchronously (user gesture)
              const url = `playground.html?code=${encodeURIComponent(lesson.code)}`;
              window.open(url, "_blank");
            });

            btnRow.appendChild(tryBtn);
            btnRow.appendChild(openBtn);

            // Quiz block
            const quizDiv = document.createElement("div");
            quizDiv.className = "quiz";
            quizDiv.style.marginTop = "10px";

            const qP = document.createElement("p");
            qP.innerHTML = `<strong>Quiz:</strong> ${lesson.quiz.question}`;
            quizDiv.appendChild(qP);

            const optionsRow = document.createElement("div");
            lesson.quiz.options.forEach(opt => {
              const optBtn = document.createElement("button");
              optBtn.textContent = opt;
              optBtn.addEventListener("click", () => checkAnswer(opt, lesson.quiz.answer, lesson.id));
              optionsRow.appendChild(optBtn);
            });
            quizDiv.appendChild(optionsRow);

            // Assemble lesson card
            div.appendChild(title);
            div.appendChild(desc);
            div.appendChild(pre);
            div.appendChild(btnRow);
            div.appendChild(quizDiv);

            lessonsList.appendChild(div);
          });

          section.appendChild(header);
          section.appendChild(lessonsList);
          lessonsContainer.appendChild(section);
        }

        // Scroll spy for TOC highlighting (only after DOM sections exist)
        const tocLinks = document.querySelectorAll("#toc a");
        const sections = document.querySelectorAll(".category");
        window.addEventListener("scroll", () => {
          let current = "";
          sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 120) {
              current = section.id;
            }
          });
          tocLinks.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === "#" + current) {
              link.classList.add("active");
            }
          });
        });

      })
      .catch(err => {
        lessonsContainer.innerHTML = "<p>Failed to load lessons.</p>";
        console.error(err);
      });
  }

  // Progress dashboard partial rendering
  if (progressContainer) {
    fetch("lessons.json")
      .then(response => response.json())
      .then(lessons => {
        let completed = 0;
        const total = lessons.length;
        lessons.forEach(lesson => {
          if (localStorage.getItem(`lesson-${lesson.id}`) === "completed") {
            completed++;
          }
        });
        progressContainer.innerHTML = `
          <p>You have completed ${completed} of ${total} lessons.</p>
          <progress value="${completed}" max="${total}" style="width:100%"></progress>
        `;
      });
  }
});

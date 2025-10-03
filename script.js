let pyodide;

// --- Load lessons list ---
async function loadLessons() {
  const res = await fetch("lessons.json");
  const lessons = await res.json();
  const ul = document.getElementById("lessons");
  if (!ul) return;

  lessons.forEach(lesson => {
    const li = document.createElement("li");
    const done = localStorage.getItem("lesson_" + lesson.id) === "done";
    li.innerHTML = `<a href="lesson.html?id=${lesson.id}">${lesson.title}</a>
      ${done ? "✅" : ""}`;
    ul.appendChild(li);
  });
}

// --- Load individual lesson ---
async function loadLesson() {
  const res = await fetch("lessons.json");
  const lessons = await res.json();
  const id = new URLSearchParams(window.location.search).get("id");
  const lesson = lessons.find(l => l.id == id);

  if (!lesson) return;

  document.getElementById("lesson-title").textContent = lesson.title;
  document.getElementById("lesson-content").textContent = lesson.content;
  document.getElementById("lesson-code").value = lesson.code;

  // Run code
  pyodide = await loadPyodide();
  document.getElementById("run").addEventListener("click", async () => {
    let code = document.getElementById("lesson-code").value;
    try {
      let result = await pyodide.runPythonAsync(code);
      document.getElementById("output").textContent = result ?? "";
    } catch (err) {
      document.getElementById("output").textContent = err;
    }
  });

  // Quiz link
  document.getElementById("quiz-link").href = "quiz.html?id=" + lesson.id;
}

// --- Load quiz ---
async function loadQuiz() {
  const res = await fetch("lessons.json");
  const lessons = await res.json();
  const id = new URLSearchParams(window.location.search).get("id");
  const lesson = lessons.find(l => l.id == id);

  if (!lesson) return;

  document.getElementById("quiz-question").textContent = lesson.quiz.question;
  const optionsDiv = document.getElementById("quiz-options");
  lesson.quiz.options.forEach(opt => {
    let btn = document.createElement("button");
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      if (opt === lesson.quiz.answer) {
        document.getElementById("quiz-feedback").textContent = "✅ Correct!";
        localStorage.setItem("lesson_" + lesson.id, "done");
      } else {
        document.getElementById("quiz-feedback").textContent = "❌ Try again.";
      }
    });
    optionsDiv.appendChild(btn);
  });
}

// --- Run correct loader ---
if (document.getElementById("lessons")) loadLessons();
if (document.getElementById("lesson-title")) loadLesson();
if (document.getElementById("quiz-question")) loadQuiz();

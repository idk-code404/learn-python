document.addEventListener("DOMContentLoaded", () => {
  const lessonsContainer = document.getElementById("lessons");
  const tocList = document.getElementById("toc-list");
  const progressContainer = document.getElementById("progress");

  if (lessonsContainer) {
    fetch("lessons.json")
      .then(response => response.json())
      .then(lessons => {
        // Group lessons by category
        const categories = {};
        lessons.forEach(lesson => {
          if (!categories[lesson.category]) {
            categories[lesson.category] = [];
          }
          categories[lesson.category].push(lesson);
        });

        // Render categories + TOC
        for (const category in categories) {
          const sectionId = category.toLowerCase();

          // Add to TOC
          const li = document.createElement("li");
          li.innerHTML = `<a href="#${sectionId}">${category}</a>`;
          tocList.appendChild(li);

          // Build section
          const section = document.createElement("div");
          section.className = "category";
          section.id = sectionId;

          const header = document.createElement("h2");
          header.textContent = category;
          header.className = "category-header";
          header.addEventListener("click", () => {
            section.classList.toggle("collapsed");
          });

          const lessonsList = document.createElement("div");
          lessonsList.className = "lessons-list";

          categories[category].forEach(lesson => {
            const div = document.createElement("div");
            div.className = "lesson";
            div.innerHTML = `
              <h3>${lesson.title}</h3>
              <p>${lesson.content}</p>
              <pre><code>${lesson.code}</code></pre>
              <button onclick="openPlayground(\`${encodeURIComponent(lesson.code)}\`)">▶ Try Code</button>
              <div class="quiz">
                <p><strong>Quiz:</strong> ${lesson.quiz.question}</p>
                ${lesson.quiz.options.map(opt =>
                  `<button onclick="checkAnswer('${opt}','${lesson.quiz.answer}',${lesson.id})">${opt}</button>`
                ).join("")}
              </div>
            `;
            lessonsList.appendChild(div);
          });

          section.appendChild(header);
          section.appendChild(lessonsList);
          lessonsContainer.appendChild(section);
        }
      })
      .catch(err => {
        lessonsContainer.innerHTML = "<p>Failed to load lessons.</p>";
        console.error(err);
      });
  }

  // Progress dashboard
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
          <progress value="${completed}" max="${total}"></progress>
        `;
      });
  }
});

function checkAnswer(selected, correct, lessonId) {
  if (selected === correct) {
    alert("✅ Correct!");
    localStorage.setItem(`lesson-${lessonId}`, "completed");
  } else {
    alert("❌ Try again.");
  }
}

function openPlayground(code) {
  window.location.href = `playground.html?code=${code}`;
}

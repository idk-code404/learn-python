document.addEventListener("DOMContentLoaded", () => {
  const lessonsContainer = document.getElementById("lessons");

  if (lessonsContainer) {
    fetch("lessons.json")
      .then(response => response.json())
      .then(lessons => {
        lessons.forEach(lesson => {
          const div = document.createElement("div");
          div.className = "lesson";
          div.innerHTML = `
            <h2>${lesson.title}</h2>
            <p>${lesson.content}</p>
            <pre><code>${lesson.code}</code></pre>
            <div class="quiz">
              <p><strong>Quiz:</strong> ${lesson.quiz.question}</p>
              ${lesson.quiz.options.map(opt =>
                `<button onclick="checkAnswer('${opt}','${lesson.quiz.answer}',${lesson.id})">${opt}</button>`
              ).join("")}
            </div>
          `;
          lessonsContainer.appendChild(div);
        });
      })
      .catch(err => {
        lessonsContainer.innerHTML = "<p>Failed to load lessons.</p>";
        console.error(err);
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

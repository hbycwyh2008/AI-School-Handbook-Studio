// ---- DOM Elements ----
var uploadForm = document.getElementById("upload-form");
var uploadStatus = document.getElementById("upload-status");
var askForm = document.getElementById("ask-form");
var askBtn = document.getElementById("ask-btn");
var questionInput = document.getElementById("question-input");
var answerCard = document.getElementById("answer-card");
var answerText = document.getElementById("answer-text");
var sourcesList = document.getElementById("sources-list");

// ---- Upload Handbook ----
uploadForm.addEventListener("submit", function (e) {
  e.preventDefault();
  var fileInput = document.getElementById("handbook-file");
  if (!fileInput.files.length) return;

  var formData = new FormData();
  formData.append("file", fileInput.files[0]);

  uploadStatus.textContent = "Uploading and processing…";

  fetch("/api/ingest", { method: "POST", body: formData })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      uploadStatus.textContent = "Done! " + data.chunks + " chunks saved.";
    })
    .catch(function (err) {
      uploadStatus.textContent = "Error: " + err.message;
    });
});

// ---- Ask Question ----
askForm.addEventListener("submit", function (e) {
  e.preventDefault();
  var question = questionInput.value.trim();
  if (!question) return;

  askBtn.classList.add("loading");
  answerCard.style.display = "none";

  fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: question })
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      askBtn.classList.remove("loading");

      answerText.textContent = data.answer;

      sourcesList.innerHTML = "";
      if (data.sources && data.sources.length) {
        data.sources.forEach(function (src) {
          var div = document.createElement("div");
          div.className = "alert alert-light py-2 px-3 mb-2";
          div.innerHTML =
            '<span class="source-badge badge bg-secondary me-2">' + src.section + "</span>" +
            '<span class="text-muted small">' + src.text + "</span>";
          sourcesList.appendChild(div);
        });
      } else {
        sourcesList.innerHTML = '<p class="text-muted small">No sources found.</p>';
      }

      answerCard.style.display = "block";
    })
    .catch(function (err) {
      askBtn.classList.remove("loading");
      alert("Something went wrong: " + err.message);
    });
});

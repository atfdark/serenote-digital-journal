// Sidebar & overlay handling
const navItems = document.querySelectorAll(".sidebar nav ul li");
const content = document.getElementById("content");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("overlay");

// Toggle sidebar
menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("active");
  overlay.classList.toggle("show");
});

// Close sidebar when clicking overlay
overlay.addEventListener("click", () => {
  sidebar.classList.remove("active");
  overlay.classList.remove("show");
});

// Close sidebar when navigation item is clicked
navItems.forEach(item => {
  item.addEventListener("click", () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("show");
  });
});

// ----------------- CALENDAR -----------------
let currentDate = new Date();

function renderCalendar() {
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  let calendarHTML = `
    <div class="calendar-container">
      <div class="calendar-header">
        <button id="prevBtn">&lt;</button>
        <h2>${monthNames[month]} ${year}</h2>
        <button id="nextBtn">&gt;</button>
      </div>
      <div class="calendar-grid">
  `;

  // Day names
  dayNames.forEach(d => {
    calendarHTML += `<div class="day-name">${d}</div>`;
  });

  // Empty slots for prev month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarHTML += `<div class="calendar-day inactive"></div>`;
  }

  // Days of current month
  for (let i = 1; i <= lastDayOfMonth; i++) {
    const isToday =
      i === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
        ? "today"
        : "";
    calendarHTML += `<div class="calendar-day ${isToday}" data-day="${i}">${i}</div>`;
  }

  calendarHTML += `</div></div>`;
  content.innerHTML = calendarHTML;

  // Navigation buttons
  document.getElementById("prevBtn").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("nextBtn").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Click on day → show journal for that date
  document.querySelectorAll(".calendar-day:not(.inactive)").forEach(dayEl => {
    dayEl.addEventListener("click", () => {
      document.querySelectorAll(".calendar-day.selected").forEach(sel =>
        sel.classList.remove("selected")
      );
      dayEl.classList.add("selected");

      const selectedDate = `${monthNames[month]} ${dayEl.dataset.day}, ${year}`;

      // Load journal page with selected date
      loadJournal(selectedDate);
    });
  });
}

// ----------------- JOURNAL -----------------
function loadJournal(dateString) {
  content.innerHTML = `
    <div class="journal-header">
      <div class="date-box">📅 ${dateString}</div>
      <h1>📖 Journal</h1>
    </div>
    <div class="journal-container">
      <textarea id="journalEntry" placeholder="Dear Journal..."></textarea>
      <button id="saveJournal">💾 Save Entry</button>
      <p id="saveMsg" class="hidden">✅ Your journal entry has been saved!</p>
    </div>
  `;

  // Load saved entry (unique per date)
  const savedEntry = localStorage.getItem(`journalEntry-${dateString}`);
  if (savedEntry) {
    document.getElementById("journalEntry").value = savedEntry;
  }

  document.getElementById("saveJournal").addEventListener("click", () => {
    const entry = document.getElementById("journalEntry").value;
    localStorage.setItem(`journalEntry-${dateString}`, entry);

    const msg = document.getElementById("saveMsg");
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 2000);
  });
}

// ----------------- VOICE NOTES -----------------
function loadVoiceNotes() {
  content.innerHTML = `
    <h1>🎙 Voice Notes</h1>
    <p class="voice-msg">🎤 Feel like sharing your thoughts?</p>
    <canvas id="waveform"></canvas>
    <div class="voice-controls">
      <button id="recordBtn">⏺ Record</button>
      <button id="pauseBtn" disabled>⏸ Pause</button>
      <button id="saveBtn" disabled>💾 Save</button>
    </div>
    <p id="voiceStatus"></p>
  `;

  const canvas = document.getElementById("waveform");
  const ctx = canvas.getContext("2d");
  canvas.width = content.clientWidth - 60;
  canvas.height = 150;

  let audioContext, analyser, source, dataArray, animationId;
  let mediaRecorder, audioChunks = [], isRecording = false;

  function drawWave() {
    animationId = requestAnimationFrame(drawWave);
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = "#f9f9fc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#667eea";
    ctx.beginPath();

    let sliceWidth = canvas.width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      let v = dataArray[i] / 128.0;
      let y = v * canvas.height / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  document.getElementById("recordBtn").addEventListener("click", async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 2048;
      dataArray = new Uint8Array(analyser.fftSize);

      drawWave();

      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.start();

      isRecording = true;
      document.getElementById("voiceStatus").textContent = "🔴 Recording...";
      document.getElementById("pauseBtn").disabled = false;
      document.getElementById("saveBtn").disabled = false;
    } catch {
      alert("Microphone access denied!");
    }
  });

  document.getElementById("pauseBtn").addEventListener("click", () => {
    if (!isRecording) return;
    if (mediaRecorder.state === "recording") {
      mediaRecorder.pause();
      cancelAnimationFrame(animationId);
      document.getElementById("voiceStatus").textContent = "⏸ Paused";
    } else if (mediaRecorder.state === "paused") {
      mediaRecorder.resume();
      drawWave();
      document.getElementById("voiceStatus").textContent = "🔴 Recording...";
    }
  });

  document.getElementById("saveBtn").addEventListener("click", () => {
    if (!isRecording) return;
    mediaRecorder.stop();
    cancelAnimationFrame(animationId);
    document.getElementById("voiceStatus").textContent = "✅ Saved! Check downloads.";

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "voice-note.webm";
      a.click();
    };

    isRecording = false;
  });
}

// ----------------- NAVIGATION -----------------
navItems.forEach(item => {
  item.addEventListener("click", () => {
    navItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");

    const page = item.getAttribute("data-page");
    if (page === "dashboard") {
      renderCalendar();
    } else if (page === "journal") {
      const today = new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
      loadJournal(today);
    } else if (page === "voice") {
      loadVoiceNotes();
    } else if (page === "mood") {
      content.innerHTML = "<h1>🌱 Mood Garden</h1><p>Track your moods like a blooming garden.</p>";
    }
  });
});

// Search demo
document.getElementById("searchBar").addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  content.innerHTML = `<h1>🔍 Searching...</h1><p>You searched for: <b>${query}</b></p>`;
});

// Initial load = dashboard
renderCalendar();

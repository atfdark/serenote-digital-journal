// Handle sidebar navigation
const navItems = document.querySelectorAll(".sidebar nav ul li");
const content = document.getElementById("content");
 const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('overlay');


  // Toggle sidebar
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('show');
  });

  // Close when clicking overlay
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('show');
  });

  // Close when navigation item is clicked
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('show');
    });
  });

navItems.forEach(item => {
  item.addEventListener("click", () => {
    // remove active from all
    navItems.forEach(i => i.classList.remove("active"));
    // add active to current
    item.classList.add("active");

    // load content
    const page = item.getAttribute("data-page");
    if (page === "dashboard") {
      content.innerHTML = `
        <div class="dashboard-grid">
          <div class="dashboard-col-left">
            <div id="calendar-container">
              <!-- Calendar will be loaded here -->
            </div>
            <div id="recent-entries-container">
              <h2>Recent Entries</h2>
              <div class="recent-entry">
                <p class="entry-title">A day of small wins</p>
                <p class="entry-date">September 17, 2025</p>
              </div>
              <div class="recent-entry">
                <p class="entry-title">Thinking about the future</p>
                <p class="entry-date">September 15, 2025</p>
              </div>
              <div class="recent-entry">
                <p class="entry-title">A challenging morning</p>
                <p class="entry-date">September 14, 2025</p>
              </div>
            </div>
          </div>
          <div class="dashboard-col-right" id="dashboard-widgets">
            <h2>Mood Tracker</h2>
            <div class="widget-content">
                <p>No mood data available.</p>
            </div>
          </div>
        </div>
      `;
      loadCalendar(document.getElementById('calendar-container'));
    } else if (page === "journal") {
      const selectedDateStr = localStorage.getItem('selectedDate') || new Date().toISOString().split('T')[0];
      const selectedDate = new Date(selectedDateStr);
      // Add 1 day to the date to fix the timezone issue
      selectedDate.setDate(selectedDate.getDate() + 1);
      const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
      const formattedDate = selectedDate.toLocaleDateString("en-US", options);

      content.innerHTML = `
        <div class="journal-header">
          <h1>📖 Journal for ${formattedDate}</h1>
        </div>
        <div class="journal-container">
          <textarea id="journalEntry" placeholder="Dear Journal..."></textarea>
          <button id="saveJournal">💾 Save Entry</button>
          <p id="saveMsg" class="hidden">✅ Your journal entry has been saved!</p>
        </div>
      `;

      const entryKey = `journalEntry_${selectedDateStr}`;
      const savedEntry = localStorage.getItem(entryKey);
      if (savedEntry) {
        document.getElementById("journalEntry").value = savedEntry;
      }

      document.getElementById("saveJournal").addEventListener("click", () => {
        const entry = document.getElementById("journalEntry").value;
        localStorage.setItem(entryKey, entry);

        const msg = document.getElementById("saveMsg");
        msg.classList.remove("hidden");
        setTimeout(() => msg.classList.add("hidden"), 2000);
      });
    }
 else if (page === "voice") {
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

  // Draw waveform
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

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  // Start recording
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
    } catch (err) {
      alert("Microphone access denied!");
    }
  });

  // Pause recording
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

  // Save recording
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
 else if (page === "mood") {
      content.innerHTML = "<h1>🌱 Mood Garden</h1><p>Track your moods like a blooming garden.</p>";
    }
  });
});

// Search bar functionality (demo)
document.getElementById("searchBar").addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  content.innerHTML = `<h1>🔍 Searching...</h1><p>You searched for: <b>${query}</b></p>`;
});
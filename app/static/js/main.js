document.addEventListener('DOMContentLoaded', () => {
    // --- API Helper ---
    const api = {
        async get(endpoint) {
            const res = await fetch(endpoint);
            if (!res.ok) throw new Error(`Failed to fetch data`);
            return res.json();
        },
        async post(endpoint, body, isFormData = false) {
            const options = {
                method: 'POST',
                body: isFormData ? body : JSON.stringify(body),
            };
            if (!isFormData) {
                options.headers = { 'Content-Type': 'application/json' };
            }
            const res = await fetch(endpoint, options);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
                throw new Error(errorData.message);
            }
            return res.json();
        },
        async delete(endpoint) {
            const res = await fetch(endpoint, { method: 'DELETE' });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: "Failed to delete" }));
                throw new Error(errorData.message);
            }
            return res.json();
        }
    };

    // --- Setup ---
    const content = document.getElementById("content");
    const userId = localStorage.getItem("userId");
    if (!userId) {
        window.location.href = "/login";
        return;
    }

    let moodChartInstance = null;

    // --- Navigation ---
    const navItems = document.querySelectorAll(".sidebar nav ul li, .sidebar-bottom li");
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');

    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('show');
    };
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('show');
    });
    overlay.addEventListener('click', closeSidebar);

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            closeSidebar();
            const page = item.getAttribute("data-page");
            if (page === "logout") {
                localStorage.removeItem("userId");
                window.location.href = "/login";
            } else {
                loadPageContent(page);
            }
        });
    });

    // --- Page Loader ---
    function showLoader() {
        content.innerHTML = `<div class="loader"
            style="border:5px solid #f3f3f3; border-top:5px solid #667eea;
                   border-radius:50%; width:50px; height:50px;
                   animation:spin 1s linear infinite; margin:40px auto;"></div>`;
    }

    function loadPageContent(page) {
        if (page !== 'journal') localStorage.removeItem('selectedDate');
        showLoader();
        switch (page) {
            case "dashboard": loadDashboard(); break;
            case "journal": loadJournal(); break;
            case "voice": loadVoiceNotes(); break;
            case "mood": loadMoodGarden(); break;
            default: content.innerHTML = '<h1>Page not found</h1>';
        }
    }

    // ================= DASHBOARD =================
    async function loadDashboard() {
        content.innerHTML = `
        <div class="dashboard-grid">
            <div class="dashboard-col-left">
                <div id="calendar-container"></div>
                <div id="recent-entries-container">
                    <h2>Recent Entries</h2>
                    <div id="recent-entries-list"></div>
                </div>
            </div>
            <div class="dashboard-col-right" id="dashboard-widgets">
                <h2>Mood Tracker</h2>
                <div class="widget-content" id="mood-chart-container">
                    <canvas id="moodChart"></canvas>
                </div>
            </div>
        </div>`;

        loadCalendar(document.getElementById('calendar-container'));
        loadRecentEntries();
        renderMoodChart();
    }

    async function loadRecentEntries() {
        const listEl = document.getElementById('recent-entries-list');
        try {
            const entries = await api.get(`/entries/user/${userId}`);
            listEl.innerHTML = '';
            const textEntries = entries.filter(e => e.type === 'text');
            if (textEntries.length === 0) {
                listEl.innerHTML = '<p>No journal entries yet.</p>';
            } else {
                textEntries.slice(0, 3).forEach(entry => {
                    const entryEl = document.createElement('div');
                    entryEl.className = 'recent-entry';
                    entryEl.innerHTML = `
                        <p class="entry-title">${entry.title}</p>
                        <p class="entry-date">${new Date(entry.created_at).toLocaleDateString()}</p>`;
                    listEl.appendChild(entryEl);
                });
            }
        } catch {
            listEl.innerHTML = '<p style="color:red;">Could not load entries.</p>';
        }
    }

    async function renderMoodChart() {
        const chartContainer = document.getElementById('mood-chart-container');
        const canvas = document.getElementById('moodChart');
        if (!chartContainer || !canvas) return;

        try {
            const moodData = await api.get(`/dashboard/data/${userId}`);
            const moods = Object.keys(moodData);

            if (moods.length === 0) {
                chartContainer.innerHTML = `<p>No mood data yet. Add a mood to an entry!</p>`;
                return;
            }

            const data = Object.values(moodData);
            if (moodChartInstance) moodChartInstance.destroy();

            moodChartInstance = new Chart(canvas.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: moods,
                    datasets: [{
                        data,
                        backgroundColor: ['#FFC107', '#4CAF50', '#F44336', '#2196F3', '#9C27B0', '#00BCD4'],
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        } catch {
            chartContainer.innerHTML = `<p style="color:red;">Could not load mood chart.</p>`;
        }
    }

    // ================= JOURNAL =================
    function loadJournal() {
        const selectedDateStr = localStorage.getItem('selectedDate') || new Date().toLocaleDateString("en-CA");
        const todayStr = new Date().toLocaleDateString("en-CA");
        const formattedDate = new Date(selectedDateStr).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        content.innerHTML = `
        <div class="journal-header">
          <div class="date-box">${formattedDate}</div>
          <h2>📖 Journal</h2>
        </div>
        <div class="journal-container" id="journalContainer"><p>Loading entries...</p></div>`;

        fetch(`/entries/user/${userId}`)
            .then(res => res.json())
            .then(entries => {
                const container = document.getElementById("journalContainer");
                container.innerHTML = "";

                // --- Writing area only for today ---
                if (selectedDateStr === todayStr) {
                    const writeBox = document.createElement("div");
                    writeBox.innerHTML = `
                        <input id="journalTitle" placeholder="Entry title..." 
                               style="margin-bottom:10px; padding:10px; border-radius:6px; border:1px solid #ccc; width:100%;" />
                        <textarea id="journalEntry" placeholder="Dear Journal..."></textarea>
                        <div class="mood-selector-container">
                            <label for="moodSelect">How are you feeling today?</label>
                            <select id="moodSelect">
                              <option value="Happy">😊 Happy</option>
                              <option value="Sad">😔 Sad</option>
                              <option value="Excited">🤩 Excited</option>
                              <option value="Calm">😌 Calm</option>
                              <option value="Angry">😡 Angry</option>
                              <option value="Neutral" selected>😐 Neutral</option>
                            </select>
                        </div>
                        <button id="saveJournal">💾 Save Entry</button>
                        <p id="saveMsg" class="hidden">✅ Saved!</p>
                        <hr>`;
                    container.appendChild(writeBox);

                    document.getElementById("saveJournal").addEventListener("click", () => {
                        const title = document.getElementById("journalTitle").value || "Untitled";
                        const contentText = document.getElementById("journalEntry").value;
                        const mood = document.getElementById("moodSelect").value;

                        if (!contentText.trim()) return alert("Please write something!");

                        const payload = {
                            user_id: userId,
                            title,
                            content: contentText,
                            mood
                        };
                        api.post("/entries/add", payload)
                            .then(() => {
                                const msg = document.getElementById("saveMsg");
                                msg.classList.remove("hidden");
                                setTimeout(() => {
                                    msg.classList.add("hidden");
                                    loadJournal(); // Reload to see new entry
                                }, 2000);
                            })
                            .catch(() => alert("Failed to save entry."));
                    });
                } else {
                    const notice = document.createElement("p");
                    notice.style.color = "gray";
                    notice.innerText = "🔒 You can only write/edit today. Past entries are view-only.";
                    container.appendChild(notice);
                    container.appendChild(document.createElement("hr"));
                }

               // --- Show entries of selected day ---
const filtered = entries.filter(e => {
    const entryDate = new Date(e.created_at).toLocaleDateString("en-CA");
    return entryDate === selectedDateStr;
});

if (filtered.length === 0) {
    const noData = document.createElement("p");
    noData.innerText = "No entries for this day.";
    container.appendChild(noData);
} else {
    filtered.forEach(entry => {
        const div = document.createElement("div");
        div.classList.add("journal-entry");
        div.dataset.entryId = entry.id;

        const entryDateStr = new Date(entry.created_at).toLocaleDateString("en-CA");
        const isToday = entryDateStr === todayStr;

        let actionsHTML = "";
        if (isToday) {
            actionsHTML = `<div class="entry-actions">
                              <button class="btn-delete-entry" data-entry-id="${entry.id}">🗑️ Delete</button>
                           </div>`;
        }

        if (entry.type === "text") {
            div.innerHTML = `
              <div class="entry-header">
                <h3>${entry.title}</h3>
                <time>${new Date(entry.created_at).toLocaleTimeString()}</time>
              </div>
              <p>${entry.content}</p>
              <div class="entry-footer">
                <span class="mood-tag">${entry.mood || "Neutral"}</span>
                ${actionsHTML}
              </div>`;
        } else if (entry.type === "voice") {
            div.innerHTML = `
              <div class="entry-header">
                <h3>${entry.title}</h3>
                <time>${new Date(entry.created_at).toLocaleTimeString()}</time>
              </div>
              <audio controls style="width:100%;">
                <source src="/${entry.audio_path}" type="audio/webm">
              </audio>
              <div class="entry-footer">
                <span class="mood-tag">${entry.mood || "Neutral"}</span>
                ${actionsHTML}
              </div>`;
        }
        container.appendChild(div);
    });
}

                // --- Add event listener for all delete buttons ---
                container.addEventListener('click', async (e) => {
                    if (e.target && e.target.matches('.btn-delete-entry')) {
                        const button = e.target;
                        const entryId = button.dataset.entryId;

                        if (confirm('Are you sure you want to delete this entry?')) {
                            try {
                                button.disabled = true;
                                button.textContent = "Deleting...";
                                await api.delete(`/entries/delete/${entryId}`);
                                const entryElement = document.querySelector(`.journal-entry[data-entry-id='${entryId}']`);
                                if (entryElement) {
                                    entryElement.style.opacity = '0';
                                    setTimeout(() => entryElement.remove(), 300);
                                }
                            } catch (err) {
                                alert('Could not delete the entry.');
                                button.disabled = false;
                                button.textContent = "🗑️ Delete";
                            }
                        }
                    }
                });

            })
            .catch(() => {
                document.getElementById("journalContainer").innerHTML = "<p>Error loading entries.</p>";
            });
    }

    // ================= VOICE NOTES =================
    function loadVoiceNotes() {
        content.innerHTML = `
      <h1>🎙 Voice Notes</h1>
      <p class="voice-msg">🎤 Record your thoughts, save them forever, or send them to the future.</p>
      <canvas id="waveform" height="150"></canvas>
      <div class="voice-controls">
        <button id="recordBtn">Record</button>
        <button id="pauseBtn" disabled>Pause</button>
        <button id="saveBtn" disabled>Save</button>
        <button id="deleteBtn" disabled>Delete</button>
        <button id="timeCapsuleBtn" disabled>Time Capsule</button>
      </div>
      <p id="voiceStatus"></p>
      <div id="savedRecordings">
        <h2>📂 Saved Recordings</h2>
        <div id="recordingsList"></div>
      </div>
      <div id="timeCapsuleModal" class="modal">
        <div class="modal-content">
          <h2>⏳ Set Time Capsule Unlock</h2>
          <input type="datetime-local" id="capsuleDateTime" />
          <div class="modal-buttons">
            <button id="saveCapsuleBtn">Save Capsule</button>
            <button id="cancelCapsuleBtn">Cancel</button>
          </div>
        </div>
      </div>
    `;

        const canvas = document.getElementById("waveform");
        const ctx = canvas.getContext("2d");
        canvas.width = canvas.offsetWidth;

        let audioContext, analyser, source, dataArray, animationId;
        let mediaRecorder, audioChunks = [], isRecording = false, lastBlob = null;
        
        const recordBtn = document.getElementById("recordBtn");
        const pauseBtn = document.getElementById("pauseBtn");
        const saveBtn = document.getElementById("saveBtn");
        const deleteBtn = document.getElementById("deleteBtn");
        const timeCapsuleBtn = document.getElementById("timeCapsuleBtn");
        const voiceStatus = document.getElementById("voiceStatus");

        function drawWave() {
            animationId = requestAnimationFrame(drawWave);
            analyser.getByteTimeDomainData(dataArray);
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#667eea";
            ctx.beginPath();
            const sliceWidth = canvas.width / dataArray.length;
            let x = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;
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

        function resetVoiceRecorder() {
            if (animationId) cancelAnimationFrame(animationId);
            if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
            if (audioContext) audioContext.close();

            isRecording = false;
            audioChunks = [];
            lastBlob = null;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            voiceStatus.textContent = "";
            recordBtn.textContent = "Record";
            pauseBtn.textContent = "Pause";
            
            [pauseBtn, saveBtn, deleteBtn, timeCapsuleBtn].forEach(btn => btn.disabled = true);
        }

        recordBtn.addEventListener("click", async () => {
            if (isRecording) {
                mediaRecorder.stop();
            } else {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    analyser = audioContext.createAnalyser();
                    source = audioContext.createMediaStreamSource(stream);
                    source.connect(analyser);
                    analyser.fftSize = 2048;
                    dataArray = new Uint8Array(analyser.fftSize);
                    
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];
                    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                    
                    mediaRecorder.onstart = () => {
                        isRecording = true;
                        voiceStatus.textContent = "🔴 Recording...";
                        recordBtn.textContent = "Stop";
                        pauseBtn.disabled = false;
                        [saveBtn, deleteBtn, timeCapsuleBtn].forEach(btn => btn.disabled = true);
                        drawWave();
                    };

                    mediaRecorder.onstop = () => {
                        isRecording = false;
                        lastBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        voiceStatus.textContent = "🛑 Recording stopped. Ready to save.";
                        recordBtn.textContent = "Record";
                        [saveBtn, deleteBtn, timeCapsuleBtn].forEach(btn => btn.disabled = false);
                        pauseBtn.disabled = true;
                        cancelAnimationFrame(animationId);
                    };

                    mediaRecorder.start();

                } catch (err) {
                    alert("Microphone access denied!");
                }
            }
        });

        pauseBtn.addEventListener("click", () => {
            if (!mediaRecorder) return;
            if (mediaRecorder.state === "recording") {
                mediaRecorder.pause();
                voiceStatus.textContent = "⏸ Paused";
                pauseBtn.textContent = "Resume";
                cancelAnimationFrame(animationId);
            } else if (mediaRecorder.state === "paused") {
                mediaRecorder.resume();
                voiceStatus.textContent = "🔴 Recording...";
                pauseBtn.textContent = "Pause";
                drawWave();
            }
        });

        saveBtn.addEventListener("click", () => {
            if (!lastBlob) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                const saved = JSON.parse(localStorage.getItem("voiceNotes") || "[]");
                saved.push({
                    time: new Date().toLocaleString(),
                    base64: reader.result
                });
                localStorage.setItem("voiceNotes", JSON.stringify(saved));
                renderRecordings();
                voiceStatus.textContent = "✅ Saved!";
                resetVoiceRecorder();
            };
            reader.readAsDataURL(lastBlob);
        });

        deleteBtn.addEventListener("click", () => {
            resetVoiceRecorder();
            voiceStatus.textContent = "🗑️ Recording deleted.";
        });
        
        // --- Time Capsule Logic ---
        const modal = document.getElementById("timeCapsuleModal");
        const saveCapsuleBtn = document.getElementById("saveCapsuleBtn");
        const cancelCapsuleBtn = document.getElementById("cancelCapsuleBtn");

        timeCapsuleBtn.addEventListener("click", () => {
            if (!lastBlob) return alert("You must record something first!");
            modal.classList.add("show");
        });

        cancelCapsuleBtn.addEventListener("click", () => modal.classList.remove("show"));

        saveCapsuleBtn.addEventListener("click", () => {
            const dtInput = document.getElementById("capsuleDateTime").value;
            if (!dtInput || !lastBlob) return alert("Please set a date and record something!");
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const saved = JSON.parse(localStorage.getItem("voiceNotes") || "[]");
                saved.push({
                    time: new Date().toLocaleString(),
                    base64: reader.result,
                    unlockTime: dtInput,
                });
                localStorage.setItem("voiceNotes", JSON.stringify(saved));
                renderRecordings();
                modal.classList.remove("show");
                voiceStatus.textContent = `🔒 Time Capsule will unlock at ${new Date(dtInput).toLocaleString()}`;
                resetVoiceRecorder();
            };
            reader.readAsDataURL(lastBlob);
        });
        
        function deleteRecording(index) {
            const saved = JSON.parse(localStorage.getItem("voiceNotes") || "[]");
            saved.splice(index, 1);
            localStorage.setItem("voiceNotes", JSON.stringify(saved));
            renderRecordings();
        }

        // --- ADDED: This function was missing ---
        function renderRecordings() {
            const list = document.getElementById("recordingsList");
            list.innerHTML = "";
            const saved = JSON.parse(localStorage.getItem("voiceNotes") || "[]");
            const now = new Date();

            if (saved.length === 0) {
                list.innerHTML = "<p>No recordings yet.</p>";
                return;
            }

            const sortedSaved = saved.slice().reverse();

            sortedSaved.forEach((note, index) => {
                const originalIndex = saved.length - 1 - index;
                const wrapper = document.createElement("div");
                wrapper.classList.add("recording-item");

                const time = document.createElement("p");
                time.classList.add("recording-time");

                const audio = document.createElement("audio");
                audio.controls = true;

                const delBtn = document.createElement("button");
                delBtn.classList.add("delete-note");
                delBtn.textContent = "🗑 Delete";
                delBtn.onclick = () => deleteRecording(originalIndex);

                if (note.unlockTime) {
                    const unlockDate = new Date(note.unlockTime);
                    if (now < unlockDate) {
                        time.innerHTML = `🔒 Locked until ${unlockDate.toLocaleString()}`;
                        wrapper.classList.add('locked-note');
                    } else {
                        audio.src = note.base64;
                        time.textContent = `✨ Unlocked! (Recorded: ${note.time})`;
                        wrapper.appendChild(audio);
                    }
                } else {
                    audio.src = note.base64;
                    time.textContent = note.time;
                    wrapper.appendChild(audio);
                }
                
                wrapper.prepend(time);
                wrapper.appendChild(delBtn);
                list.appendChild(wrapper);
            });
        }
        
        // Auto-refresh Time Capsules
        setInterval(renderRecordings, 5000); // Check every 5 seconds
        renderRecordings(); // Initial render
    }


    // ================= MOOD GARDEN =================
    async function loadMoodGarden() {
        content.innerHTML = `
            <div class="mood-garden-container">
                <h1>🌱 Your Mood Garden</h1>
                <p>Each flower represents a mood you've logged. The bigger the flower, the more often you've felt that way. Hover to see the count!</p>
                <div class="garden" id="garden"></div>
            </div>`;

        const garden = document.getElementById('garden');
        try {
            const moodData = await api.get(`/dashboard/data/${userId}`);
            const moods = Object.keys(moodData);

            if (moods.length === 0) {
                garden.innerHTML = `<p class="garden-empty">Your garden is empty. Start adding journal entries with moods to grow your first flower!</p>`;
                return;
            }

            const moodAssets = {
                'Happy': { flower: '🌻', color: '#FFC107' },
                'Sad': { flower: '💧', color: '#2196F3' },
                'Excited': { flower: '🌸', color: '#E91E63' },
                'Calm': { flower: '🌿', color: '#4CAF50' },
                'Angry': { flower: '🔥', color: '#F44336' },
                'Neutral': { flower: '⚪', color: '#9E9E9E' }
            };

            const totalMoods = Object.values(moodData).reduce((sum, count) => sum + count, 0);

            for (const mood in moodData) {
                const count = moodData[mood];
                const size = 50 + (count / totalMoods) * 150; // Calculate size
                const flowerInfo = moodAssets[mood] || { flower: '❓', color: '#ccc' };

                const flowerDiv = document.createElement('div');
                flowerDiv.className = 'flower';
                flowerDiv.style.fontSize = `${size}px`;
                flowerDiv.style.left = `${Math.random() * 85}%`; // Random horizontal position
                flowerDiv.style.bottom = `${-20 + Math.random() * 20}px`; // Start from bottom
                flowerDiv.style.animationDelay = `${Math.random() * 2}s`; // Stagger animation
                
                flowerDiv.innerHTML = `
                    <div class="flower-emoji">${flowerInfo.flower}</div>
                    <div class="mood-tooltip">${mood}: ${count}</div>
                `;

                garden.appendChild(flowerDiv);
            }

        } catch (err) {
            garden.innerHTML = `<p style="color:red;">Could not load your mood garden.</p>`;
        }
    }

    // ================= CALENDAR =================
    function loadCalendar(container) {
        if (!container) return;
        container.innerHTML = `
        <div class="calendar-wrapper">
          <div class="calendar-header">
            <button id="prev">&#10094;</button>
            <h2 id="monthYear"></h2>
            <button id="next">&#10095;</button>
          </div>
          <div class="calendar-grid" id="calendarGrid">
            <div class="day-name">Sun</div><div class="day-name">Mon</div><div class="day-name">Tue</div>
            <div class="day-name">Wed</div><div class="day-name">Thu</div><div class="day-name">Fri</div>
            <div class="day-name">Sat</div>
          </div>
        </div>`;
        const monthYear = document.getElementById("monthYear");
        const grid = document.getElementById("calendarGrid");
        const prev = document.getElementById("prev");
        const next = document.getElementById("next");
        let currentDate = new Date();

        function renderCalendar() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            monthYear.textContent = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            grid.innerHTML = `
              <div class="day-name">Sun</div><div class="day-name">Mon</div><div class="day-name">Tue</div>
              <div class="day-name">Wed</div><div class="day-name">Thu</div><div class="day-name">Fri</div>
              <div class="day-name">Sat</div>`;
            const firstDay = new Date(year, month, 1).getDay();
            const lastDate = new Date(year, month + 1, 0).getDate();
            for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement("div"));
            for (let d = 1; d <= lastDate; d++) {
                const dateEl = document.createElement("div");
                dateEl.classList.add("date");
                dateEl.textContent = d;
                const date = new Date(year, month, d);
                dateEl.dataset.date = date.toLocaleDateString("en-CA");
                let today = new Date();
                if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    dateEl.classList.add("today");
                }
                dateEl.addEventListener('click', (e) => {
                    localStorage.setItem('selectedDate', e.target.dataset.date);
                    document.querySelector('[data-page="journal"]').click();
                });
                grid.appendChild(dateEl);
            }
        }
        prev.addEventListener("click", () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
        next.addEventListener("click", () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
        renderCalendar();
    }

    // --- Default Page ---
    // This script is in the HTML, which will click the mood garden tab on load.
    // document.querySelector('[data-page="mood"]').click();
});
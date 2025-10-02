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

    // Dark Mode
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    }

    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        darkModeToggle.textContent = isDark ? '☀️' : '🌙';
    });


    // --- Navigation ---
    const navItems = document.querySelectorAll(".sidebar nav ul li, .sidebar-bottom li");
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');

    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('show');
        body.classList.remove('sidebar-active');
    };
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('show');
        body.classList.toggle('sidebar-active');
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
                <div id="insights-container" style="margin-top: 20px;">
                    <h2>Your Insights</h2>
                    <div id="insights-list"></div>
                </div>
            </div>
        </div>`;

        loadCalendar(document.getElementById('calendar-container'));
        loadRecentEntries();
        renderMoodChart();
        loadInsights();
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
                chartContainer.innerHTML = `<div class="empty-chart">
                    <div style="font-size: 3em; margin-bottom: 15px;">📊</div>
                    <p>No mood data yet. Add a mood to an entry!</p>
                    <p style="font-size: 0.9em; color: #666;">Start journaling to see your mood patterns</p>
                </div>`;
                return;
            }

            const data = Object.values(moodData);
            if (moodChartInstance) moodChartInstance.destroy();

            // Add animated counters
            const totalEntries = data.reduce((sum, count) => sum + count, 0);
            const counterEl = document.createElement('div');
            counterEl.id = 'moodCounter';
            counterEl.style.cssText = `
                text-align: center;
                margin-bottom: 15px;
                font-size: 1.2em;
                font-weight: bold;
                color: #333;
            `;
            chartContainer.insertBefore(counterEl, canvas);

            animateCounter(counterEl, 0, totalEntries, 1500);

            moodChartInstance = new Chart(canvas.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: moods,
                    datasets: [{
                        data,
                        backgroundColor: [
                            '#FFC107',
                            '#4CAF50',
                            '#F44336',
                            '#2196F3',
                            '#9C27B0',
                            '#00BCD4'
                        ],
                        borderColor: '#fff',
                        borderWidth: 3,
                        hoverBorderWidth: 5,
                        hoverBorderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                font: { size: 12, weight: 'bold' }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const percentage = ((value / totalEntries) * 100).toFixed(1);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true,
                        duration: 2000,
                        easing: 'easeOutBounce'
                    }
                }
            });

            // Add click interaction to chart segments
            canvas.addEventListener('click', (event) => {
                const activeElements = moodChartInstance.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                if (activeElements.length > 0) {
                    const index = activeElements[0].index;
                    const mood = moods[index];
                    const count = data[index];
                    showMoodDetail(mood, count);
                }
            });

            // Handle window resize for responsive chart
            window.addEventListener('resize', () => {
                if (moodChartInstance) {
                    moodChartInstance.resize();
                }
            });

        } catch {
            chartContainer.innerHTML = `<p style="color:red;">Could not load mood chart.</p>`;
        }
    }

    function animateCounter(element, start, end, duration) {
        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (end - start) * progress);
            element.textContent = `📊 Total Mood Entries: ${current}`;
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    function showMoodDetail(mood, count) {
        const modal = document.createElement('div');
        modal.className = 'modal mood-detail-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 350px; text-align: center;">
                <h2 style="color: #333;">${mood} Insights</h2>
                <div style="font-size: 3em; margin: 20px 0;">${getMoodEmoji(mood)}</div>
                <p><strong>Times felt:</strong> ${count}</p>
                <p style="font-style: italic; color: #666;">${getMoodDescription(mood)}</p>
                <button id="closeMoodDetail" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 15px;">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.add('show');

        document.getElementById('closeMoodDetail').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
    }

    function getMoodEmoji(mood) {
        const emojis = {
            'Happy': '😊', 'Sad': '😢', 'Excited': '🤩', 'Calm': '😌',
            'Angry': '😠', 'Neutral': '😐'
        };
        return emojis[mood] || '😐';
    }

    function getMoodDescription(mood) {
        const descriptions = {
            'Happy': 'Joyful moments that brighten your day!',
            'Sad': 'Times of reflection and healing',
            'Excited': 'Moments of enthusiasm and energy',
            'Calm': 'Peaceful and centered feelings',
            'Angry': 'Intense emotions that need expression',
            'Neutral': 'Balanced and steady states'
        };
        return descriptions[mood] || 'A unique emotional experience';
    }

    async function loadInsights() {
        const insightsEl = document.getElementById('insights-list');
        try {
            const insights = await api.get(`/dashboard/insights/${userId}`);

            // Animate insights appearance
            insightsEl.innerHTML = '';
            insights.insights.forEach((insight, index) => {
                setTimeout(() => {
                    const insightEl = document.createElement('p');
                    insightEl.textContent = insight;
                    insightEl.style.opacity = '0';
                    insightEl.style.transform = 'translateY(20px)';
                    insightsEl.appendChild(insightEl);

                    // Animate in
                    setTimeout(() => {
                        insightEl.style.transition = 'all 0.5s ease';
                        insightEl.style.opacity = '1';
                        insightEl.style.transform = 'translateY(0)';
                    }, 100);
                }, index * 200);
            });

            // Add streak progress bar
            if (insights.current_streak > 0) {
                setTimeout(() => {
                    const progressContainer = document.createElement('div');
                    progressContainer.innerHTML = `
                        <div style="margin-top: 15px; text-align: center;">
                            <p style="margin-bottom: 10px; font-weight: bold;">📈 Streak Progress</p>
                            <div style="background: rgba(255,255,255,0.2); border-radius: 10px; height: 8px; overflow: hidden;">
                                <div class="streak-progress-bar" style="height: 100%; background: linear-gradient(90deg, #FFC107, #FF8F00); width: 0%; border-radius: 10px; transition: width 2s ease;"></div>
                            </div>
                            <p style="margin-top: 5px; font-size: 0.9em;">${insights.current_streak} days • Next: ${insights.current_streak + 1} days</p>
                        </div>
                    `;
                    insightsEl.appendChild(progressContainer);

                    // Animate progress bar
                    setTimeout(() => {
                        const progress = Math.min((insights.current_streak / 7) * 100, 100); // 7-day goal
                        const progressBar = progressContainer.querySelector('.streak-progress-bar');
                        if (progressBar) {
                            progressBar.style.width = `${progress}%`;
                        }
                    }, 500);
                }, insights.insights.length * 200 + 500);
            }

        } catch {
            insightsEl.innerHTML = '<p>Could not load insights.</p>';
        }
    }

    // ================= JOURNAL =================
    async function loadJournalStats() {
        const statsEl = document.getElementById('journalStats');
        try {
            const entries = await api.get(`/entries/user/${userId}`);
            const todayStr = new Date().toLocaleDateString("en-CA");
            const todayEntries = entries.filter(e => new Date(e.created_at).toLocaleDateString("en-CA") === todayStr);
            const totalEntries = entries.length;
            const todayCount = todayEntries.length;

            statsEl.innerHTML = `
                <div class="journal-stats-card">
                    <div class="stat-item">
                        <span class="stat-number">${totalEntries}</span>
                        <span class="stat-label">Total Entries</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${todayCount}</span>
                        <span class="stat-label">Today</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${entries.filter(e => e.type === 'text').length}</span>
                        <span class="stat-label">Journal Entries</span>
                    </div>
                </div>
            `;
        } catch {
            statsEl.innerHTML = '<p>Could not load stats.</p>';
        }
    }

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
          <div class="journal-stats" id="journalStats"></div>
        </div>
        <div class="journal-container" id="journalContainer"><p>Loading entries...</p></div>`;

        // Load journal stats
        loadJournalStats();

        fetch(`/entries/user/${userId}`)
            .then(res => res.json())
            .then(entries => {
                const container = document.getElementById("journalContainer");
                container.innerHTML = "";

                // --- Writing area only for today ---
                if (selectedDateStr === todayStr) {
                    const writeBox = document.createElement("div");
                    writeBox.className = "journal-writing-area";
                    writeBox.innerHTML = `
                        <div class="writing-header">
                            <h3>✍️ Write Your Thoughts</h3>
                            <div class="writing-prompt" id="writingPrompt">What's on your mind today?</div>
                        </div>
                        <input id="journalTitle" placeholder="Give your entry a title..." />
                        <textarea id="journalEntry" placeholder="Start writing your journal entry here..."></textarea>
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
                        <div class="capsule-container">
                            <label>
                                <input type="checkbox" id="isCapsule" /> 📦 Make this a Time Capsule
                            </label>
                            <input type="datetime-local" id="capsuleDate" style="display:none; margin-top:10px;" />
                        </div>
                        <div class="save-actions">
                            <button id="saveJournal" class="save-btn">💾 Save Entry</button>
                            <button id="previewJournal" class="preview-btn">👁️ Preview</button>
                        </div>
                        <p id="saveMsg" class="hidden">✅ Saved!</p>
                        <hr>`;
                    container.appendChild(writeBox);

                    // Add preview functionality
                    document.getElementById("previewJournal").addEventListener("click", () => {
                        const title = document.getElementById("journalTitle").value;
                        const content = document.getElementById("journalEntry").value;
                        const mood = document.getElementById("moodSelect").value;
                        if (!content.trim()) return alert("Please write something to preview!");
                        showJournalPreview(title, content, mood);
                    });

                    // Capsule checkbox logic
                    document.getElementById("isCapsule").addEventListener("change", (e) => {
                        document.getElementById("capsuleDate").style.display = e.target.checked ? "block" : "none";
                    });

                    document.getElementById("saveJournal").addEventListener("click", () => {
                        const title = document.getElementById("journalTitle").value || "Untitled";
                        const contentText = document.getElementById("journalEntry").value;
                        const mood = document.getElementById("moodSelect").value;
                        const isCapsule = document.getElementById("isCapsule").checked;
                        const capsuleDate = document.getElementById("capsuleDate").value;

                        if (!contentText.trim()) return alert("Please write something!");
                        if (isCapsule && !capsuleDate) return alert("Please set a capsule open date!");

                        const payload = {
                            user_id: userId,
                            title,
                            content: contentText,
                            mood,
                            is_capsule: isCapsule,
                            capsule_open_date: isCapsule ? capsuleDate : null
                        };
                        api.post("/entries/add", payload)
                            .then(async () => {
                                const msg = document.getElementById("saveMsg");
                                msg.classList.remove("hidden");

                                // Update the mood garden with the new entry
                                try {
                                    await api.post("/garden/", {
                                        user_id: userId,
                                        mood: mood,
                                        intensity: 1.0
                                    });

                                    // If mood garden is currently open, refresh it to show new flower
                                    if (moodGardenInstance) {
                                        await moodGardenInstance.loadGarden();
                                        showNotification('🌸 New flower bloomed in your garden!', 'success');
                                    }
                                } catch (gardenErr) {
                                    console.error("Garden update failed:", gardenErr);
                                }

                                // Generate AI messages based on content analysis
                                try {
                                    const aiResponse = await api.post("/entries/generate-prompts", { content: contentText, mood });
                                    showEmotionBasedMessages(aiResponse.messages, aiResponse.detected_emotion, aiResponse.is_low_mood);
                                } catch (err) {
                                    console.error("AI analysis failed:", err);
                                }

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
        const now = new Date();
        const isLocked = entry.is_capsule && entry.capsule_open_date && new Date(entry.capsule_open_date) > now;

        let actionsHTML = "";
        if (isToday && !isLocked) {
            actionsHTML = `<div class="entry-actions">
                              <button class="btn-delete-entry" data-entry-id="${entry.id}">🗑️ Delete</button>
                           </div>`;
        }

        if (entry.type === "text") {
            if (isLocked) {
                div.innerHTML = `
                  <div class="entry-header">
                    <h3>🔒 Time Capsule</h3>
                    <time>Opens on ${new Date(entry.capsule_open_date).toLocaleString()}</time>
                  </div>
                  <p style="color: gray;">This capsule is locked until the specified date.</p>
                  <div class="entry-footer">
                    <span class="mood-tag">${entry.mood || "Neutral"}</span>
                  </div>`;
            } else {
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
            }
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
    let voiceInterval;

    function loadVoiceNotes() {
        if (voiceInterval) clearInterval(voiceInterval);
        content.innerHTML = `
      <div class="voice-header">
        <h1>🎙 Voice Notes</h1>
        <p class="voice-msg">🎤 Record your thoughts, save them forever, or send them to the future.</p>
        <div class="voice-stats" id="voiceStats"></div>
      </div>
      <div class="voice-recorder-section">
        <div class="waveform-container">
          <canvas id="waveform" height="150"></canvas>
          <div class="recording-timer" id="recordingTimer">00:00</div>
        </div>
        <div class="voice-controls">
          <button id="recordBtn" class="record-btn">🔴 Record</button>
          <button id="pauseBtn" disabled class="pause-btn">⏸️ Pause</button>
          <button id="saveBtn" disabled class="save-btn">💾 Save</button>
          <button id="deleteBtn" disabled class="delete-btn">🗑️ Delete</button>
          <button id="timeCapsuleBtn" disabled class="capsule-btn">📦 Time Capsule</button>
        </div>
        <p id="voiceStatus" class="status-message"></p>
        <div class="progress-bar" id="progressBar" style="display:none;">
          <div class="progress-fill" id="progressFill"></div>
        </div>
      </div>
      <div id="savedRecordings" class="recordings-section">
        <h2>📂 Your Voice Notes</h2>
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

        // Load voice stats
        loadVoiceStats();

        // Load voice stats
        async function loadVoiceStats() {
            const statsEl = document.getElementById('voiceStats');
            try {
                const entries = await api.get(`/entries/user/${userId}`);
                const voiceEntries = entries.filter(e => e.type === 'voice');
                const totalVoice = voiceEntries.length;
                const capsules = voiceEntries.filter(e => e.is_capsule).length;

                statsEl.innerHTML = `
                    <div class="voice-stats-card">
                        <div class="stat-item">
                            <span class="stat-number">${totalVoice}</span>
                            <span class="stat-label">Voice Notes</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${capsules}</span>
                            <span class="stat-label">Time Capsules</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${Math.round(voiceEntries.reduce((sum, e) => sum + (new Date(e.created_at) - new Date()) / (1000 * 60 * 60 * 24), 0))}</span>
                            <span class="stat-label">Days Recorded</span>
                        </div>
                    </div>
                `;
            } catch {
                statsEl.innerHTML = '<p>Could not load stats.</p>';
            }
        }

        // Recording timer
        let recordingStartTime = null;
        let timerInterval = null;

        function startTimer() {
            recordingStartTime = Date.now();
            timerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
                const seconds = (elapsed % 60).toString().padStart(2, '0');
                document.getElementById('recordingTimer').textContent = `${minutes}:${seconds}`;
            }, 1000);
        }

        function stopTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            document.getElementById('recordingTimer').textContent = '00:00';
        }

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

            stopTimer();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            voiceStatus.textContent = "";
            recordBtn.textContent = "🔴 Record";
            pauseBtn.textContent = "⏸️ Pause";

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
                        recordBtn.textContent = "⏹️ Stop";
                        pauseBtn.disabled = false;
                        [saveBtn, deleteBtn, timeCapsuleBtn].forEach(btn => btn.disabled = true);
                        startTimer();
                        drawWave();
                    };

                    mediaRecorder.onstop = () => {
                        isRecording = false;
                        lastBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        voiceStatus.textContent = "🛑 Recording stopped. Ready to save.";
                        recordBtn.textContent = "🔴 Record";
                        [saveBtn, deleteBtn, timeCapsuleBtn].forEach(btn => btn.disabled = false);
                        pauseBtn.disabled = true;
                        stopTimer();
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

        saveBtn.addEventListener("click", async () => {
            if (!lastBlob) return;
            const formData = new FormData();
            formData.append('audio', lastBlob, 'voice.webm');
            formData.append('user_id', userId);
            formData.append('title', 'Voice Note');
            formData.append('mood', 'Neutral'); // or prompt for mood

            try {
                await api.post('/entries/voice', formData, true);

                // Update the mood garden with the voice note
                try {
                    await api.post("/garden/", {
                        user_id: userId,
                        mood: 'Neutral',
                        intensity: 0.8  // Slightly less intense than text entries
                    });

                    // If mood garden is currently open, refresh it to show new flower
                    if (moodGardenInstance) {
                        await moodGardenInstance.loadGarden();
                        showNotification('🌼 New flower grew in your garden!', 'success');
                    }
                } catch (gardenErr) {
                    console.error("Garden update failed:", gardenErr);
                }

                voiceStatus.textContent = "✅ Saved to server!";
                resetVoiceRecorder();
            } catch (err) {
                voiceStatus.textContent = "❌ Failed to save.";
            }
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

        saveCapsuleBtn.addEventListener("click", async () => {
            const dtInput = document.getElementById("capsuleDateTime").value;
            if (!dtInput || !lastBlob) return alert("Please set a date and record something!");

            const formData = new FormData();
            formData.append('audio', lastBlob, 'voice.webm');
            formData.append('user_id', userId);
            formData.append('title', 'Voice Capsule');
            formData.append('mood', 'Neutral');
            formData.append('is_capsule', 'true');
            formData.append('capsule_open_date', dtInput);

            try {
                await api.post('/entries/voice', formData, true);
                renderRecordings();
                modal.classList.remove("show");
                voiceStatus.textContent = `🔒 Time Capsule will unlock at ${new Date(dtInput).toLocaleString()}`;
                resetVoiceRecorder();
            } catch (err) {
                voiceStatus.textContent = "❌ Failed to save capsule.";
            }
        });
        
        function deleteRecording(index) {
            const saved = JSON.parse(localStorage.getItem("voiceNotes") || "[]");
            saved.splice(index, 1);
            localStorage.setItem("voiceNotes", JSON.stringify(saved));
            renderRecordings();
        }

        // --- Render recordings from server ---
        async function renderRecordings() {
            const list = document.getElementById("recordingsList");
            if (!list) return;
            list.innerHTML = "";
            try {
                const entries = await api.get(`/entries/user/${userId}`);
                const voiceEntries = entries.filter(e => e.type === 'voice');
                const now = new Date();

                if (voiceEntries.length === 0) {
                    list.innerHTML = "<p>No recordings yet.</p>";
                    return;
                }

                voiceEntries.forEach(entry => {
                    const wrapper = document.createElement("div");
                    wrapper.classList.add("recording-item");

                    const time = document.createElement("p");
                    time.classList.add("recording-time");

                    const audio = document.createElement("audio");
                    audio.controls = true;

                    const delBtn = document.createElement("button");
                    delBtn.classList.add("delete-note");
                    delBtn.textContent = "🗑 Delete";
                    delBtn.onclick = () => deleteRecording(entry.id);

                    if (entry.is_capsule && entry.capsule_open_date && new Date(entry.capsule_open_date) > now) {
                        time.innerHTML = `🔒 Locked until ${new Date(entry.capsule_open_date).toLocaleString()}`;
                        wrapper.classList.add('locked-note');
                    } else {
                        audio.src = `/${entry.audio_path}`;
                        time.textContent = new Date(entry.created_at).toLocaleString();
                        wrapper.appendChild(audio);
                    }

                    wrapper.prepend(time);
                    wrapper.appendChild(delBtn);
                    list.appendChild(wrapper);
                });
            } catch (err) {
                list.innerHTML = "<p>Error loading recordings.</p>";
            }
        }

        async function deleteRecording(entryId) {
            if (confirm('Delete this recording?')) {
                try {
                    await api.delete(`/entries/delete/${entryId}`);
                    renderRecordings();
                } catch (err) {
                    alert('Failed to delete.');
                }
            }
        }
        
        // Auto-refresh Time Capsules
        voiceInterval = setInterval(renderRecordings, 5000); // Check every 5 seconds
        renderRecordings(); // Initial render
    }


    // ================= MOOD GARDEN =================
    let moodGardenInstance = null;

    async function loadMoodGarden() {
        content.innerHTML = `
            <div class="mood-garden-container">
                <div class="garden-header">
                    <h1>🌱 Your Mood Garden</h1>
                    <p>Watch your emotions bloom into beautiful flowers. Water daily to keep them thriving!</p>
                    <div class="garden-controls">
                        <button id="shareGarden" class="control-btn">📤 Share Garden</button>
                        <button id="achievementsBtn" class="control-btn">🏆 Achievements</button>
                        <button id="soundToggle" class="control-btn">${localStorage.getItem('gardenSounds') === 'false' ? '🔇' : '🔊'} Sound</button>
                    </div>
                </div>
                <div class="mood-garden" id="moodGarden"></div>
                <div class="garden-footer">
                    <p style="text-align: center; color: #666; font-size: 0.9em; margin-top: 15px;">
                        💡 Tip: Each journal entry with a mood grows a new flower. Water daily for the best results!
                    </p>
                </div>
            </div>`;

        // Initialize the mood garden
        const gardenElement = document.getElementById('moodGarden');
        moodGardenInstance = new MoodGarden(gardenElement, userId);

        // Setup control buttons
        setupGardenControls();
    }

    function setupGardenControls() {
        // Share Garden
        document.getElementById('shareGarden').addEventListener('click', async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'My Mood Garden',
                        text: 'Check out my emotional journey blooming into beautiful flowers! 🌸',
                        url: window.location.href
                    });
                } catch (err) {
                    console.log('Share cancelled');
                }
            } else {
                // Fallback: copy to clipboard
                const text = `🌱 My Mood Garden 🌱\n\nI've grown ${moodGardenInstance.gardenData?.flowers || 0} flowers representing my emotional journey!\n\nCheck it out: ${window.location.href}`;
                navigator.clipboard.writeText(text).then(() => {
                    showNotification('Garden link copied to clipboard! 📋', 'success');
                });
            }
        });

        // Achievements
        document.getElementById('achievementsBtn').addEventListener('click', async () => {
            try {
                const achievements = await api.get(`/garden/achievements/${userId}`);
                showAchievementsModal(achievements.achievements);
            } catch (err) {
                showNotification('Failed to load achievements', 'error');
            }
        });

        // Sound Toggle
        document.getElementById('soundToggle').addEventListener('click', () => {
            const current = localStorage.getItem('gardenSounds') !== 'false';
            localStorage.setItem('gardenSounds', !current);
            document.getElementById('soundToggle').innerHTML = current ? '🔇 Sound' : '🔊 Sound';
            if (moodGardenInstance) {
                moodGardenInstance.soundEnabled = !current;
            }
            showNotification(current ? '🔇 Sounds disabled' : '🔊 Sounds enabled', 'info');
        });
    }

    function showAchievementsModal(achievements) {
        const modal = document.createElement('div');
        modal.className = 'modal achievements-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <h2>🏆 Your Garden Achievements</h2>
                <div class="achievements-grid">
                    ${achievements.map(achievement => `
                        <div class="achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}">
                            <div class="achievement-icon">${achievement.icon}</div>
                            <div class="achievement-info">
                                <h3>${achievement.name}</h3>
                                <p>${achievement.description}</p>
                            </div>
                            <div class="achievement-status">
                                ${achievement.unlocked ? '✅' : '🔒'}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button id="closeAchievements" style="padding: 12px 25px; background: #667eea; color: white; border: none; border-radius: 25px; cursor: pointer; font-size: 16px; margin-top: 20px;">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.add('show');

        document.getElementById('closeAchievements').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
    }

    function showFlowerDetails(mood, count, flowerInfo) {
        const modal = document.createElement('div');
        modal.className = 'modal flower-detail-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div style="font-size: 4em; margin: 20px 0;">${flowerInfo.flower}</div>
                <h2 style="color: ${flowerInfo.color};">${mood} Flower</h2>
                <p><strong>Times felt:</strong> ${count}</p>
                <p><em>${flowerInfo.description}</em></p>
                <p style="font-size: 0.9em; color: #666;">This flower grows stronger with each ${mood.toLowerCase()} entry you make!</p>
                <button id="closeFlowerDetail" style="padding: 10px 20px; background: ${flowerInfo.color}; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 15px;">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.add('show');

        document.getElementById('closeFlowerDetail').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideInNotification 0.5s ease-out;
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutNotification 0.5s ease-in';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
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

    // --- Emotion-Based Messages Modal ---
    function showEmotionBasedMessages(messages, detectedEmotion, isLowMood) {
        if (!messages || messages.length === 0) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        const emotionEmoji = getEmotionEmoji(detectedEmotion);
        const emotionColor = isLowMood ? '#81c784' : '#667eea';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 550px;">
                <h2 style="color: ${emotionColor};">${emotionEmoji} Your Entry Analysis</h2>
                <p style="margin-bottom: 20px;">I detected you're feeling <strong>${detectedEmotion}</strong>. Here are some thoughts to brighten your day:</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    ${messages.map(msg => `<div style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${msg}</div>`).join('')}
                </div>
                <button id="closeEmotionMessages" style="padding: 12px 25px; background: ${emotionColor}; color: white; border: none; border-radius: 25px; cursor: pointer; font-size: 16px;">Thanks! 😊</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.add('show');

        document.getElementById('closeEmotionMessages').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
    }

    function getEmotionEmoji(emotion) {
        const emojis = {
            'happy': '😊', 'sad': '😢', 'angry': '😠', 'excited': '🤩',
            'calm': '😌', 'anxious': '😰', 'neutral': '😐'
        };
        return emojis[emotion] || '💭';
    }

    // --- Journal Preview Modal ---
    function showJournalPreview(title, content, mood) {
        const modal = document.createElement('div');
        modal.className = 'modal journal-preview-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <h2>👁️ Preview Your Entry</h2>
                <div class="preview-content">
                    <h3>${title || "Untitled"}</h3>
                    <p>${content}</p>
                    <div class="preview-footer">
                        <span class="mood-tag">${getMoodEmoji(mood)} ${mood}</span>
                        <span class="preview-date">${new Date().toLocaleString()}</span>
                    </div>
                </div>
                <button id="closePreview" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.add('show');

        document.getElementById('closePreview').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
    }


    // --- Default Page ---
    // This script is in the HTML, which will click the mood garden tab on load.
    // document.querySelector('[data-page="mood"]').click();
});
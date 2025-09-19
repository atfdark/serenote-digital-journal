// const navItems = document.querySelectorAll(".sidebar nav ul li");
// const content = document.getElementById("content");
// const menuToggle = document.getElementById('menuToggle');
// const sidebar = document.querySelector('.sidebar');
// const overlay = document.getElementById('overlay');

// // Sidebar toggle
// menuToggle.addEventListener('click', () => {
//     sidebar.classList.toggle('active');
//     overlay.classList.toggle('show');
// });
// overlay.addEventListener('click', () => {
//     sidebar.classList.remove('active');
//     overlay.classList.remove('show');
// });
// navItems.forEach(item => {
//     item.addEventListener('click', () => {
//         sidebar.classList.remove('active');
//         overlay.classList.remove('show');
//     });
// });

// // Navigation
// navItems.forEach(item => {
//     item.addEventListener("click", () => {
//         navItems.forEach(i => i.classList.remove("active"));
//         item.classList.add("active");
//         const page = item.getAttribute("data-page");

//         // ---------------- DASHBOARD ----------------
//         if (page === "dashboard") {
//             content.innerHTML = `
//                 <div class="dashboard-grid">
//                   <div class="dashboard-col-left">
//                     <div id="calendar-container"></div>
//                     <div id="recent-entries-container">
//                       <h2>Recent Entries</h2>
//                       <div id="recent-entries-list">
//                         <p>Loading entries...</p>
//                       </div>
//                     </div>
//                   </div>
//                   <div class="dashboard-col-right" id="dashboard-widgets">
//                     <h2>Mood Tracker</h2>
//                     <div class="widget-content">
//                         <p>No mood data available.</p>
//                     </div>
//                   </div>
//                 </div>
//             `;
//             loadCalendar(document.getElementById('calendar-container'));

//             // ✅ Fetch entries dynamically from backend
//             const userId = localStorage.getItem("userId");
//             fetch(`/entries/user/${userId}`)
//                 .then(res => res.json())
//                 .then(entries => {
//                     const container = document.getElementById("recent-entries-list");
//                     container.innerHTML = "";
//                     if (!entries || entries.length === 0) {
//                         container.innerHTML = "<p>No entries yet.</p>";
//                         return;
//                     }
//                     entries.slice(0, 5).forEach(entry => {
//                         const div = document.createElement("div");
//                         div.classList.add("recent-entry");

//                         if (entry.type === "text") {
//                             div.innerHTML = `
//                             <p class="entry-title">📝 ${entry.title}</p>
//                             <p class="entry-date">${new Date(entry.created_at).toLocaleDateString()}</p>
//                             <p>${entry.content.substring(0, 50)}...</p>
//                           `;
//                         } else if (entry.type === "voice") {
//                             div.innerHTML = `
//                             <p class="entry-title">🎙 ${entry.title}</p>
//                             <p class="entry-date">${new Date(entry.created_at).toLocaleDateString()}</p>
//                             <audio controls style="width:100%; margin-top:5px;">
//                                 <source src="/${entry.audio_path}" type="audio/webm">
//                                 Your browser does not support audio.
//                             </audio>
//                           `;
//                         }

//                         container.appendChild(div);
//                     });
//                 })
//                 .catch(err => {
//                     console.error("❌ Failed to load entries:", err);
//                     document.getElementById("recent-entries-list").innerHTML =
//                         "<p>Error loading entries.</p>";
//                 });
//         }

//         else if (page === "journal") {
//             const selectedDateStr = localStorage.getItem('selectedDate') || new Date().toISOString().split('T')[0];
//             const todayStr = new Date().toISOString().split('T')[0];
//             const formattedDate = new Date(selectedDateStr).toLocaleDateString("en-US", {
//                 weekday: "long", year: "numeric", month: "long", day: "numeric"
//             });

//             content.innerHTML = `
//                 <div class="journal-header">
//                   <div class="date-box">${formattedDate}</div>
//                   <h2>📖 Journal</h2>
//                 </div>
//                 <div class="journal-container" id="journalContainer">
//                   <p>Loading entries...</p>
//                 </div>
//             `;

//             const userId = localStorage.getItem("userId");

//             fetch(`/entries/user/${userId}`)
//                 .then(res => res.json())
//                 .then(entries => {
//                     const container = document.getElementById("journalContainer");
//                     container.innerHTML = "";

//                     // ✅ Writing area only for TODAY
//                     if (selectedDateStr === todayStr) {
//                         const writeBox = document.createElement("div");
//                         writeBox.innerHTML = `
//                         <input id="journalTitle" placeholder="Entry title..." 
//                                style="margin-bottom:10px; padding:10px; border-radius:6px; border:1px solid #ccc; width:100%;" />
//                         <textarea id="journalEntry" placeholder="Dear Journal..."></textarea>
                        
//                         <!-- Mood dropdown -->
//                         <label for="moodSelect" style="margin-top:10px;">Mood:</label>
//                         <select id="moodSelect" style="margin-left:10px; padding:6px; border-radius:6px; border:1px solid #ccc;">
//                           <option value="Happy">😊 Happy</option>
//                           <option value="Sad">😔 Sad</option>
//                           <option value="Excited">🤩 Excited</option>
//                           <option value="Calm">😌 Calm</option>
//                           <option value="Angry">😡 Angry</option>
//                           <option value="Neutral" selected>😐 Neutral</option>
//                         </select>
        
//                         <button id="saveJournal">💾 Save Entry</button>
//                         <p id="saveMsg" class="hidden">✅ Your journal entry has been saved!</p>
//                         <hr style="margin:20px 0;">
//                       `;
//                         container.appendChild(writeBox);

//                         // Save journal
//                         document.getElementById("saveJournal").addEventListener("click", () => {
//                             const title = document.getElementById("journalTitle").value || "Untitled";
//                             const contentText = document.getElementById("journalEntry").value;
//                             const mood = document.getElementById("moodSelect").value;

//                             if (!contentText.trim()) {
//                                 alert("Please write something before saving.");
//                                 return;
//                             }

//                             const payload = {
//                                 user_id: userId,
//                                 title: title,
//                                 content: contentText,
//                                 mood: mood
//                             };

//                             fetch("/entries/add", {
//                                 method: "POST",
//                                 headers: { "Content-Type": "application/json" },
//                                 body: JSON.stringify(payload)
//                             })
//                                 .then(res => res.json())
//                                 .then(data => {
//                                     console.log("✅ Journal saved:", data);
//                                     const msg = document.getElementById("saveMsg");
//                                     msg.classList.remove("hidden");
//                                     setTimeout(() => msg.classList.add("hidden"), 2000);
//                                 })
//                                 .catch(err => {
//                                     console.error("❌ Failed to save journal:", err);
//                                     alert("Failed to save entry.");
//                                 });
//                         });
//                     } else {
//                         // Past/future → read-only notice
//                         const notice = document.createElement("p");
//                         notice.style.color = "gray";
//                         notice.innerText = "🔒 You can only write/edit on today's date. Past entries are view-only.";
//                         container.appendChild(notice);
//                         container.appendChild(document.createElement("hr"));
//                     }

//                     // ✅ Show entries of selected day (fix: date compare properly with local date)
//                     const filtered = entries.filter(e => {
//                         const entryDate = new Date(e.created_at).toISOString().split("T")[0];
//                         return entryDate === selectedDateStr;
//                     });

//                     if (filtered.length === 0) {
//                         const noData = document.createElement("p");
//                         noData.innerText = "No entries for this day.";
//                         container.appendChild(noData);
//                     } else {
//                         filtered.forEach(entry => {
//                             const div = document.createElement("div");
//                             div.classList.add("journal-entry");

//                             if (entry.type === "text") {
//                                 div.innerHTML = `
//                                   <div class="entry-header">
//                                     <h3>${entry.title}</h3>
//                                     <time>${new Date(entry.created_at).toLocaleTimeString()}</time>
//                                   </div>
//                                   <p>${entry.content}</p>
//                                   <div class="entry-footer">
//                                     <span class="mood-tag">${entry.mood || "Neutral"}</span>
//                                   </div>
//                               `;
//                             } else if (entry.type === "voice") {
//                                 div.innerHTML = `
//                                   <div class="entry-header">
//                                     <h3>${entry.title}</h3>
//                                     <time>${new Date(entry.created_at).toLocaleTimeString()}</time>
//                                   </div>
//                                   <audio controls style="width:100%;">
//                                     <source src="/${entry.audio_path}" type="audio/webm">
//                                   </audio>
//                                   <div class="entry-footer">
//                                     <span class="mood-tag">${entry.mood || "Neutral"}</span>
//                                   </div>
//                               `;
//                             }
//                             container.appendChild(div);
//                         });
//                     }
//                 })
//                 .catch(err => {
//                     console.error("❌ Failed to load entries:", err);
//                     document.getElementById("journalContainer").innerHTML = "<p>Error loading entries.</p>";
//                 });
//         }



        // // ---------------- VOICE ----------------
        // else if (page === "voice") {

        // }

//         // ---------------- MOOD ----------------
//         else if (page === "mood") {
//             content.innerHTML = "<h1>🌱 Mood Garden</h1><p>Track your moods like a blooming garden.</p>";
//         }

//         // ---------------- LOGOUT ----------------
//         else if (page === "logout") {
//             localStorage.removeItem('userId');
//             window.location.href = "/login";
//         }
//     });
// });

// // Search
// document.getElementById("searchBar").addEventListener("input", (e) => {
//     const query = e.target.value.toLowerCase();
//     content.innerHTML = `<h1>🔍 Searching...</h1><p>You searched for: <b>${query}</b></p>`;
// });

// // Calendar
// function loadCalendar(container) {
//     if (!container) return;
//     container.innerHTML = `
//         <div class="calendar-wrapper">
//           <div class="calendar-header">
//             <button id="prev">&#10094;</button>
//             <h2 id="monthYear"></h2>
//             <button id="next">&#10095;</button>
//           </div>
//           <div class="calendar-grid" id="calendarGrid">
//             <div class="day-name">Sun</div><div class="day-name">Mon</div><div class="day-name">Tue</div>
//             <div class="day-name">Wed</div><div class="day-name">Thu</div><div class="day-name">Fri</div>
//             <div class="day-name">Sat</div>
//           </div>
//         </div>`;
//     const monthYear = document.getElementById("monthYear");
//     const grid = document.getElementById("calendarGrid");
//     const prev = document.getElementById("prev");
//     const next = document.getElementById("next");
//     let currentDate = new Date();

//     function renderCalendar() {
//         const year = currentDate.getFullYear();
//         const month = currentDate.getMonth();
//         monthYear.textContent = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
//         grid.innerHTML = `
//             <div class="day-name">Sun</div><div class="day-name">Mon</div><div class="day-name">Tue</div>
//             <div class="day-name">Wed</div><div class="day-name">Thu</div><div class="day-name">Fri</div>
//             <div class="day-name">Sat</div>`;
//         const firstDay = new Date(year, month, 1).getDay();
//         const lastDate = new Date(year, month + 1, 0).getDate();
//         for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement("div"));
//         for (let d = 1; d <= lastDate; d++) {
//             const dateEl = document.createElement("div");
//             dateEl.classList.add("date");
//             dateEl.textContent = d;
//             const date = new Date(year, month, d);
//             dateEl.dataset.date = date.toISOString().split('T')[0];
//             let today = new Date();
//             if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
//                 dateEl.classList.add("today");
//             }
//             dateEl.addEventListener('click', (e) => {
//                 localStorage.setItem('selectedDate', e.target.dataset.date);
//                 document.querySelector('[data-page="journal"]').click();
//             });
//             grid.appendChild(dateEl);
//         }
//     }
//     prev.addEventListener("click", () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
//     next.addEventListener("click", () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
//     renderCalendar();
// }
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
                        backgroundColor: ['#FFC107','#4CAF50','#F44336','#2196F3','#9C27B0','#00BCD4'],
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
            weekday: "long", year: "numeric", month: "long", day: "numeric"
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
                        <label for="moodSelect">Mood:</label>
                        <select id="moodSelect">
                          <option value="Happy">😊 Happy</option>
                          <option value="Sad">😔 Sad</option>
                          <option value="Excited">🤩 Excited</option>
                          <option value="Calm">😌 Calm</option>
                          <option value="Angry">😡 Angry</option>
                          <option value="Neutral" selected>😐 Neutral</option>
                        </select>
                        <button id="saveJournal">💾 Save Entry</button>
                        <p id="saveMsg" class="hidden">✅ Saved!</p>
                        <hr>`;
                    container.appendChild(writeBox);

                    document.getElementById("saveJournal").addEventListener("click", () => {
                        const title = document.getElementById("journalTitle").value || "Untitled";
                        const contentText = document.getElementById("journalEntry").value;
                        const mood = document.getElementById("moodSelect").value;

                        if (!contentText.trim()) return alert("Please write something!");

                        const payload = { user_id: userId, title, content: contentText, mood };
                        api.post("/entries/add", payload)
                            .then(() => {
                                const msg = document.getElementById("saveMsg");
                                msg.classList.remove("hidden");
                                setTimeout(() => msg.classList.add("hidden"), 2000);
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
                        if (entry.type === "text") {
                            div.innerHTML = `
                              <div class="entry-header">
                                <h3>${entry.title}</h3>
                                <time>${new Date(entry.created_at).toLocaleTimeString()}</time>
                              </div>
                              <p>${entry.content}</p>
                              <div class="entry-footer"><span class="mood-tag">${entry.mood || "Neutral"}</span></div>`;
                        } else if (entry.type === "voice") {
                            div.innerHTML = `
                              <div class="entry-header">
                                <h3>${entry.title}</h3>
                                <time>${new Date(entry.created_at).toLocaleTimeString()}</time>
                              </div>
                              <audio controls style="width:100%;">
                                <source src="/${entry.audio_path}" type="audio/webm">
                              </audio>
                              <div class="entry-footer"><span class="mood-tag">${entry.mood || "Neutral"}</span></div>`;
                        }
                        container.appendChild(div);
                    });
                }
            })
            .catch(() => {
                document.getElementById("journalContainer").innerHTML = "<p>Error loading entries.</p>";
            });
    }

    // ================= VOICE NOTES =================
    function loadVoiceNotes() {
        content.innerHTML = `
        <h1>🎙 Voice Notes</h1>
        <p class="voice-msg">🎤 Feel like sharing your thoughts?</p>
        <canvas id="waveform"></canvas>
        <div class="voice-controls">
          <button id="recordBtn" title="Record">⏺</button>
          <button id="pauseBtn" title="Pause" disabled>⏸</button>
          <button id="stopBtn" title="Stop" disabled>⏹</button>
          <button id="saveBtn" title="Save" disabled>💾</button>
          <button id="deleteBtn" title="Delete" disabled>🗑</button>
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
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }

    function resetVoiceRecorder() {
        isRecording = false;
        audioChunks = [];
        cancelAnimationFrame(animationId);
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (audioContext) audioContext.close();
        document.getElementById("recordBtn").disabled = false;
        document.getElementById("pauseBtn").disabled = true;
        document.getElementById("stopBtn").disabled = true;
        document.getElementById("saveBtn").disabled = true;
        document.getElementById("deleteBtn").disabled = true;
        document.getElementById("voiceStatus").textContent = "";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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
            document.getElementById("recordBtn").disabled = true;
            document.getElementById("pauseBtn").disabled = false;
            document.getElementById("stopBtn").disabled = false;
            document.getElementById("deleteBtn").disabled = false;
        } catch (err) {
            alert("Microphone access denied!");
        }
    });

    document.getElementById("pauseBtn").addEventListener("click", () => {
        if (!isRecording) return;
        const pauseBtn = document.getElementById("pauseBtn");
        if (mediaRecorder.state === "recording") {
            mediaRecorder.pause();
            cancelAnimationFrame(animationId);
            document.getElementById("voiceStatus").textContent = "⏸ Paused";
            pauseBtn.innerHTML = "▶";
        } else if (mediaRecorder.state === "paused") {
            mediaRecorder.resume();
            drawWave();
            document.getElementById("voiceStatus").textContent = "🔴 Recording...";
            pauseBtn.innerHTML = "⏸";
        }
    });

    document.getElementById("stopBtn").addEventListener("click", () => {
        if (!isRecording) return;
        mediaRecorder.stop();
        isRecording = false;
        cancelAnimationFrame(animationId);
        document.getElementById("voiceStatus").textContent = "⏹ Stopped. Ready to save.";
        document.getElementById("saveBtn").disabled = false;
    });

    document.getElementById("deleteBtn").addEventListener("click", () => {
        resetVoiceRecorder();
        document.getElementById("voiceStatus").textContent = "🗑 Deleted.";
    });

    // ✅ Upload voice note
    document.getElementById("saveBtn").addEventListener("click", () => {
        if (audioChunks.length === 0) {
            document.getElementById("voiceStatus").textContent = "⚠️ Nothing to save.";
            return;
        }
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("user_id", localStorage.getItem("userId"));
        formData.append("title", `Voice Note - ${new Date().toLocaleString()}`);
        formData.append("mood", "Voice");
        formData.append("audio", audioBlob, "voicenote.webm");

        document.getElementById("voiceStatus").textContent = "Uploading...";

        fetch("/entries/voice", {
            method: "POST",
            body: formData
        })
            .then(res => res.json())
            .then(data => {
                console.log("✅ Voice note saved:", data);
                document.getElementById("voiceStatus").textContent = "✅ Uploaded!";
                resetVoiceRecorder();
            })
            .catch(err => {
                console.error("❌ Upload failed:", err);
                document.getElementById("voiceStatus").textContent = "❌ Upload failed!";
            });
    });
    }

    // ================= MOOD GARDEN =================
    function loadMoodGarden() {
        content.innerHTML = "<h1>🌱 Mood Garden</h1><p>Track your moods like a blooming garden.</p>";
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
    loadDashboard();
});

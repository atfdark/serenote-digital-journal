document.addEventListener('DOMContentLoaded', () => {
    // --- IST Helper Function ---
    function toIST(date) {
        // Convert to IST (UTC+5:30)
        const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
        const ist = new Date(utc + (5.5 * 3600000)); // 5.5 hours in milliseconds
        return ist;
    }

    function formatDateIST(date, options = {}) {
        return toIST(new Date(date)).toLocaleDateString('en-IN', options);
    }

    function formatTimeIST(date, options = {}) {
        return toIST(new Date(date)).toLocaleTimeString('en-IN', options);
    }

    function formatDateTimeIST(date, options = {}) {
        return toIST(new Date(date)).toLocaleString('en-IN', options);
    }

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
        async put(endpoint, body) {
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: "Failed to update" }));
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

    // Search functionality
    const searchBar = document.getElementById('searchBar');
    let searchTimeout;
    searchBar.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();
            if (query) {
                performSearch(query);
            } else {
                // Reload current page content
                const currentPage = document.querySelector('.sidebar nav ul li.active').getAttribute('data-page');
                loadPageContent(currentPage);
            }
        }, 300);
    });

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

        // Keyboard navigation
        item.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                item.click();
            }
        });

        // Make focusable
        item.setAttribute("tabindex", "0");
    });

    // Keyboard navigation for sidebar
    let currentFocusIndex = -1;
    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" && document.activeElement.closest('.sidebar')) {
            e.preventDefault();
            const focusableItems = Array.from(navItems);
            currentFocusIndex = (currentFocusIndex + 1) % focusableItems.length;
            focusableItems[currentFocusIndex].focus();
        } else if (e.key === "ArrowUp" && document.activeElement.closest('.sidebar')) {
            e.preventDefault();
            const focusableItems = Array.from(navItems);
            currentFocusIndex = currentFocusIndex <= 0 ? focusableItems.length - 1 : currentFocusIndex - 1;
            focusableItems[currentFocusIndex].focus();
        }
    });

    // --- Export Functions ---
    async function exportJournal() {
        try {
            const entries = await api.get(`/entries/user/${userId}`);
            const textEntries = entries.filter(e => e.type === 'text');

            // Initialize jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Set up colors matching site theme
            const primaryColor = [102, 126, 234]; // #667eea
            const secondaryColor = [118, 75, 162]; // #764ba2
            const accentColor = [212, 175, 55]; // #d4af37

            // Add cover page
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, 210, 297, 'F');

            // Add title
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(30);
            doc.setFont('helvetica', 'bold');
            doc.text('My Journal', 105, 100, { align: 'center' });

            doc.setFontSize(16);
            doc.setFont('helvetica', 'normal');
            doc.text('Serenote Export', 105, 120, { align: 'center' });

            doc.setFontSize(12);
            doc.text(`Exported on: ${formatDateTimeIST(new Date())}`, 105, 140, { align: 'center' });
            doc.text(`Total Entries: ${textEntries.length}`, 105, 155, { align: 'center' });

            // Add logo area (placeholder)
            doc.setTextColor(...accentColor);
            doc.setFontSize(10);
            doc.text('✨ Serenote - Your Digital Journal Companion ✨', 105, 250, { align: 'center' });

            let currentPage = 1;
            let yPosition = 40;

            // Process each entry
            for (let i = 0; i < textEntries.length; i++) {
                const entry = textEntries[i];

                // Start new page for each entry (except first)
                if (i > 0) {
                    doc.addPage();
                    currentPage++;
                    yPosition = 40;
                }

                // Add header for each entry
                doc.setFillColor(...secondaryColor);
                doc.rect(0, 0, 210, 35, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(`Entry ${i + 1}: ${entry.title || 'Untitled'}`, 20, 25);

                // Reset text color for content
                doc.setTextColor(0, 0, 0);

                // Add metadata
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Date: ${formatDateTimeIST(entry.created_at)}`, 20, yPosition);
                yPosition += 8;

                doc.text(`Mood: ${entry.mood || 'Neutral'}`, 20, yPosition);
                yPosition += 8;

                if (entry.tags && entry.tags.length > 0) {
                    doc.text(`Tags: ${entry.tags.join(', ')}`, 20, yPosition);
                    yPosition += 12;
                } else {
                    yPosition += 4;
                }

                // Add decorative line
                doc.setDrawColor(...accentColor);
                doc.setLineWidth(0.5);
                doc.line(20, yPosition, 190, yPosition);
                yPosition += 10;

                // Add content
                doc.setFontSize(11);
                const contentLines = doc.splitTextToSize(entry.content, 170);
                const linesAdded = doc.text(contentLines, 20, yPosition);

                // Calculate space used by content
                const contentHeight = contentLines.length * 5;
                yPosition += contentHeight + 15;

                // Add images if they exist
                if (entry.images && entry.images.length > 0) {
                    for (const image of entry.images) {
                        try {
                            const img = new Image();
                            img.src = image.data;

                            await new Promise((resolve) => {
                                img.onload = resolve;
                            });

                            // Calculate dimensions
                            const maxWidth = 170;
                            const maxHeight = 80;
                            let imgWidth = img.width;
                            let imgHeight = img.height;

                            if (imgWidth > maxWidth) {
                                imgHeight = (imgHeight * maxWidth) / imgWidth;
                                imgWidth = maxWidth;
                            }

                            if (imgHeight > maxHeight) {
                                imgWidth = (imgWidth * maxHeight) / imgHeight;
                                imgHeight = maxHeight;
                            }

                            // Check if we need a new page
                            if (yPosition + imgHeight > 250) {
                                doc.addPage();
                                currentPage++;
                                yPosition = 40;
                            }

                            doc.addImage(img, 'JPEG', 20, yPosition, imgWidth, imgHeight);
                            yPosition += imgHeight + 15;

                        } catch (error) {
                            console.error('Error adding image to PDF:', error);
                        }
                    }
                }
            }

            // Add page numbers and footer to all pages
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);

                // Add subtle background pattern to footer area
                doc.setFillColor(248, 249, 255, 0.3);
                doc.rect(0, 270, 210, 27, 'F');

                // Add page number
                doc.setTextColor(100, 100, 100);
                doc.setFontSize(8);
                doc.text(`Page ${i} of ${totalPages}`, 105, 285, { align: 'center' });

                // Add branding
                doc.setTextColor(...primaryColor);
                doc.setFontSize(6);
                doc.text('Generated by Serenote - Your Digital Journal Companion', 105, 290, { align: 'center' });
            }

            // Save the PDF
            const fileName = `journal-export-${toIST(new Date()).toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            showNotification('Journal exported as PDF successfully! 📄', 'success');
        } catch (error) {
            console.error('PDF export error:', error);
            showNotification('Failed to export journal as PDF', 'error');
        }
    }

    async function exportSingleEntry(entryId) {
        try {
            const entries = await api.get(`/entries/user/${userId}`);
            const entry = entries.find(e => e.id == entryId);

            if (!entry) {
                showNotification('Entry not found', 'error');
                return;
            }

            // Initialize jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Set up colors matching site theme
            const primaryColor = [102, 126, 234]; // #667eea
            const secondaryColor = [118, 75, 162]; // #764ba2
            const accentColor = [212, 175, 55]; // #d4af37

            // Add header with site branding
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, 210, 30, 'F');

            // Add logo/title
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Serenote', 20, 20);

            // Add entry title
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(entry.title || 'Untitled Entry', 20, 50);

            let yPosition = 70;

            // Add metadata
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Date: ${formatDateTimeIST(entry.created_at)}`, 20, yPosition);
            yPosition += 10;

            doc.text(`Mood: ${entry.mood || 'Neutral'}`, 20, yPosition);
            yPosition += 10;

            if (entry.tags && entry.tags.length > 0) {
                doc.text(`Tags: ${entry.tags.join(', ')}`, 20, yPosition);
                yPosition += 20;
            } else {
                yPosition += 10;
            }

            // Add decorative line
            doc.setDrawColor(...accentColor);
            doc.setLineWidth(1);
            doc.line(20, yPosition, 190, yPosition);
            yPosition += 15;

            // Add content with proper formatting
            doc.setFontSize(11);
            const contentLines = doc.splitTextToSize(entry.content, 170);
            doc.text(contentLines, 20, yPosition);

            // Calculate new y position after content
            const contentHeight = contentLines.length * 5;
            yPosition += contentHeight + 20;

            // Add images if they exist
            if (entry.images && entry.images.length > 0) {
                for (const image of entry.images) {
                    try {
                        // Create image element to get dimensions
                        const img = new Image();
                        img.src = image.data;

                        await new Promise((resolve) => {
                            img.onload = resolve;
                        });

                        // Calculate dimensions to fit in PDF (max width 170, max height 100)
                        const maxWidth = 170;
                        const maxHeight = 100;
                        let imgWidth = img.width;
                        let imgHeight = img.height;

                        if (imgWidth > maxWidth) {
                            imgHeight = (imgHeight * maxWidth) / imgWidth;
                            imgWidth = maxWidth;
                        }

                        if (imgHeight > maxHeight) {
                            imgWidth = (imgWidth * maxHeight) / imgHeight;
                            imgHeight = maxHeight;
                        }

                        // Check if we need a new page
                        if (yPosition + imgHeight > 270) {
                            doc.addPage();
                            yPosition = 30;
                        }

                        // Add image to PDF
                        doc.addImage(img, 'JPEG', 20, yPosition, imgWidth, imgHeight);
                        yPosition += imgHeight + 15;

                    } catch (error) {
                        console.error('Error adding image to PDF:', error);
                        // Continue without the image
                    }
                }
            }

            // Add footer with page number and branding
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                // Add subtle background pattern
                doc.setFillColor(248, 249, 255, 0.3); // Very light blue
                doc.rect(0, 270, 210, 27, 'F');

                // Add page number
                doc.setTextColor(100, 100, 100);
                doc.setFontSize(8);
                doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });

                // Add branding
                doc.setTextColor(...primaryColor);
                doc.setFontSize(6);
                doc.text('Generated by Serenote - Your Digital Journal Companion', 105, 290, { align: 'center' });
            }

            // Save the PDF
            const fileName = `${(entry.title || 'Untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${toIST(new Date(entry.created_at)).toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            showNotification('Entry exported as PDF successfully! 📄', 'success');
        } catch (error) {
            console.error('PDF export error:', error);
            showNotification('Failed to export entry as PDF', 'error');
        }
    }

    // --- Search Function ---
    async function performSearch(query) {
        try {
            const entries = await api.get(`/entries/user/${userId}`);
            const filteredEntries = entries.filter(entry =>
                entry.title.toLowerCase().includes(query) ||
                entry.content.toLowerCase().includes(query) ||
                (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(query)))
            );

            // Display search results
            const container = document.getElementById("journalContainer") || content;
            container.innerHTML = `<h3>🔍 Search Results for "${query}"</h3>`;

            if (filteredEntries.length === 0) {
                container.innerHTML += '<p>No entries found matching your search.</p>';
                return;
            }

            filteredEntries.forEach(entry => {
                const div = document.createElement("div");
                div.classList.add("journal-entry");
                div.dataset.entryId = entry.id;

                const previewText = getContentPreview(entry.content);
                div.innerHTML = `
                    <div class="entry-header">
                        <h3>${entry.title}</h3>
                        <time>${formatDateIST(entry.created_at)}</time>
                    </div>
                    <div class="entry-content">
                        <p class="content-preview">${previewText}</p>
                    </div>
                    <div class="entry-footer">
                        <span class="mood-tag">${entry.mood || "Neutral"}</span>
                        ${entry.tags ? entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                    </div>`;

                container.appendChild(div);
            });

            // Add click handlers for search results
            container.addEventListener('click', (e) => {
                if (e.target.closest('.journal-entry')) {
                    const entryId = e.target.closest('.journal-entry').dataset.entryId;
                    const entry = filteredEntries.find(e => e.id == entryId);
                    if (entry) {
                        showJournalEntryModal(entry.title, entry.content, entry.mood, 'default', entry.created_at);
                    }
                }
            });

        } catch (error) {
            console.error('Search failed:', error);
        }
    }

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
            case "todo": loadTodoList(); break;
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
                        <p class="entry-date">${formatDateIST(entry.created_at)}</p>`;
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
            const todayStr = toIST(new Date()).toLocaleDateString("en-CA");
            const todayEntries = entries.filter(e => toIST(new Date(e.created_at)).toLocaleDateString("en-CA") === todayStr);
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
        const selectedDateStr = localStorage.getItem('selectedDate') || toIST(new Date()).toLocaleDateString("en-CA");
        const todayStr = toIST(new Date()).toLocaleDateString("en-CA");
        const formattedDate = toIST(new Date(selectedDateStr)).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        content.innerHTML = `
        <div class="journal-header">
          <div class="date-box">All Entries</div>
          <h2>📖 Journal</h2>
          <div class="journal-actions">
            <button id="exportJournal" class="export-btn">📄 Export</button>
          </div>
          <div class="journal-stats" id="journalStats"></div>
        </div>
        <div class="journal-container" id="journalContainer">
          <div class="journal-page-number">Page 1</div>
          <p>Loading entries...</p>
        </div>`;

        // Load journal stats
        loadJournalStats();

        // Export functionality
        document.getElementById("exportJournal").addEventListener("click", () => {
            exportJournal();
        });

        fetch(`/entries/user/${userId}`)
            .then(res => res.json())
            .then(entries => {
                const container = document.getElementById("journalContainer");
                container.innerHTML = "";

                // --- Writing area always available ---
                if (true) {
                    const writeBox = document.createElement("div");
                    writeBox.className = "journal-writing-area";
                    writeBox.innerHTML = `
                        <div class="writing-header">
                            <h3>✍️ Write Your Thoughts</h3>
                            <div class="writing-prompt" id="writingPrompt">What's on your mind today?</div>
                            <button id="generatePrompt" class="generate-prompt-btn">🎲 Generate Writing Prompt</button>
                        </div>
                        <input id="journalTitle" placeholder="Give your entry a title..." />
                        <input id="journalTags" placeholder="Add tags (comma separated): work, personal, goals..." />
                        <textarea id="journalEntry" placeholder="Start writing your journal entry here..."></textarea>
                        <div class="selectors-container">
                          <div class="mood-selector-container">
                            <label for="moodSelect">How are you feeling today?</label>
                            <select id="moodSelect" aria-label="Select your current mood">
                              <option value="Happy">😊 Happy</option>
                              <option value="Sad">😔 Sad</option>
                              <option value="Excited">🤩 Excited</option>
                              <option value="Calm">😌 Calm</option>
                              <option value="Angry">😡 Angry</option>
                              <option value="Neutral" selected>😐 Neutral</option>
                            </select>
                          </div>
                          <div class="theme-selector-container">
                            <label for="themeSelect">Choose your writing theme</label>
                            <select id="themeSelect" aria-label="Select journal background theme">
                              <option value="default" selected>📝 Default (Lined Paper)</option>
                              <option value="nature">🌿 Nature</option>
                              <option value="abstract">🎨 Abstract</option>
                              <option value="minimalist">✨ Minimalist</option>
                              <option value="custom">🖼️ Custom Upload</option>
                            </select>
                            <input type="file" id="customBgUpload" accept="image/*" style="display:none;" aria-label="Upload custom background image">
                          </div>
                          <div class="font-selector-container">
                            <label for="fontSelect">Choose your font</label>
                            <select id="fontSelect" aria-label="Select journal font">
                              <option value="default" selected>✍️ Default</option>
                              <option value="serif">📖 Serif</option>
                              <option value="script">🖋️ Script</option>
                              <option value="modern">💼 Modern</option>
                            </select>
                          </div>
                          <div class="color-selector-container">
                            <label for="textColorPicker">Text Color</label>
                            <input type="color" id="textColorPicker" value="#333333" aria-label="Choose text color">
                            <label for="bgColorPicker">Background Color</label>
                            <input type="color" id="bgColorPicker" value="#ffffff" aria-label="Choose background color">
                          </div>
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

                    // Writing prompts functionality
                    const writingPrompts = [
                        "What's one thing you're grateful for today?",
                        "Describe a moment that made you smile recently.",
                        "What would you tell your younger self?",
                        "What's a challenge you're currently facing and how are you overcoming it?",
                        "Describe your perfect day from start to finish.",
                        "What's a skill you'd love to learn and why?",
                        "Write about a person who has influenced your life.",
                        "What's your favorite memory from childhood?",
                        "If you could travel anywhere right now, where would you go and why?",
                        "What's something you're looking forward to in the next month?",
                        "Describe a time when you felt truly happy.",
                        "What's a book, movie, or song that changed your perspective?",
                        "Write about a goal you're working towards.",
                        "What's something you wish you could tell someone but haven't?",
                        "Describe your ideal morning routine."
                    ];

                    document.getElementById("generatePrompt").addEventListener("click", () => {
                        const randomPrompt = writingPrompts[Math.floor(Math.random() * writingPrompts.length)];
                        document.getElementById("writingPrompt").textContent = randomPrompt;
                    });

                    // Capsule checkbox logic
                    document.getElementById("isCapsule").addEventListener("change", (e) => {
                        document.getElementById("capsuleDate").style.display = e.target.checked ? "block" : "none";
                    });


                    // Theme selector logic
                    const themeSelect = document.getElementById("themeSelect");
                    const customBgUpload = document.getElementById("customBgUpload");
                    const journalContainer = document.querySelector(".journal-writing-area");

                    // Font and color selectors
                    const fontSelect = document.getElementById("fontSelect");
                    const textColorPicker = document.getElementById("textColorPicker");
                    const bgColorPicker = document.getElementById("bgColorPicker");

                    // Load saved preferences
                    const savedTheme = localStorage.getItem('journalTheme') || 'default';
                    const savedFont = localStorage.getItem('journalFont') || 'default';
                    const savedTextColor = localStorage.getItem('journalTextColor') || '#333333';
                    const savedBgColor = localStorage.getItem('journalBgColor') || '#ffffff';

                    themeSelect.value = savedTheme;
                    fontSelect.value = savedFont;
                    textColorPicker.value = savedTextColor;
                    bgColorPicker.value = savedBgColor;

                    applyTheme(savedTheme);
                    applyFont(savedFont);
                    applyColors(savedTextColor, savedBgColor);

                    themeSelect.addEventListener("change", (e) => {
                        const theme = e.target.value;
                        localStorage.setItem('journalTheme', theme);
                        applyTheme(theme);

                        if (theme === 'custom') {
                            customBgUpload.click();
                        }
                    });

                    customBgUpload.addEventListener("change", (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const imageUrl = event.target.result;
                                localStorage.setItem('customBgImage', imageUrl);
                                applyTheme('custom');
                            };
                            reader.readAsDataURL(file);
                        }
                    });

                    // Font selector logic
                    fontSelect.addEventListener("change", (e) => {
                        const font = e.target.value;
                        localStorage.setItem('journalFont', font);
                        applyFont(font);
                    });

                    // Color picker logic
                    textColorPicker.addEventListener("change", (e) => {
                        const textColor = e.target.value;
                        localStorage.setItem('journalTextColor', textColor);
                        applyColors(textColor, bgColorPicker.value);
                    });

                    bgColorPicker.addEventListener("change", (e) => {
                        const bgColor = e.target.value;
                        localStorage.setItem('journalBgColor', bgColor);
                        applyColors(textColorPicker.value, bgColor);
                    });

                    function applyTheme(theme) {
                        // Reset to default
                        journalEntry.style.background = '';
                        journalContainer.style.background = '';
                        journalEntry.style.backgroundImage = '';
                        journalContainer.style.backgroundImage = '';

                        switch(theme) {
                            case 'default':
                                journalEntry.style.background = 'repeating-linear-gradient(white, white 28px, rgba(139, 115, 85, 0.2) 29px)';
                                journalEntry.style.border = '1px solid rgba(139, 115, 85, 0.3)';
                                journalEntry.style.borderRadius = '5px';
                                break;
                            case 'nature':
                                journalContainer.style.background = 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)';
                                journalEntry.style.background = 'rgba(255, 255, 255, 0.9)';
                                journalEntry.style.boxShadow = 'inset 0 0 20px rgba(76, 175, 80, 0.1)';
                                // Add subtle leaf pattern
                                journalEntry.style.backgroundImage = 'radial-gradient(circle at 20% 80%, rgba(76, 175, 80, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(76, 175, 80, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(76, 175, 80, 0.1) 0%, transparent 50%)';
                                break;
                            case 'abstract':
                                journalContainer.style.background = 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)';
                                journalEntry.style.background = 'rgba(255, 255, 255, 0.95)';
                                // Add geometric pattern
                                journalEntry.style.backgroundImage = 'linear-gradient(45deg, rgba(102, 126, 234, 0.1) 25%, transparent 25%), linear-gradient(-45deg, rgba(102, 126, 234, 0.1) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(118, 75, 162, 0.1) 75%), linear-gradient(-45deg, transparent 75%, rgba(118, 75, 162, 0.1) 75%)';
                                journalEntry.style.backgroundSize = '20px 20px';
                                break;
                            case 'minimalist':
                                journalContainer.style.background = '#fafafa';
                                journalEntry.style.background = 'white';
                                journalEntry.style.border = '1px solid #e0e0e0';
                                journalEntry.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                break;
                            case 'custom':
                                const customImage = localStorage.getItem('customBgImage');
                                if (customImage) {
                                    journalContainer.style.backgroundImage = `url(${customImage})`;
                                    journalContainer.style.backgroundSize = 'cover';
                                    journalContainer.style.backgroundPosition = 'center';
                                    journalEntry.style.background = 'rgba(255, 255, 255, 0.9)';
                                    journalEntry.style.backdropFilter = 'blur(10px)';
                                }
                                break;
                        }
                    }

                    function applyFont(font) {
                        switch(font) {
                            case 'default':
                                journalEntry.style.fontFamily = 'Poppins, sans-serif';
                                break;
                            case 'serif':
                                journalEntry.style.fontFamily = 'Georgia, serif';
                                break;
                            case 'script':
                                journalEntry.style.fontFamily = 'Dancing Script, cursive';
                                break;
                            case 'modern':
                                journalEntry.style.fontFamily = 'Roboto, sans-serif';
                                break;
                        }
                    }

                    function applyColors(textColor, bgColor) {
                        journalEntry.style.color = textColor;
                        journalEntry.style.backgroundColor = bgColor;
                        // Adjust border color based on background
                        const isDarkBg = parseInt(bgColor.slice(1), 16) < 0x808080;
                        journalEntry.style.borderColor = isDarkBg ? 'rgba(255,255,255,0.3)' : 'rgba(139, 115, 85, 0.3)';
                    }

document.getElementById("saveJournal").addEventListener("click", async () => {
    const title = journalTitle.value || "Untitled";
    const contentText = journalEntry.value;
    const tags = document.getElementById("journalTags").value;
    const mood = document.getElementById("moodSelect").value;
    const isCapsule = document.getElementById("isCapsule").checked;
    const capsuleDate = document.getElementById("capsuleDate").value;

    if (!contentText.trim()) {
        showNotification('Please write something!', 'error');
        return;
    }

    if (isCapsule && !capsuleDate) {
        showNotification('Please set a capsule open date!', 'error');
        return;
    }

    // Show loading state
    const saveBtn = document.getElementById("saveJournal");
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "💾 Saving...";
    saveBtn.disabled = true;

    const payload = {
        user_id: userId,
        title,
        content: contentText,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        mood,
        is_capsule: isCapsule,
        capsule_open_date: isCapsule ? capsuleDate : null
    };

    try {
        await api.post("/entries/add", payload);

        // Clear draft after successful save
        localStorage.removeItem('journalDraft');

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
// Generate compassionate response tools based on user's selected mood
try {
    const aiResponse = await api.post("/entries/generate-prompts", { content: contentText, mood });

    // Use the user's explicitly selected mood instead of AI-detected emotion
    // This ensures we respect the user's self-identification of their emotional state
    const userSelectedMood = mood.toLowerCase();

    // Get compassionate tools based on user's chosen mood
    const compassionateTools = await api.get(`/entries/compassionate-tools?emotion=${userSelectedMood}`);

    showCompassionateResponseModal(aiResponse.messages, userSelectedMood, aiResponse.is_low_mood, compassionateTools);
} catch (err) {
    console.error("Compassionate response failed:", err);
    // Fallback to basic notification
    showNotification('Entry saved successfully! 🌱', 'success');
}

        setTimeout(() => {
            msg.classList.add("hidden");
            loadJournal(); // Reload to see new entry
        }, 2000);
    } catch (error) {
        showNotification('Failed to save entry. Please try again.', 'error');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
});
                } else {
                    const notice = document.createElement("p");
                    notice.style.color = "gray";
                    notice.innerText = "🔒 You can only write/edit today. Past entries are view-only.";
                    container.appendChild(notice);
                    container.appendChild(document.createElement("hr"));
                }

               // --- Show all entries sorted by date (newest first) ---
const filtered = entries
    .filter(e => e.type === 'text')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

if (filtered.length === 0) {
    const noData = document.createElement("p");
    noData.innerText = "No entries for this day.";
    container.appendChild(noData);
} else {
    filtered.forEach(entry => {
        const div = document.createElement("div");
        div.classList.add("journal-entry");
        div.dataset.entryId = entry.id;

        const entryDateStr = toIST(new Date(entry.created_at)).toLocaleDateString("en-CA");
        const isToday = entryDateStr === todayStr;
        const now = new Date();
        const isLocked = entry.is_capsule && entry.capsule_open_date && new Date(entry.capsule_open_date) > now;

        let actionsHTML = "";
        if (!isLocked) {
            actionsHTML = `<div class="entry-actions">
                              <button class="btn-export-entry" data-entry-id="${entry.id}">📄 Export</button>
                              ${isToday ? `<button class="btn-delete-entry" data-entry-id="${entry.id}">🗑️ Delete</button>` : ''}
                           </div>`;
        }

        if (entry.type === "text") {
            if (isLocked) {
                div.innerHTML = `
                  <div class="entry-header">
                    <h3>🔒 Time Capsule</h3>
                    <time>Opens on ${formatDateTimeIST(entry.capsule_open_date)}</time>
                  </div>
                  <p style="color: gray;">This capsule is locked until the specified date.</p>
                  <div class="entry-footer">
                    <span class="mood-tag">${entry.mood || "Neutral"}</span>
                  </div>`;
            } else {
                    const previewText = getContentPreview(entry.content);
                    const currentTheme = localStorage.getItem('journalTheme') || 'default';
                    div.innerHTML = `
                      <div class="entry-clickable" data-entry-id="${entry.id}" data-title="${entry.title}" data-content="${entry.content.replace(/"/g, '"')}" data-mood="${entry.mood || 'Neutral'}" data-theme="${currentTheme}" data-created="${entry.created_at}">
                        <div class="entry-header">
                          <h3>${entry.title}</h3>
                          <time>${formatTimeIST(entry.created_at)}</time>
                        </div>
                        <div class="entry-content">
                          <p class="content-preview">${previewText}</p>
                        </div>
                        <div class="entry-footer">
                          <span class="mood-tag">${entry.mood || "Neutral"}</span>
                        </div>
                      </div>
                      <div class="entry-actions">
                        ${actionsHTML}
                      </div>`;
                }
        } else if (entry.type === "voice") {
            div.innerHTML = `
              <div class="entry-header">
                <h3>${entry.title}</h3>
                <time>${formatTimeIST(entry.created_at)}</time>
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

                // --- Add event listener for all buttons and entry clicks ---
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
                    } else if (e.target && e.target.matches('.btn-export-entry')) {
                        const button = e.target;
                        const entryId = button.dataset.entryId;
                        exportSingleEntry(entryId);
                    } else if (e.target && e.target.closest('.entry-clickable')) {
                        const clickableElement = e.target.closest('.entry-clickable');
                        const title = clickableElement.dataset.title;
                        const content = clickableElement.dataset.content;
                        const mood = clickableElement.dataset.mood;
                        const theme = clickableElement.dataset.theme;
                        const createdDate = clickableElement.dataset.created;

                        showJournalEntryModal(title, content, mood, theme, createdDate);
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

                // Reload voice stats and recordings list
                loadVoiceStats();
                renderRecordings();
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
                loadVoiceStats();
                renderRecordings();
                modal.classList.remove("show");
                voiceStatus.textContent = `🔒 Time Capsule will unlock at ${formatDateTimeIST(dtInput)}`;
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

                // Sort voice entries by creation date (newest first)
                voiceEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
                voiceEntries.forEach(entry => {
                    const wrapper = document.createElement("div");
                    wrapper.classList.add("recording-item");
        
                    const title = document.createElement("h3");
                    title.classList.add("recording-title");
                    title.textContent = entry.title || "Voice Note";
        
                    const time = document.createElement("p");
                    time.classList.add("recording-time");
        
                    const audio = document.createElement("audio");
                    audio.controls = true;
        
                    const delBtn = document.createElement("button");
                    delBtn.classList.add("delete-note");
                    delBtn.textContent = "🗑 Delete";
                    delBtn.onclick = () => deleteRecording(entry.id);
        
                    if (entry.is_capsule && entry.capsule_open_date && new Date(entry.capsule_open_date) > now) {
                        time.innerHTML = `🔒 Locked until ${formatDateTimeIST(entry.capsule_open_date)}`;
                        wrapper.classList.add('locked-note');
                    } else {
                        audio.src = `/${entry.audio_path}`;
                        time.textContent = formatDateTimeIST(entry.created_at);
                        wrapper.appendChild(audio);
                    }
        
                    wrapper.appendChild(title);
                    wrapper.appendChild(time);
                    if (!wrapper.classList.contains('locked-note')) {
                        wrapper.appendChild(audio);
                    }
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
                    loadVoiceStats();
                    renderRecordings();
                } catch (err) {
                    alert('Failed to delete.');
                }
            }
        }
        
        // Render recordings once
        renderRecordings(); // Initial render
    }

    // ================= TODO LIST =================
    async function loadTodoList() {
        content.innerHTML = `
            <div class="todo-container">
                <div class="todo-header">
                    <h1>✅ Todo List</h1>
                    <p>Stay organized and track your tasks for better mental well-being</p>
                    <div class="todo-stats" id="todoStats"></div>
                </div>

                <div class="todo-content">
                    <div class="add-todo-section">
                        <div class="add-todo-form">
                            <input type="text" id="todoTitle" placeholder="What needs to be done?" maxlength="200" />
                            <textarea id="todoDescription" placeholder="Add details (optional)" maxlength="500"></textarea>
                            <div class="todo-options">
                                <select id="todoPriority">
                                    <option value="low">🟢 Low Priority</option>
                                    <option value="medium" selected>🟡 Medium Priority</option>
                                    <option value="high">🔴 High Priority</option>
                                </select>
                                <select id="todoCategory">
                                    <option value="general" selected>📝 General</option>
                                    <option value="work">💼 Work</option>
                                    <option value="personal">👤 Personal</option>
                                    <option value="health">🏥 Health</option>
                                    <option value="learning">📚 Learning</option>
                                    <option value="relationships">❤️ Relationships</option>
                                </select>
                                <input type="datetime-local" id="todoDueDate" />
                            </div>
                            <button id="addTodoBtn" class="add-todo-btn">➕ Add Task</button>
                        </div>
                    </div>

                    <div class="todo-filters">
                        <div class="filter-buttons">
                            <button class="filter-btn active" data-filter="all">All</button>
                            <button class="filter-btn" data-filter="pending">Pending</button>
                            <button class="filter-btn" data-filter="completed">Completed</button>
                        </div>
                        <div class="category-filters">
                            <button class="category-filter active" data-category="all">All Categories</button>
                            <button class="category-filter" data-category="general">General</button>
                            <button class="category-filter" data-category="work">Work</button>
                            <button class="category-filter" data-category="personal">Personal</button>
                            <button class="category-filter" data-category="health">Health</button>
                        </div>
                        <div class="todo-actions-bar">
                            <input type="text" id="todoSearch" placeholder="🔍 Search tasks..." />
                            <button id="clearCompletedBtn" class="action-btn">🗑️ Clear Completed</button>
                        </div>
                    </div>

                    <div class="todo-list" id="todoList">
                        <div class="loading-todos">Loading your tasks...</div>
                    </div>
                </div>
            </div>
        `;

        // Load todo stats and list
        loadTodoStats();
        loadTodos();

        // Add todo functionality
        setupTodoEventListeners();
    }

    async function loadTodoStats() {
        try {
            const stats = await api.get(`/todos/stats/${userId}`);
            const statsEl = document.getElementById('todoStats');

            statsEl.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${stats.total}</div>
                        <div class="stat-label">Total Tasks</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.pending}</div>
                        <div class="stat-label">Pending</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.completed}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${Math.round(stats.completion_rate)}%</div>
                        <div class="stat-label">Completion Rate</div>
                    </div>
                </div>
                ${stats.overdue > 0 ? `<div class="overdue-notice">⚠️ ${stats.overdue} overdue task${stats.overdue > 1 ? 's' : ''}</div>` : ''}
            `;
        } catch (error) {
            console.error('Failed to load todo stats:', error);
        }
    }

    async function loadTodos() {
        try {
            const todos = await api.get(`/todos/user/${userId}`);
            renderTodos(todos);
        } catch (error) {
            console.error('Failed to load todos:', error);
            document.getElementById('todoList').innerHTML = '<div class="error-message">Failed to load tasks. Please try again.</div>';
        }
    }

    function renderTodos(todos, filter = 'all', categoryFilter = 'all', searchTerm = '') {
        const todoListEl = document.getElementById('todoList');

        // Apply filters
        let filteredTodos = todos;
        if (filter === 'pending') {
            filteredTodos = todos.filter(todo => !todo.completed);
        } else if (filter === 'completed') {
            filteredTodos = todos.filter(todo => todo.completed);
        }

        if (categoryFilter !== 'all') {
            filteredTodos = filteredTodos.filter(todo => todo.category === categoryFilter);
        }

        // Apply search filter
        if (searchTerm) {
            filteredTodos = filteredTodos.filter(todo =>
                todo.title.toLowerCase().includes(searchTerm) ||
                (todo.description && todo.description.toLowerCase().includes(searchTerm)) ||
                todo.category.toLowerCase().includes(searchTerm) ||
                todo.priority.toLowerCase().includes(searchTerm)
            );
        }

        if (filteredTodos.length === 0) {
            const emptyMessage = filter === 'all' && categoryFilter === 'all'
                ? 'No tasks yet. Add your first task above!'
                : 'No tasks match your current filters.';
            todoListEl.innerHTML = `<div class="empty-todos">${emptyMessage}</div>`;
            return;
        }

        // Sort: pending first, then by priority, then by due date
        filteredTodos.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            if (a.due_date && b.due_date) {
                return new Date(a.due_date) - new Date(b.due_date);
            }
            return new Date(b.created_at) - new Date(a.created_at);
        });

        todoListEl.innerHTML = filteredTodos.map(todo => {
            const isOverdue = todo.due_date && new Date(todo.due_date) < new Date() && !todo.completed;
            const priorityClass = `priority-${todo.priority}`;
            const categoryEmoji = getCategoryEmoji(todo.category);

            return `
                <div class="todo-item ${todo.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-id="${todo.id}">
                    <div class="todo-main">
                        <label class="todo-checkbox">
                            <input type="checkbox" ${todo.completed ? 'checked' : ''} />
                        </label>
                        <div class="todo-content">
                            <div class="todo-title ${todo.completed ? 'strikethrough' : ''}">${todo.title}</div>
                            ${todo.description ? `<div class="todo-description">${todo.description}</div>` : ''}
                            <div class="todo-meta">
                                <span class="todo-category">${categoryEmoji} ${todo.category}</span>
                                <span class="todo-priority ${priorityClass}">${getPriorityText(todo.priority)}</span>
                                ${todo.due_date ? `<span class="todo-due ${isOverdue ? 'overdue-text' : ''}">${formatDueDate(todo.due_date)}</span>` : ''}
                            </div>
                        </div>
                        <div class="todo-actions">
                            <button class="edit-todo-btn" title="Edit">✏️</button>
                            <button class="delete-todo-btn" title="Delete">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for todo interactions after DOM update
        setupTodoItemEventListeners();
    }

    function setupTodoEventListeners() {
        // Add todo button
        document.getElementById('addTodoBtn').addEventListener('click', async () => {
            const title = document.getElementById('todoTitle').value.trim();
            if (!title) {
                showNotification('Please enter a task title', 'error');
                return;
            }

            const todoData = {
                user_id: userId,
                title: title,
                description: document.getElementById('todoDescription').value.trim(),
                priority: document.getElementById('todoPriority').value,
                category: document.getElementById('todoCategory').value,
                due_date: document.getElementById('todoDueDate').value || null
            };

            try {
                await api.post('/todos/add', todoData);
                showNotification('Task added successfully!', 'success');

                // Clear form
                document.getElementById('todoTitle').value = '';
                document.getElementById('todoDescription').value = '';
                document.getElementById('todoDueDate').value = '';

                // Reload todos and stats
                loadTodos();
                loadTodoStats();
            } catch (error) {
                showNotification('Failed to add task', 'error');
            }
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                const categoryFilter = document.querySelector('.category-filter.active').dataset.category;
                loadTodos().then(todos => renderTodos(todos, filter, categoryFilter));
            });
        });

        // Category filter buttons
        document.querySelectorAll('.category-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const categoryFilter = btn.dataset.category;
                const filter = document.querySelector('.filter-btn.active').dataset.filter;
                loadTodos().then(todos => renderTodos(todos, filter, categoryFilter));
            });
        });

        // Search functionality
        const todoSearch = document.getElementById('todoSearch');
        if (todoSearch) {
            todoSearch.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase().trim();
                loadTodos().then(todos => {
                    const filter = document.querySelector('.filter-btn.active').dataset.filter;
                    const categoryFilter = document.querySelector('.category-filter.active').dataset.category;
                    renderTodos(todos, filter, categoryFilter, searchTerm);
                });
            });
        }

        // Clear completed button
        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        if (clearCompletedBtn) {
            clearCompletedBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete all completed tasks?')) {
                    try {
                        const todos = await api.get(`/todos/user/${userId}`);
                        const completedTodos = todos.filter(todo => todo.completed);

                        // Delete all completed todos
                        const deletePromises = completedTodos.map(todo =>
                            api.delete(`/todos/delete/${todo.id}`)
                        );

                        await Promise.all(deletePromises);

                        showNotification(`${completedTodos.length} completed tasks deleted`, 'success');
                        loadTodos();
                        loadTodoStats();
                    } catch (error) {
                        showNotification('Failed to clear completed tasks', 'error');
                    }
                }
            });
        }
    }

    function setupTodoItemEventListeners() {
        // Use event delegation for all todo item interactions
        const todoList = document.getElementById('todoList');

        // Checkbox toggle - listen for changes on the checkbox input
        todoList.addEventListener('change', async (e) => {
            if (e.target.type === 'checkbox' && e.target.closest('.todo-item')) {
                const checkbox = e.target;
                const todoItem = e.target.closest('.todo-item');
                const todoId = todoItem.dataset.id;
                const completed = checkbox.checked;

                try {
                    await api.put(`/todos/update/${todoId}`, { completed });
                    todoItem.classList.toggle('completed', completed);
                    todoItem.querySelector('.todo-title').classList.toggle('strikethrough', completed);
                    loadTodoStats(); // Update stats
                    showNotification(completed ? 'Task completed! 🎉' : 'Task marked as pending', 'success');
                } catch (error) {
                    showNotification('Failed to update task', 'error');
                    checkbox.checked = !completed; // Revert checkbox
                }
            }
        });

        // Delete and edit buttons - listen for clicks
        todoList.addEventListener('click', async (e) => {
            // Delete buttons
            if (e.target.matches('.delete-todo-btn')) {
                const todoItem = e.target.closest('.todo-item');
                const todoId = todoItem.dataset.id;

                if (confirm('Are you sure you want to delete this task?')) {
                    try {
                        await api.delete(`/todos/delete/${todoId}`);
                        todoItem.remove();
                        loadTodoStats(); // Update stats
                        showNotification('Task deleted', 'success');
                    } catch (error) {
                        showNotification('Failed to delete task', 'error');
                    }
                }
            }

            // Edit buttons
            if (e.target.matches('.edit-todo-btn')) {
                const todoItem = e.target.closest('.todo-item');
                const todoId = todoItem.dataset.id;
                showEditTodoModal(todoId);
            }
        });
    }

    function getCategoryEmoji(category) {
        const emojis = {
            'general': '📝',
            'work': '💼',
            'personal': '👤',
            'health': '🏥',
            'learning': '📚',
            'relationships': '❤️'
        };
        return emojis[category] || '📝';
    }

    function getPriorityText(priority) {
        const texts = {
            'high': '🔴 High',
            'medium': '🟡 Medium',
            'low': '🟢 Low'
        };
        return texts[priority] || '🟡 Medium';
    }

    function formatDueDate(dueDate) {
        const date = new Date(dueDate);
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
        } else if (diffDays === 0) {
            return 'Due today';
        } else if (diffDays === 1) {
            return 'Due tomorrow';
        } else if (diffDays < 7) {
            return `Due in ${diffDays} days`;
        } else {
            return `Due ${formatDateIST(dueDate)}`;
        }
    }

    function showEditTodoModal(todoId) {
        // Get current todo data
        api.get(`/todos/user/${userId}`)
            .then(todos => {
                const todo = todos.find(t => t.id == todoId);
                if (!todo) {
                    showNotification('Todo not found', 'error');
                    return;
                }

                const modal = document.createElement('div');
                modal.className = 'modal edit-todo-modal';
                modal.innerHTML = `
                    <div class="modal-content" style="max-width: 500px;">
                        <h2>✏️ Edit Task</h2>
                        <form id="editTodoForm">
                            <div class="form-group">
                                <label for="editTitle">Title *</label>
                                <input type="text" id="editTitle" value="${todo.title}" maxlength="200" required />
                            </div>
                            <div class="form-group">
                                <label for="editDescription">Description</label>
                                <textarea id="editDescription" maxlength="500">${todo.description || ''}</textarea>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editPriority">Priority</label>
                                    <select id="editPriority">
                                        <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>🟢 Low Priority</option>
                                        <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>🟡 Medium Priority</option>
                                        <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>🔴 High Priority</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="editCategory">Category</label>
                                    <select id="editCategory">
                                        <option value="general" ${todo.category === 'general' ? 'selected' : ''}>📝 General</option>
                                        <option value="work" ${todo.category === 'work' ? 'selected' : ''}>💼 Work</option>
                                        <option value="personal" ${todo.category === 'personal' ? 'selected' : ''}>👤 Personal</option>
                                        <option value="health" ${todo.category === 'health' ? 'selected' : ''}>🏥 Health</option>
                                        <option value="learning" ${todo.category === 'learning' ? 'selected' : ''}>📚 Learning</option>
                                        <option value="relationships" ${todo.category === 'relationships' ? 'selected' : ''}>❤️ Relationships</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="editDueDate">Due Date</label>
                                <input type="datetime-local" id="editDueDate" value="${todo.due_date ? new Date(todo.due_date).toISOString().slice(0, 16) : ''}" />
                            </div>
                            <div class="modal-buttons">
                                <button type="button" id="cancelEditBtn">Cancel</button>
                                <button type="submit" id="saveEditBtn">💾 Save Changes</button>
                            </div>
                        </form>
                    </div>
                `;
                document.body.appendChild(modal);
                modal.classList.add('show');

                // Event listeners
                document.getElementById('cancelEditBtn').addEventListener('click', () => {
                    modal.classList.remove('show');
                    setTimeout(() => modal.remove(), 300);
                });

                document.getElementById('editTodoForm').addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const updatedData = {
                        title: document.getElementById('editTitle').value.trim(),
                        description: document.getElementById('editDescription').value.trim(),
                        priority: document.getElementById('editPriority').value,
                        category: document.getElementById('editCategory').value,
                        due_date: document.getElementById('editDueDate').value || null
                    };

                    if (!updatedData.title) {
                        showNotification('Title is required', 'error');
                        return;
                    }

                    try {
                        await api.put(`/todos/update/${todoId}`, updatedData);
                        showNotification('Task updated successfully!', 'success');

                        // Reload todos and stats
                        loadTodos();
                        loadTodoStats();

                        modal.classList.remove('show');
                        setTimeout(() => modal.remove(), 300);
                    } catch (error) {
                        showNotification('Failed to update task', 'error');
                    }
                });
            })
            .catch(() => showNotification('Failed to load task data', 'error'));
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
        // Remove existing notifications of the same type
        const existingNotifications = document.querySelectorAll(`.notification.${type}`);
        existingNotifications.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        notification.innerHTML = `
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" aria-label="Close notification">×</button>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : type === 'info' ? '#2196F3' : '#FF9800'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideInNotification 0.5s ease-out;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(notification);

        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOutNotification 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        });

        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutNotification 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }

    function getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        return icons[type] || 'ℹ️';
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

    // --- Compassionate Response Modal ---
    function showCompassionateResponseModal(messages, userSelectedEmotion, isLowMood, tools) {
        if (!messages || messages.length === 0) return;

        const modal = document.createElement('div');
        modal.className = 'modal compassionate-modal';
        const emotionEmoji = getEmotionEmoji(userSelectedEmotion);
        const emotionColor = isLowMood ? '#81c784' : '#667eea';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
                <div class="compassionate-header">
                    <h2 style="color: ${emotionColor};">${emotionEmoji} I'm Here to Support You</h2>
                    <p style="margin-bottom: 20px;">You've shared that you're feeling <strong>${userSelectedEmotion}</strong>. Here are some compassionate tools tailored to support you in this moment:</p>
                </div>

                <div class="compassionate-tools">
                    <!-- AI Messages -->
                    <div class="tool-section">
                        <h3>💬 Words of Encouragement</h3>
                        <div class="tool-content">
                            ${messages.map(msg => `<div class="encouragement-item">${msg}</div>`).join('')}
                        </div>
                    </div>

                    <!-- Quotes -->
                    <div class="tool-section">
                        <h3>📖 Comforting Quotes</h3>
                        <div class="tool-content">
                            ${tools.quotes.map(quote => `
                                <div class="quote-item">
                                    <blockquote>"${quote.text}"</blockquote>
                                    <cite>— ${quote.author}</cite>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Journaling Prompts -->
                    <div class="tool-section">
                        <h3>✍️ Guided Journaling Prompts</h3>
                        <div class="tool-content">
                            <p>Take a moment to reflect with these prompts:</p>
                            <ul class="prompts-list">
                                ${tools.prompts.map(prompt => `<li>${prompt}</li>`).join('')}
                            </ul>
                        </div>
                    </div>

                    <!-- Breathing Exercise -->
                    <div class="tool-section">
                        <h3>🧘 A Moment of Peace</h3>
                        <div class="tool-content breathing-section">
                            <h4>${tools.breathing.name}</h4>
                            <p>${tools.breathing.description}</p>
                            <div class="breathing-guide">
                                <h5>How to practice:</h5>
                                <ol>
                                    ${tools.breathing.steps.map(step => `<li>${step}</li>`).join('')}
                                </ol>
                                <p><strong>Duration:</strong> ${tools.breathing.duration}</p>
                                <p><strong>Benefits:</strong> ${tools.breathing.benefits}</p>
                                <button id="startBreathing" class="breathing-btn">🌬️ Start Breathing Exercise</button>
                            </div>
                        </div>
                    </div>

                    <!-- Music Recommendations -->
                    <div class="tool-section">
                        <h3>🎵 Calming Music & Soundscapes</h3>
                        <div class="tool-content">
                            <p>Here are some songs that might help soothe your mood:</p>
                            <div class="music-recommendations">
                                ${tools.music.map(song => `
                                    <div class="music-item">
                                        <div class="music-info">
                                            <strong>${song.title}</strong> by ${song.artist}<br>
                                            <small>${song.genre} • ${song.mood}</small>
                                        </div>
                                        <button class="music-search-btn" data-song="${song.title} ${song.artist}">🔍 Search</button>
                                    </div>
                                `).join('')}
                            </div>
                            <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
                                💡 Click "Search" to find these songs on your preferred music platform
                            </p>
                        </div>
                    </div>
                </div>

                <div class="compassionate-footer">
                    <button id="closeCompassionateModal" class="close-compassionate-btn">Thank you, I'm feeling better now 😊</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.add('show');

        // Add event listeners
        document.getElementById('closeCompassionateModal').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });

        // Breathing exercise functionality
        const startBreathingBtn = document.getElementById('startBreathing');
        if (startBreathingBtn) {
            startBreathingBtn.addEventListener('click', () => {
                startBreathingExercise(tools.breathing);
            });
        }

        // Music search functionality
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('music-search-btn')) {
                const songQuery = e.target.dataset.song;
                searchMusic(songQuery);
            }
        });
    }

    function startBreathingExercise(breathingData) {
        const modal = document.createElement('div');
        modal.className = 'modal breathing-exercise-modal';
        modal.innerHTML = `
            <div class="modal-content breathing-exercise-content" style="max-width: 600px; text-align: center;">
                <h2>🧘 ${breathingData.name}</h2>
                <p>${breathingData.description}</p>

                <div class="breathing-circle" id="breathingCircle">
                    <div class="breathing-instruction" id="breathingInstruction">Get ready...</div>
                </div>

                <div class="breathing-controls">
                    <button id="startExerciseBtn" class="exercise-btn">Start Exercise</button>
                    <button id="closeExerciseBtn" class="exercise-btn secondary">Close</button>
                </div>

                <div class="breathing-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <div class="progress-text" id="progressText">0 / ${breathingData.duration.split('-')[1] || breathingData.duration.split(' ')[0]} minutes</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.add('show');

        let exerciseInterval;
        let progressInterval;
        let currentStep = 0;
        let totalTime = 0;
        const maxTime = parseInt(breathingData.duration.split('-')[1] || breathingData.duration.split(' ')[0]) * 60; // Convert to seconds

        document.getElementById('startExerciseBtn').addEventListener('click', () => {
            startExercise();
        });

        document.getElementById('closeExerciseBtn').addEventListener('click', () => {
            stopExercise();
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });

        function startExercise() {
            const circle = document.getElementById('breathingCircle');
            const instruction = document.getElementById('breathingInstruction');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');

            document.getElementById('startExerciseBtn').style.display = 'none';

            let stepIndex = 0;
            const steps = breathingData.steps;
            let stepTime = 0;

            exerciseInterval = setInterval(() => {
                if (stepIndex < steps.length) {
                    instruction.textContent = steps[stepIndex];
                    stepTime++;

                    // Visual breathing animation
                    if (stepIndex % 2 === 0) { // Inhale steps
                        circle.style.transform = 'scale(1.2)';
                        circle.style.backgroundColor = '#81c784';
                    } else { // Exhale steps
                        circle.style.transform = 'scale(1)';
                        circle.style.backgroundColor = '#667eea';
                    }

                    if (stepTime >= 4) { // 4 seconds per step
                        stepIndex++;
                        stepTime = 0;
                    }
                } else {
                    // Loop back to beginning for continuous practice
                    stepIndex = 0;
                }

                totalTime++;
                const progressPercent = Math.min((totalTime / maxTime) * 100, 100);
                progressFill.style.width = `${progressPercent}%`;
                progressText.textContent = `${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, '0')} / ${Math.floor(maxTime / 60)}:00 minutes`;

                if (totalTime >= maxTime) {
                    stopExercise();
                    instruction.textContent = "Great job! Take a moment to notice how you feel.";
                    circle.style.transform = 'scale(1.1)';
                    circle.style.backgroundColor = '#ffd54f';
                }
            }, 1000);
        }

        function stopExercise() {
            if (exerciseInterval) {
                clearInterval(exerciseInterval);
                exerciseInterval = null;
            }
        }
    }

    function searchMusic(songQuery) {
        // Open music search in new tab - users can choose their preferred platform
        const searchUrls = [
            `https://www.youtube.com/search?q=${encodeURIComponent(songQuery)}`,
            `https://open.spotify.com/search/${encodeURIComponent(songQuery)}`,
            `https://music.apple.com/us/search?term=${encodeURIComponent(songQuery)}`
        ];

        // Show platform selection modal
        const platformModal = document.createElement('div');
        platformModal.className = 'modal platform-modal';
        platformModal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <h3>🎵 Choose your music platform</h3>
                <div class="platform-buttons">
                    <button class="platform-btn" data-url="${searchUrls[0]}">📺 YouTube</button>
                    <button class="platform-btn" data-url="${searchUrls[1]}">🎵 Spotify</button>
                    <button class="platform-btn" data-url="${searchUrls[2]}">🍎 Apple Music</button>
                </div>
                <button id="closePlatformModal" style="margin-top: 15px; padding: 8px 16px; background: #666; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
            </div>
        `;
        document.body.appendChild(platformModal);
        platformModal.classList.add('show');

        platformModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('platform-btn')) {
                window.open(e.target.dataset.url, '_blank');
                platformModal.classList.remove('show');
                setTimeout(() => platformModal.remove(), 300);
            } else if (e.target.id === 'closePlatformModal') {
                platformModal.classList.remove('show');
                setTimeout(() => platformModal.remove(), 300);
            }
        });
    }

    function getEmotionEmoji(emotion) {
        const emojis = {
            'happy': '😊', 'sad': '😢', 'angry': '😠', 'excited': '🤩',
            'calm': '😌', 'anxious': '😰', 'neutral': '😐'
        };
        return emojis[emotion] || '💭';
    }

    // --- Content Preview Function ---
    function getContentPreview(content) {
        if (!content) return '';

        // Split by lines and take first 3-5 lines
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const previewLines = lines.slice(0, 4); // Take first 4 lines for preview

        // If content is short, return as is
        if (lines.length <= 4) {
            return content;
        }

        // Join preview lines and add ellipsis
        return previewLines.join('\n') + '\n...';
    }

    // --- Journal Entry Modal ---
    function showJournalEntryModal(title, content, mood, theme, createdDate) {
        const modal = document.createElement('div');
        modal.className = 'modal journal-entry-modal';
        modal.innerHTML = `
            <div class="modal-content journal-modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>${title || "Untitled"}</h2>
                    <button id="closeEntryModal" class="close-modal-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="entry-metadata">
                        <span class="mood-tag">${getMoodEmoji(mood)} ${mood}</span>
                        <time class="entry-date">${formatDateTimeIST(createdDate)}</time>
                    </div>
                    <div class="entry-full-content" id="entryFullContent">
                        ${content.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Apply theme to modal content
        const modalContent = modal.querySelector('.journal-modal-content');
        applyThemeToModal(modalContent, theme);

        modal.classList.add('show');

        document.getElementById('closeEntryModal').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    function applyThemeToModal(modalElement, theme) {
        const contentArea = modalElement.querySelector('#entryFullContent');

        // Reset to default
        modalElement.style.background = '';
        contentArea.style.background = '';
        contentArea.style.backgroundImage = '';

        switch(theme) {
            case 'default':
                contentArea.style.background = 'repeating-linear-gradient(white, white 32px, #f8f9fa 33px)';
                break;
            case 'nature':
                modalElement.style.background = 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)';
                contentArea.style.background = 'rgba(255, 255, 255, 0.95)';
                contentArea.style.boxShadow = 'inset 0 0 20px rgba(76, 175, 80, 0.1)';
                contentArea.style.borderRadius = '10px';
                break;
            case 'abstract':
                modalElement.style.background = 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)';
                contentArea.style.background = 'rgba(255, 255, 255, 0.95)';
                contentArea.style.borderRadius = '10px';
                break;
            case 'minimalist':
                modalElement.style.background = '#fafafa';
                contentArea.style.background = 'white';
                contentArea.style.border = '1px solid #e0e0e0';
                contentArea.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                contentArea.style.borderRadius = '10px';
                break;
            case 'custom':
                const customImage = localStorage.getItem('customBgImage');
                if (customImage) {
                    modalElement.style.backgroundImage = `url(${customImage})`;
                    modalElement.style.backgroundSize = 'cover';
                    modalElement.style.backgroundPosition = 'center';
                    contentArea.style.background = 'rgba(255, 255, 255, 0.95)';
                    contentArea.style.backdropFilter = 'blur(10px)';
                    contentArea.style.borderRadius = '10px';
                }
                break;
        }
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
                        <span class="preview-date">${formatDateTimeIST(new Date())}</span>
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
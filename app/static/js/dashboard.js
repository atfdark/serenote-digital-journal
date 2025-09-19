(function () {
  "use strict";

  // --- DOM Element Cache ---
  const entriesEl = document.getElementById("entries");
  const newEntryBtn = document.getElementById("newEntryBtn");
  const calGrid = document.getElementById("calGrid");
  const calMeta = document.getElementById("calMeta");
  const todoForm = document.getElementById("todoForm");
  const todoInput = document.getElementById("todoInput");
  const todoList = document.getElementById("todoList");

  // --- Entries Widget ---
  const entriesWidget = {
    count: 0,
    sampleData: [
      { title: "Morning Reflection", time: "Today • 7:45 AM" },
      { title: "Walked in the park", time: "Yesterday • 6:12 PM" },
      { title: "Gratitude List", time: "2 days ago • 9:03 PM" },
    ],
    render(item) {
      const el = document.createElement("div");
      el.className = "item";

      const titleEl = document.createElement("div");
      titleEl.style.fontWeight = "700";
      titleEl.textContent = item.title;

      const timeEl = document.createElement("small");
      timeEl.textContent = item.time;

      el.append(titleEl, timeEl);
      entriesEl.prepend(el);
    },
    addNew() {
      this.count++;
      const now = new Date();
      this.render({
        title: `Untitled Entry #${this.count}`,
        time: now.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      });
    },
    init() {
      this.sampleData.forEach((item) => this.render(item));
      newEntryBtn.addEventListener("click", () => this.addNew());
      this.count = this.sampleData.length;
    },
  };

  // --- Calendar Widget ---
  const calendarWidget = {
    build(date = new Date()) {
      calGrid.innerHTML = "";
      const y = date.getFullYear();
      const m = date.getMonth();
      const today = new Date();

      calMeta.textContent = date.toLocaleString(undefined, {
        month: "long",
        year: "numeric",
      });

      const firstDayOfMonth = new Date(y, m, 1);
      const startDayOfWeek = firstDayOfMonth.getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();

      for (let i = 0; i < startDayOfWeek; i++) {
        calGrid.insertAdjacentHTML("beforeend", `<div class="cal-cell"></div>`);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement("div");
        cell.className = "cal-cell";
        cell.textContent = d;
        if (
          d === today.getDate() &&
          m === today.getMonth() &&
          y === today.getFullYear()
        ) {
          cell.classList.add("today");
          cell.setAttribute("aria-current", "date");
        }
        calGrid.appendChild(cell);
      }
    },
    init() {
      this.build();
    },
  };

  // --- To-Do Widget ---
  const todoWidget = {
    add(text) {
      const trimmedText = text.trim();
      if (!trimmedText) return;

      const row = document.createElement("div");
      row.className = "todo-item";

      row.innerHTML = `
        <input type="checkbox" aria-label="Mark '${trimmedText}' as done"/>
        <span style="flex:1">${trimmedText}</span>
        <button title="Remove task" aria-label="Remove '${trimmedText}'" style="border:none;background:transparent;cursor:pointer;opacity:.6">✕</button>
      `;

      row
        .querySelector('input[type="checkbox"]')
        .addEventListener("change", (e) => {
          row.classList.toggle("done", e.target.checked);
        });
      row
        .querySelector("button")
        .addEventListener("click", () => row.remove());

      todoList.prepend(row);
    },
    init() {
      todoForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.add(todoInput.value);
        todoInput.value = "";
      });

      ["Write a new entry", "Tag yesterday's mood", "Water plants in Mood Garden"].forEach((task) => this.add(task));
    },
  };

  // --- Mood Chart Widget ---
  const moodChartWidget = {
    chart: null,
    async init(userId) {
      try {
        const res = await fetch(`/dashboard/data/${userId}`);
        const data = await res.json();

        const labels = Object.keys(data);
        const values = Object.values(data);

        const ctx = document.getElementById("moodChart").getContext("2d");

        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
          type: "pie",
          data: {
            labels: labels,
            datasets: [
              {
                data: values,
                backgroundColor: [
                  "#ff6384", // Happy
                  "#36a2eb", // Sad
                  "#ffcd56", // Excited
                  "#4bc0c0", // Calm
                  "#9966ff", // Angry
                  "#c9cbcf", // Neutral
                ],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            animation: {
              animateRotate: true,
              animateScale: true,
              duration: 2000,
            },
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  font: { size: 14 },
                },
              },
            },
          },
        });
      } catch (err) {
        console.error("❌ Failed to load mood data:", err);
        document.querySelector(
          "#dashboard-widgets .widget-content"
        ).innerHTML = "<p>No mood data available.</p>";
      }
    },
  };

  // --- Initialize all widgets on page load ---
  document.addEventListener("DOMContentLoaded", () => {
    entriesWidget.init();
    calendarWidget.init();
    todoWidget.init();

    // Initialize Mood Chart
    const userId = localStorage.getItem("userId");
    if (userId) {
      moodChartWidget.init(userId);
    }
  });
})();

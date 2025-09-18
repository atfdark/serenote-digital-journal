function loadCalendar(container) {
  const calendarContainer = container;
  if (!calendarContainer) return;

  calendarContainer.innerHTML = `
    <div class="calendar-wrapper">
      <div class="calendar-header">
        <button id="prev">&#10094;</button>
        <h2 id="monthYear"></h2>
        <button id="next">&#10095;</button>
      </div>
      <div class="calendar-grid" id="calendarGrid">
        <div class="day-name">Sun</div>
        <div class="day-name">Mon</div>
        <div class="day-name">Tue</div>
        <div class="day-name">Wed</div>
        <div class="day-name">Thu</div>
        <div class="day-name">Fri</div>
        <div class="day-name">Sat</div>
      </div>
    </div>
  `;

  const monthYear = document.getElementById("monthYear");
  const grid = document.getElementById("calendarGrid");
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");

  let currentDate = new Date();

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYear.textContent = currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    grid.querySelectorAll(".date").forEach(d => d.remove());
    // also remove empty slots
    grid.querySelectorAll("div:not([class])").forEach(d => d.remove());


    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      grid.appendChild(empty);
    }

    for (let d = 1; d <= lastDate; d++) {
      const dateEl = document.createElement("div");
      dateEl.classList.add("date");
      dateEl.textContent = d;
      const date = new Date(year, month, d);
      dateEl.dataset.date = date.toISOString().split('T')[0];

      let today = new Date();
      if (
        d === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      ) {
        dateEl.classList.add("today");
      }

      dateEl.addEventListener('click', (e) => {
          const selectedDate = e.target.dataset.date;
          localStorage.setItem('selectedDate', selectedDate);
          document.querySelector('[data-page="journal"]').click();
      });

      grid.appendChild(dateEl);
    }
  }

  prev.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  next.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  renderCalendar();
}
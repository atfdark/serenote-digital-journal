// Handle sidebar navigation
const navItems = document.querySelectorAll(".sidebar nav ul li");
const content = document.getElementById("content");

navItems.forEach(item => {
  item.addEventListener("click", () => {
    // remove active from all
    navItems.forEach(i => i.classList.remove("active"));
    // add active to current
    item.classList.add("active");

    // load content
    const page = item.getAttribute("data-page");
    if (page === "dashboard") {
      content.innerHTML = "<h1>📊 Dashboard</h1><p>Overview of your activities.</p>";
    } else if (page === "journal") {
      content.innerHTML = "<h1>📖 Journal</h1><p>Write and reflect your thoughts.</p>";
    } else if (page === "voice") {
      content.innerHTML = "<h1>🎙 Voice Notes</h1><p>Record and revisit your voice entries.</p>";
    } else if (page === "mood") {
      content.innerHTML = "<h1>🌱 Mood Garden</h1><p>Track your moods like a blooming garden.</p>";
    }
  });
});

// Search bar functionality (demo)
document.getElementById("searchBar").addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  content.innerHTML = `<h1>🔍 Searching...</h1><p>You searched for: <b>${query}</b></p>`;
});

async function fetchGarden(userId) {
  try {
    const res = await fetch(`http://localhost:8080/getGarden?userId=${userId}`);
    if (!res.ok) {
      throw new Error('Failed to fetch garden data');
    }
    return await res.json();
  } catch (err) {
    console.error('Error fetching garden:', err);
    return null;
  }
}

async function logMood(userId, moodType, intensity) {
  try {
    const res = await fetch('http://localhost:8080/logMood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, moodType, intensity })
    });
    if (!res.ok) {
      throw new Error('Failed to log mood');
    }
    return await res.json();
  } catch (err) {
    console.error('Error logging mood:', err);
    return null;
  }
}

function renderGarden(gardenData, targetElement) {
  if (!gardenData || !targetElement) return;

  targetElement.innerHTML = ''; // Clear previous state
  targetElement.className = 'mood-garden'; // Reset class name
  targetElement.classList.add(gardenData.environment.sky.toLowerCase()); // e.g., 'clearday', 'rainy'

  const vibeElement = document.createElement('div');
  vibeElement.className = 'garden-vibe';
  vibeElement.textContent = `Vibe: ${gardenData.overallVibe}`;
  targetElement.appendChild(vibeElement);

  gardenData.elements.forEach(element => {
    const el = document.createElement('div');
    el.className = 'garden-element';
    el.style.left = `${element.position.x}%`;
    el.style.top = `${element.position.y}%`;
    el.style.transform = `scale(${0.5 + (element.attributes.growthStage * 0.5)})`;
    el.style.opacity = element.attributes.health;

    const asset = document.createElement('div');
    asset.className = `asset ${element.assetKey.toLowerCase()}`;
    asset.textContent = element.assetKey;
    asset.title = `Mood: ${element.linkedMood}\nGrowth: ${Math.round(element.attributes.growthStage * 100)}%\nHealth: ${Math.round(element.attributes.health * 100)}%`;

    el.appendChild(asset);
    targetElement.appendChild(el);
  });
}

class MoodGarden {
   constructor(container, userId) {
       this.container = container;
       this.userId = userId;
       this.gardenData = null;
       this.isWatering = false;
       this.audioContext = null;
       this.soundEnabled = localStorage.getItem('gardenSounds') !== 'false';

       this.init();
   }

   async init() {
       await this.loadGarden();
       this.setupEventListeners();
       this.startSeasonalEffects();
       this.setupAccessibility();
   }

   async loadGarden(animateGrowth = true) {
       try {
           const response = await fetch(`/garden/${this.userId}`);
           if (!response.ok) throw new Error('Failed to load garden');
           const newGardenData = await response.json();

           // Store old growth stages for animation
           const oldGrowthStages = {};
           if (this.gardenData && this.gardenData.flowers_data) {
               this.gardenData.flowers_data.forEach(flower => {
                   oldGrowthStages[flower.id] = flower.growth_stage;
               });
           }

           this.gardenData = newGardenData;
           this.render(animateGrowth);

           // Animate growth for changed flowers if not initial load
           if (!animateGrowth && oldGrowthStages) {
               setTimeout(() => {
                   this.gardenData.flowers_data.forEach(flower => {
                       const oldStage = oldGrowthStages[flower.id];
                       if (oldStage !== undefined && oldStage !== flower.growth_stage) {
                           this.animateFlowerGrowth(flower.id, oldStage, flower.growth_stage);
                       }
                   });
               }, 500);
           }
       } catch (error) {
           console.error('Error loading garden:', error);
           this.showError('Failed to load your mood garden');
       }
   }

   render(animateGrowth = true) {
       if (!this.gardenData) return;

       this.container.innerHTML = '';
       this.container.className = `mood-garden ${this.gardenData.current_season}`;

       // Stats Panel
       this.renderStatsPanel();

       // Watering Can
       this.renderWateringCan();

       // Water Level Indicator
       this.renderWaterLevel();

       // Flowers
       this.renderFlowers(animateGrowth);

       // Seasonal Particles
       this.renderSeasonalParticles();
   }

   renderStatsPanel() {
       const panel = document.createElement('div');
       panel.className = 'garden-stats-panel';

       const flowers = this.gardenData.flowers_data || [];
       const bloomedCount = flowers.filter(f => f.growth_stage >= 1.0).length;

       panel.innerHTML = `
           <h3>🌱 Garden Stats</h3>
           <div class="stat"><span>Flowers:</span> <span class="stat-value">${this.gardenData.flowers}</span></div>
           <div class="stat"><span>Blooms:</span> <span class="stat-value">${bloomedCount}</span></div>
           <div class="stat"><span>Streak:</span> <span class="stat-value">${this.gardenData.watering_streak} days</span></div>
           <div class="stat"><span>Season:</span> <span class="stat-value">${this.gardenData.current_season}</span></div>
       `;

       this.container.appendChild(panel);
   }

   renderWateringCan() {
       const can = document.createElement('div');
       can.className = 'watering-can';
       can.innerHTML = '🚰';
       can.title = 'Water your garden (click to water)';

       // Check if already watered today
       const today = new Date().toDateString();
       const lastWatered = this.gardenData.last_watered ?
           new Date(this.gardenData.last_watered).toDateString() : null;

       if (lastWatered === today) {
           can.classList.add('disabled');
           can.title = 'Garden already watered today! Come back tomorrow.';
       }

       can.addEventListener('click', () => this.waterGarden());
       this.container.appendChild(can);
   }

   renderWaterLevel() {
       const level = document.createElement('div');
       level.className = 'water-level';

       const fill = document.createElement('div');
       fill.className = 'water-fill';
       fill.style.width = `${this.gardenData.water_level}%`;

       const text = document.createElement('div');
       text.className = 'water-text';
       text.textContent = `${this.gardenData.water_level}%`;

       level.appendChild(fill);
       level.appendChild(text);
       this.container.appendChild(level);
   }

   renderFlowers(animateGrowth = true) {
       const flowers = this.gardenData.flowers_data || [];

       flowers.forEach((flowerData, index) => {
           const flower = document.createElement('div');
           flower.className = 'flower';
           flower.style.left = `${flowerData.position_x}%`;
           flower.style.top = `${flowerData.position_y}%`;
           flower.dataset.flowerId = flowerData.id;
           flower.dataset.mood = flowerData.mood_type;

           // Determine growth stage
           let stage = 'seed';
           if (flowerData.growth_stage >= 0.8) stage = 'bloom';
           else if (flowerData.growth_stage >= 0.4) stage = 'bud';
           else if (flowerData.growth_stage >= 0.1) stage = 'sprout';

           flower.classList.add(stage);

           // Create flower structure
           const stem = document.createElement('div');
           stem.className = 'stem';
           flower.appendChild(stem);

           const center = document.createElement('div');
           center.className = 'center';
           flower.appendChild(center);

           if (stage !== 'seed') {
               const petals = document.createElement('div');
               petals.className = `petals ${flowerData.flower_type}`;
               flower.appendChild(petals);
           }

           // Size based on growth stage
           const size = 20 + (flowerData.growth_stage * 40);
           flower.style.width = `${size}px`;
           flower.style.height = `${size}px`;

           // Health opacity
           flower.style.opacity = flowerData.health;

           // Tooltip
           flower.title = `${flowerData.mood_type} → ${flowerData.flower_type}\nGrowth: ${Math.round(flowerData.growth_stage * 100)}%\nBlooms: ${flowerData.bloom_count}`;

           flower.addEventListener('click', () => this.showFlowerDetails(flowerData));

           // Add growth animation on load
           if (animateGrowth) {
               flower.classList.add('quick-grow');
               flower.style.animationDelay = `${index * 0.2}s`;
           }

           this.container.appendChild(flower);
       });
   }

   renderSeasonalParticles() {
       const particles = document.createElement('div');
       particles.className = 'seasonal-particles';

       // Create 20 particles
       for (let i = 0; i < 20; i++) {
           const particle = document.createElement('div');
           particle.className = `particle ${this.gardenData.current_season}`;
           particle.style.left = `${Math.random() * 100}%`;
           particle.style.width = `${2 + Math.random() * 4}px`;
           particle.style.height = particle.style.width;
           particle.style.animationDelay = `${Math.random() * 6}s`;
           particle.style.animationDuration = `${6 + Math.random() * 4}s`;
           particles.appendChild(particle);
       }

       this.container.appendChild(particles);
   }

   animateFlowerGrowth(flowerId, oldGrowthStage, newGrowthStage) {
       const flower = this.container.querySelector(`[data-flower-id="${flowerId}"]`);
       if (!flower) return;

       // Determine growth animation based on stage progression
       let animationClass = '';

       if (oldGrowthStage < 0.1 && newGrowthStage >= 0.1) {
           animationClass = 'growing-seed-to-sprout';
       } else if (oldGrowthStage < 0.4 && newGrowthStage >= 0.4) {
           animationClass = 'growing-sprout-to-bud';
       } else if (oldGrowthStage < 0.8 && newGrowthStage >= 0.8) {
           animationClass = 'growing-bud-to-bloom';
       }

       if (animationClass) {
           flower.classList.add(animationClass);

           // Remove animation class after animation completes
           setTimeout(() => {
               flower.classList.remove(animationClass);
               // Update flower appearance after animation
               this.updateFlowerAppearance(flower, newGrowthStage);
           }, 2000);
       } else {
           // Just update appearance for minor growth
           this.updateFlowerAppearance(flower, newGrowthStage);
       }
   }

   updateFlowerAppearance(flowerElement, growthStage) {
       // Update size
       const size = 20 + (growthStage * 40);
       flowerElement.style.width = `${size}px`;
       flowerElement.style.height = `${size}px`;

       // Update stage class
       flowerElement.classList.remove('seed', 'sprout', 'bud', 'bloom');
       let stage = 'seed';
       if (growthStage >= 0.8) stage = 'bloom';
       else if (growthStage >= 0.4) stage = 'bud';
       else if (growthStage >= 0.1) stage = 'sprout';
       flowerElement.classList.add(stage);

       // Add petals if needed
       const flowerData = this.gardenData.flowers_data.find(f => f.id == flowerElement.dataset.flowerId);
       if (flowerData && stage !== 'seed') {
           let petals = flowerElement.querySelector('.petals');
           if (!petals) {
               petals = document.createElement('div');
               petals.className = `petals ${flowerData.flower_type}`;
               flowerElement.appendChild(petals);
           }
       }
   }

   async waterGarden() {
       if (this.isWatering) return;

       const can = this.container.querySelector('.watering-can');
       if (can.classList.contains('disabled')) {
           this.showNotification('Garden already watered today! 🌱', 'info');
           return;
       }

       this.isWatering = true;
       can.classList.add('watering');

       try {
           const response = await fetch(`/garden/water/${this.userId}`, { method: 'POST' });
           const result = await response.json();

           if (result.already_watered) {
               this.showNotification(result.message, 'info');
               can.classList.add('disabled');
               return;
           }

           // Play watering sound
           this.playSound('water');

           // Animate water drops
           this.animateWatering();

           // Update water level
           this.gardenData.water_level = result.water_level;
           this.gardenData.watering_streak = result.watering_streak;
           this.updateWaterLevel();

           // Show rewards
           if (result.rewards && result.rewards.length > 0) {
               result.rewards.forEach(reward => {
                   setTimeout(() => this.showNotification(reward, 'success'), Math.random() * 1000);
               });
           }

           // Check for new achievements
           if (result.new_achievements && result.new_achievements.length > 0) {
               result.new_achievements.forEach(achievement => {
                   setTimeout(() => this.showAchievement(achievement), 2000 + Math.random() * 1000);
               });
           }

           // Refresh garden data without growth animation (watering just boosts existing)
           setTimeout(() => this.loadGarden(false), 2000);

       } catch (error) {
           console.error('Error watering garden:', error);
           this.showNotification('Failed to water garden', 'error');
       } finally {
           this.isWatering = false;
           can.classList.remove('watering');
       }
   }

   animateWatering() {
       const effect = document.createElement('div');
       effect.className = 'watering-effect';

       for (let i = 0; i < 15; i++) {
           const drop = document.createElement('div');
           drop.className = 'water-drop';
           drop.style.left = `${20 + Math.random() * 60}%`;
           drop.style.animationDelay = `${Math.random() * 0.5}s`;
           effect.appendChild(drop);
       }

       this.container.appendChild(effect);
       setTimeout(() => effect.remove(), 1500);
   }

   updateWaterLevel() {
       const fill = this.container.querySelector('.water-fill');
       const text = this.container.querySelector('.water-text');

       if (fill && text) {
           fill.style.width = `${this.gardenData.water_level}%`;
           text.textContent = `${this.gardenData.water_level}%`;
       }
   }

   showFlowerDetails(flowerData) {
       const modal = document.createElement('div');
       modal.className = 'modal flower-detail-modal';
       modal.innerHTML = `
           <div class="modal-content" style="max-width: 400px; text-align: center;">
               <div style="font-size: 4em; margin: 20px 0;">${this.getFlowerEmoji(flowerData.flower_type)}</div>
               <h2 style="color: ${this.getFlowerColor(flowerData.flower_type)};">${flowerData.mood_type} Flower</h2>
               <p><strong>Type:</strong> ${flowerData.flower_type}</p>
               <p><strong>Growth:</strong> ${Math.round(flowerData.growth_stage * 100)}%</p>
               <p><strong>Health:</strong> ${Math.round(flowerData.health * 100)}%</p>
               <p><strong>Blooms:</strong> ${flowerData.bloom_count}</p>
               <p style="font-style: italic; color: #666;">${this.getFlowerDescription(flowerData.mood_type)}</p>
               <button id="closeFlowerDetail" style="padding: 10px 20px; background: ${this.getFlowerColor(flowerData.flower_type)}; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 15px;">Close</button>
           </div>
       `;
       document.body.appendChild(modal);
       modal.classList.add('show');

       document.getElementById('closeFlowerDetail').addEventListener('click', () => {
           modal.classList.remove('show');
           setTimeout(() => modal.remove(), 300);
       });
   }

   showAchievement(achievementId) {
       const achievements = {
           'first_five': { name: 'First Five', icon: '🌸', desc: 'Grew your first 5 flowers!' },
           'first_bloom': { name: 'First Bloom', icon: '🌺', desc: 'Witnessed your first flower bloom!' },
           'week_warrior': { name: 'Week Warrior', icon: '⚔️', desc: 'Watered for 7 consecutive days!' },
           'dedicated_gardener': { name: 'Dedicated Gardener', icon: '👩‍🌾', desc: 'Watered 50 times!' }
       };

       const achievement = achievements[achievementId];
       if (!achievement) return;

       const notification = document.createElement('div');
       notification.className = 'achievement-notification';
       notification.innerHTML = `
           <div style="display: flex; align-items: center; gap: 10px;">
               <span style="font-size: 2em;">${achievement.icon}</span>
               <div>
                   <strong>${achievement.name}</strong><br>
                   <small>${achievement.desc}</small>
               </div>
           </div>
       `;

       document.body.appendChild(notification);
       setTimeout(() => notification.remove(), 5000);
   }

   showNotification(message, type = 'info') {
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

   playSound(type) {
       if (!this.soundEnabled || !window.AudioContext) return;

       if (!this.audioContext) {
           this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
       }

       const oscillator = this.audioContext.createOscillator();
       const gainNode = this.audioContext.createGain();

       oscillator.connect(gainNode);
       gainNode.connect(this.audioContext.destination);

       if (type === 'water') {
           oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
           oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.5);
           gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
           gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
           oscillator.start();
           oscillator.stop(this.audioContext.currentTime + 0.5);
       }
   }

   startSeasonalEffects() {
       // Update seasonal effects every hour
       setInterval(() => {
           const now = new Date();
           const hour = now.getHours();
           const season = this.gardenData.current_season;

           // Adjust background based on time of day
           if (hour >= 6 && hour < 12) {
               this.container.style.filter = 'brightness(1.1) saturate(1.2)';
           } else if (hour >= 12 && hour < 18) {
               this.container.style.filter = 'brightness(1.0) saturate(1.0)';
           } else {
               this.container.style.filter = 'brightness(0.9) saturate(0.8)';
           }
       }, 3600000); // Every hour
   }

   setupEventListeners() {
       // Keyboard navigation
       this.container.addEventListener('keydown', (e) => {
           if (e.key === 'Enter' || e.key === ' ') {
               const can = this.container.querySelector('.watering-can');
               if (can && !can.classList.contains('disabled')) {
                   this.waterGarden();
               }
           }
       });

       // Touch feedback for mobile
       if ('vibrate' in navigator) {
           this.container.addEventListener('touchstart', () => {
               navigator.vibrate(50);
           });
       }
   }

   setupAccessibility() {
       this.container.setAttribute('role', 'application');
       this.container.setAttribute('aria-label', 'Interactive Mood Garden');

       const flowers = this.container.querySelectorAll('.flower');
       flowers.forEach((flower, index) => {
           flower.setAttribute('tabindex', '0');
           flower.setAttribute('aria-label', `Flower ${index + 1}: ${flower.dataset.mood} mood`);
       });
   }

   getFlowerEmoji(type) {
       const emojis = {
           'sunflower': '🌻', 'lily': '🌸', 'rose': '🌹', 'tulip': '🌷',
           'lavender': '💜', 'daisy': '🌼', 'forget-me-not': '🌺', 'chamomile': '🌼'
       };
       return emojis[type] || '🌸';
   }

   getFlowerColor(type) {
       const colors = {
           'sunflower': '#FFC107', 'lily': '#E91E63', 'rose': '#F44336',
           'tulip': '#9C27B0', 'lavender': '#967BB6', 'daisy': '#FFC107'
       };
       return colors[type] || '#4CAF50';
   }

   getFlowerDescription(mood) {
       const descriptions = {
           'happy': 'A bright flower that grows with your joyful moments!',
           'sad': 'A delicate bloom that helps process emotions gently.',
           'angry': 'A passionate flower that channels intense feelings.',
           'calm': 'A serene bloom that reflects peaceful states.',
           'excited': 'An energetic flower that captures your enthusiasm!',
           'anxious': 'A soothing flower that grows through uncertainty.'
       };
       return descriptions[mood] || 'A beautiful flower representing your emotions.';
   }

   showError(message) {
       this.container.innerHTML = `
           <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666;">
               <div style="font-size: 3em; margin-bottom: 20px;">🌱</div>
               <h3>Oops!</h3>
               <p>${message}</p>
               <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer;">Try Again</button>
           </div>
       `;
   }
}

// Legacy functions for backward compatibility
async function fetchGarden(userId) {
   const garden = new MoodGarden(document.querySelector('.mood-garden'), userId);
   return garden.gardenData;
}

async function logMood(userId, moodType, intensity = 1.0) {
   try {
     const res = await fetch('/garden/', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ user_id: userId, mood: moodType, intensity })
     });
     if (!res.ok) throw new Error('Failed to log mood');
     return await res.json();
   } catch (err) {
     console.error('Error logging mood:', err);
     return null;
   }
}

function renderGarden(gardenData, targetElement) {
   if (!targetElement) return;
   new MoodGarden(targetElement, gardenData.user_id);
}

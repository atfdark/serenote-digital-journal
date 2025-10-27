# 🌸 Serenote – Your Digital Journaling Companion

A compassionate digital journaling app that helps you **track your thoughts, emotions, and personal growth** through beautiful, gamified experiences.

---

## ✨ Features

### 📖 Intelligent Journaling
- **Text Entries** – Write and customize your journals with themes, fonts, and colors  
- **Voice Notes** – Record audio thoughts with built-in waveform visualization  
- **Time Capsules** – Lock entries to be opened on future dates  
- **Mood Tracking** – Associate emotions with each entry for deeper self-reflection  

### 🌱 Mood Garden Gamification
- **Emotional Growth** – Watch flowers bloom based on your mood patterns  
- **Seasonal Themes** – Experience spring, summer, autumn, and winter transformations  
- **Achievements** – Unlock badges for journaling milestones and consistency  
- **Watering Mechanics** – Keep your garden thriving through daily care  

### 🧘 Compassionate AI Support
- **Emotion Recognition** – AI analyzes entries to offer tailored support  
- **Guided Prompts** – Personalized journaling suggestions based on your mood  
- **Breathing Exercises** – Interactive breathing guides for emotional regulation  
- **Music Recommendations** – Curated playlists matching your feelings  
- **Comforting Quotes** – Inspirational and uplifting messages  

### 📊 Analytics & Insights
- **Mood Dashboard** – Visualize emotional trends over time  
- **Journaling Streaks** – Track your writing consistency  
- **Progress Tracking** – Reflect on your personal growth journey  
- **Export Functionality** – Generate beautiful PDF exports of your journal  

### ✅ Todo Management
- **Task Organization** – Create, edit, and manage daily tasks  
- **Priority Levels** – Categorize tasks by urgency  
- **Due Dates** – Set reminders for upcoming or overdue tasks  
- **Category System** – Organize by work, personal, health, and more  

---

## 🚀 Quick Start

### Prerequisites
- Python **3.8+**
- **PostgreSQL** (optional; SQLite fallback available)
- **OpenAI API Key** (for AI features)

### Installation

```bash
# 1️⃣ Clone the repository
git clone https://github.com/yourusername/serenote.git
cd serenote

# 2️⃣ Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate

# 3️⃣ Install dependencies
pip install -r requirements.txt

# 4️⃣ Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 5️⃣ Initialize the database
python setup_db.py

# 6️⃣ Run the application
python run.py

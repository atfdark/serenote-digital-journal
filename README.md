# Serenote 🌱

A compassionate digital journaling companion that helps you track your thoughts, emotions, and personal growth through beautiful, gamified experiences.

![Serenote Banner](https://via.placeholder.com/800x200/8b7355/ffffff?text=Serenote+-+Your+Digital+Journal+Companion)

## ✨ Features

### 📖 **Intelligent Journaling**
- **Text Entries**: Write and customize your journal entries with themes, fonts, and colors
- **Voice Notes**: Record audio thoughts with built-in waveform visualization
- **Time Capsules**: Lock entries to be opened on future dates
- **Mood Tracking**: Associate emotions with each entry for deeper self-reflection

### 🌱 **Mood Garden Gamification**
- **Emotional Growth**: Watch flowers bloom based on your mood patterns
- **Seasonal Themes**: Experience spring, summer, autumn, and winter garden transformations
- **Achievement System**: Unlock badges for journaling milestones and consistency
- **Watering Mechanics**: Maintain your garden's health through daily care

### 🧘 **Compassionate AI Support**
- **Emotion Recognition**: AI analyzes your entries to provide tailored support
- **Guided Prompts**: Get personalized journaling suggestions based on your mood
- **Breathing Exercises**: Interactive breathing guides for different emotional states
- **Music Recommendations**: Curated playlists to match your current feelings
- **Comforting Quotes**: Inspirational messages from various sources

### 📊 **Analytics & Insights**
- **Mood Dashboard**: Visualize your emotional patterns over time
- **Journaling Streaks**: Track your consistency and writing habits
- **Progress Tracking**: Monitor your personal growth journey
- **Export Functionality**: Generate beautiful PDF exports of your journal

### ✅ **Todo Management**
- **Task Organization**: Create, edit, and manage your daily tasks
- **Priority Levels**: High, medium, and low priority categorization
- **Due Dates**: Set deadlines and get reminders for overdue tasks
- **Category System**: Organize tasks by work, personal, health, etc.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- PostgreSQL (optional - SQLite fallback available)
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/serenote.git
   cd serenote
Create virtual environment

python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
Install dependencies

pip install -r requirements.txt
Set up environment variables

cp .env.example .env
# Edit .env with your configuration
Initialize the database

python setup_db.py
Run the application

python run.py
Open your browser

http://localhost:5000
🔧 Configuration
Environment Variables (.env)
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/serenote
# Or for SQLite (fallback): DATABASE_URL=sqlite:///serenote.db

# OpenAI Configuration (for AI features)
OPENAI_API_KEY=your_openai_api_key_here

# Flask Configuration
SECRET_KEY=your_super_secret_key_here
FLASK_ENV=development
Database Setup
The application supports both PostgreSQL and SQLite:

PostgreSQL: Recommended for production deployments
SQLite: Automatic fallback for development/local use
🏗️ Architecture
Backend Structure
app/
├── __init__.py          # Flask app factory
├── database/
│   ├── db.py           # Database configuration
│   └── models.py       # SQLAlchemy models
├── routes/
│   ├── auth_routes.py      # Authentication
│   ├── entry_routes.py     # Journal entries & AI
│   ├── garden_routes.py    # Mood garden
│   ├── todo_routes.py      # Todo management
│   ├── dashboard_routes.py # Analytics
│   └── view_routes.py      # Page rendering
└── static/
    ├── js/main.js         # Frontend logic
    └── css/               # Stylesheets
Database Schema
Users: Authentication and user management
Entries: Journal entries (text and voice)
Garden: Mood garden state and achievements
GardenFlower: Individual flower growth tracking
Todo: Task management system
🌐 Deployment
Vercel (Recommended)
Connect your GitHub repository to Vercel
Set environment variables in Vercel dashboard
Deploy automatically on every push
Manual Deployment
# Using Gunicorn for production
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app
🎨 Customization
Themes & Styling
Built-in Themes: Default, Nature, Abstract, Minimalist
Custom Backgrounds: Upload your own images
Font Options: Multiple typography choices
Color Customization: Personalize text and background colors
Garden Configuration
Mood-Flower Mapping: Customize which flowers represent different emotions
Seasonal Themes: Modify color schemes for each season
Achievement System: Add new badges and milestones
🤝 Contributing
We welcome contributions! Please follow these steps:

Fork the repository
Create a feature branch: git checkout -b feature/amazing-feature
Commit your changes: git commit -m 'Add amazing feature'
Push to the branch: git push origin feature/amazing-feature
Open a Pull Request
Development Guidelines
Follow PEP 8 style guidelines
Write tests for new features
Update documentation for API changes
Ensure responsive design for mobile devices
📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
OpenAI: For providing the AI capabilities that power our compassionate responses
Flask: The lightweight web framework that powers our backend
Chart.js: For beautiful data visualizations
jsPDF: For PDF export functionality

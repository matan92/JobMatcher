# JobMatcher - AI-Powered Multi-Industry Recruitment Platform

![Python](https://img.shields.io/badge/Python-3.13-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)
![React](https://img.shields.io/badge/React-18-61dafb)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green)

AI-powered recruitment system supporting 13+ industries with semantic matching and automated resume parsing.

## ✨ Features

- 🤖 **AI Resume Parsing** - Automatic extraction using Ollama LLM
- 🎯 **Smart Matching** - Semantic similarity + rule-based scoring
- 🏢 **Multi-Industry** - Technology, Healthcare, Retail, Hospitality, and more
- 📊 **Match Analytics** - Detailed scoring breakdowns
- 🚀 **Fast Performance** - 300x optimization through caching

## 🛠️ Tech Stack

**Backend:**
- FastAPI
- MongoDB (Motor async driver)
- sentence-transformers
- Ollama (Qwen 2.5)

**Frontend:**
- React 18
- Tailwind CSS
- React Router

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- Node.js 18+
- MongoDB
- Ollama

### Backend Setup
\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
\`\`\`

### Frontend Setup
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

## 👤 Author

Matan Avnon
- GitHub: [@YOUR_USERNAME](https://github.com/matan92)
- LinkedIn: [Your Profile](https://linkedin.com/in/matan-avnon)

## 🙏 Acknowledgments

Built with FastAPI, React, and MongoDB

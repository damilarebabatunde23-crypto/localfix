# ⚡ LocalFix — Hyperlocal Trade & Artisan Mesh Platform

LocalFix is an open-source, full-stack trade and artisan service platform featuring real-time GPS worker tracking, multi-currency escrow protection, AI-powered diagnostic copilot, and in-app WebRTC voice and video calls.

---

## 🌟 Key Features

- **🛰️ Live Uber/InDrive-Style Worker Dispatch Tracking**: Real-time road navigation via OSRM, live vehicle rotation, speed dials, distance calculation, and ETA countdowns.
- **🛡️ Escrow Milestone Protection**: Transparent 2-party release, dispute mediation chambers, and automated audit trails.
- **🤖 AI Technical Trade Copilot**: Interactive multi-trade fault diagnosis with visual photo recognition and instant verified artisan recommendations.
- **📞 In-App WebRTC Voice & Video Calls**: Free, zero-dependency peer-to-peer calling with real-time Web Audio API voice level visualizers and 1-tap WhatsApp fallback.
- **🌍 Global Multi-Currency Support**: Instant localized pricing in USD ($), EUR (€), GBP (£), NGN (₦), CAD ($), AUD ($), and KES (KSh).
- **🎨 High-Contrast Light & Dark Themes**: Fully accessible, WCAG-compliant design with dynamic theme toggling.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion + Lucide Icons
- **Mapping**: Leaflet + React-Leaflet + OSRM Road Routing
- **Calling**: Native WebRTC (`getUserMedia`) + Web Audio API (`AnalyserNode`)

### Backend
- **Framework**: Django 5.0 + Django REST Framework
- **Asynchronous/Sockets**: Django Channels + Daphne ASGI
- **Static Asset Serving**: WhiteNoise 6.12 (Unified React SPA + REST API)
- **Deployment**: Ready for Render, Railway, or Vercel

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

---

## 🌐 Production Build & Deployment

To build the frontend and serve it directly from Django:
```bash
bash build.sh
```
Or deploy directly to **Render** using the included `render.yaml`.

---

## 📄 License
MIT License. Built with ❤️ for communities worldwide.

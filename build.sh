#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "🚀 [1/3] Building React Frontend with Vite..."
cd frontend
npm install
npm run build
cd ..

echo "📦 [2/3] Installing Python Backend dependencies..."
cd backend
pip install -r requirements.txt

echo "🗄️ [3/3] Running database migrations and collecting static files..."
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear

echo "✅ All-in-one build completed successfully!"

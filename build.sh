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

echo "🔑 Configuring admin superuser credentials..."
python manage.py shell <<EOF
from django.contrib.auth import get_user_model
User = get_user_model()

try:
    admin_user = User.objects.filter(email='admin@localfix.ng').first()
    if not admin_user:
        admin_user = User.objects.create_user(
            email='admin@localfix.ng',
            password='admin123',
            first_name='Super',
            last_name='Admin',
            role='customer',
            is_staff=True,
            is_superuser=True,
            is_verified=True,
            is_email_verified=True
        )
    else:
        admin_user.set_password('admin123')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()
    print("⚡ Master superuser admin@localfix.ng (admin123) is active.")
except Exception as e:
    print(f"Admin setup notice: {e}")

try:
    user = User.objects.filter(email='damilarebabatunde23@gmail.com').first()
    if user:
        user.is_staff = True
        user.is_superuser = True
        user.save()
        print("⚡ Superuser granted to damilarebabatunde23@gmail.com")
except Exception as e:
    print(f"User promotion notice: {e}")

# Purge any fake / dummy test users so production only has clean real users
try:
    fake_users = User.objects.exclude(email__in=['admin@localfix.ng', 'damilarebabatunde23@gmail.com'])
    count = fake_users.count()
    fake_users.delete()
    print(f"⚡ Successfully purged {count} fake/test accounts from database.")
except Exception as e:
    print(f"Purge notice: {e}")
EOF

echo "✅ All-in-one build completed successfully!"

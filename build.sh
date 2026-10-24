#!/usr/bin/env bash
# Builds the whole app for production. Render runs this on every deploy,
# and you can run it locally to test the production setup.
set -o errexit  # stop at the first failing command

# 1. Python packages
pip install -r requirements.txt

# 2. Build React into frontend/dist (index.html + assets/)
cd frontend
npm ci
npm run build
cd ..

# 3. Gather all static files (React's build + Django admin's CSS) into staticfiles/ for WhiteNoise
python manage.py collectstatic --no-input

# 4. Create or update the database tables
python manage.py migrate --no-input

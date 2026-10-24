"""
Django settings for Receipts.

Every secret or environment-specific value comes from environment variables
(a local `.env` file, or Render's Environment settings), never from this file.
See `.env.example` for the full list.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# The repo root (the folder holding manage.py).
BASE_DIR = Path(__file__).resolve().parent.parent

# Read `.env` into os.environ if it exists. On Render there is no .env file:
# the variables are set in the dashboard, and this line does nothing.
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    """Turn an env var like "True" / "false" / "1" into a real bool."""
    return os.environ.get(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


# ---- Security ----
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
DEBUG = env_bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = [h.strip() for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]

if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "dev-only-insecure-key"  # fine on your own machine, never deployed
    else:
        raise RuntimeError("DJANGO_SECRET_KEY is not set. Add it to .env or the Render dashboard.")

# Render puts the site's own hostname in this variable, so the hosted URL is allowed automatically.
RENDER_HOST = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_HOST:
    ALLOWED_HOSTS.append(RENDER_HOST)


# ---- Apps ----
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    # Ours (paypal_client is a plain Python package, not a Django app, so it isn't listed)
    "invoices",
    "disputes",
    "agent",
    "insights",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # WhiteNoise serves the built React files (and Django's own static files) straight from Django.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

# The React build output. `npm run build` in frontend/ writes index.html and assets/ here.
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        # Lets Django find React's index.html as a template.
        "DIRS": [FRONTEND_DIST],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# ---- Database ----
# SQLite: a single file, db.sqlite3, with no server to run. See CLAUDE.md §5 for the hosting plan.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# ---- Language and time ----
LANGUAGE_CODE = "en-gb"
TIME_ZONE = "Europe/London"
USE_I18N = True
USE_TZ = True  # store times in UTC, show them in London time


# ---- Static files ----
# Vite builds React with base "/static/", so its files are requested from /static/assets/...
STATIC_URL = "static/"
STATICFILES_DIRS = [FRONTEND_DIST] if FRONTEND_DIST.exists() else []
STATIC_ROOT = BASE_DIR / "staticfiles"  # where `collectstatic` gathers everything for Render
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}


# ---- Django REST Framework ----
REST_FRAMEWORK = {
    # JSON only, so the API never renders HTML pages.
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
}


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

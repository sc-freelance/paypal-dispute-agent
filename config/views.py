"""Project-wide views: the health check and the page that loads React."""

import os

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health(request):
    """GET /api/health/ : is the backend up, and which settings are filled in?

    Reports only True/False for each key, never the key itself, so it's safe to show
    in the browser (and in the demo video).
    """
    return Response(
        {
            "status": "ok",
            "app": "Receipts",
            "paypal_configured": bool(os.environ.get("PAYPAL_CLIENT_ID") and os.environ.get("PAYPAL_CLIENT_SECRET")),
            "anthropic_configured": bool(os.environ.get("ANTHROPIC_API_KEY")),
            "model": os.environ.get("ANTHROPIC_MODEL", ""),
            "demo_mode": os.environ.get("DEMO_MODE", "False").lower() == "true",
        }
    )


def spa(request, *args, **kwargs):
    """Every non-API URL returns React's index.html; React then decides what to show.

    ("SPA" = single-page app: one HTML page, with React swapping the content.)
    """
    if not (settings.FRONTEND_DIST / "index.html").exists():
        return HttpResponse(
            "The React app hasn't been built yet. Run `npm run build` in the frontend/ folder.",
            status=503,
            content_type="text/plain",
        )
    return render(request, "index.html")

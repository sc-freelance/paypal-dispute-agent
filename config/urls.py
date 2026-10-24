"""Which URL goes to which code.

Django checks these patterns top to bottom and uses the first match.
"""

from django.contrib import admin
from django.urls import path, re_path

from config import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", views.health, name="health"),
    # Each app's API routes get added here as we build them, e.g. path("api/invoices/", include("invoices.urls")).
    #
    # Catch-all, kept LAST: any other URL (/, /disputes, /invoices/42 ...) gets React's page.
    # It skips api/, admin/ and static/ so those never return HTML by mistake.
    re_path(r"^(?!api/|admin/|static/).*$", views.spa, name="spa"),
]

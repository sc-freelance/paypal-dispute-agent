"""Which URL goes to which code.

Django checks these patterns top to bottom and uses the first match.
"""

from django.contrib import admin
from django.urls import include, path, re_path

from agent import views as agent_views
from config import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", views.health, name="health"),
    path("api/invoices/", include("invoices.urls")),
    path("api/agent/chat/", agent_views.chat, name="agent-chat"),
    #
    # Catch-all, kept LAST: any other URL (/, /disputes, /invoices/42 ...) gets React's page.
    # It skips api/, admin/ and static/ so those never return HTML by mistake.
    re_path(r"^(?!api/|admin/|static/).*$", views.spa, name="spa"),
]

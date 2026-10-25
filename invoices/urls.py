from django.urls import path

from invoices import views

urlpatterns = [
    path("", views.invoice_list, name="invoice-list"),
    path("<int:pk>/approve/", views.invoice_approve, name="invoice-approve"),
    path("<int:pk>/reject/", views.invoice_reject, name="invoice-reject"),
]

from django.urls import path
from .views import (
    InvoiceListCreateView,
    InvoiceDetailView,
    InvoiceRetryView,
    InvoiceStatsView,
)

urlpatterns = [
    path('', InvoiceListCreateView.as_view(), name='invoice_list_create'),
    path('stats/', InvoiceStatsView.as_view(), name='invoice_stats'),
    path('<uuid:id>/', InvoiceDetailView.as_view(), name='invoice_detail'),
    path('<uuid:id>/retry/', InvoiceRetryView.as_view(), name='invoice_retry'),
]

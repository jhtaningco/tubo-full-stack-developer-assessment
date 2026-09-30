from django.urls import path
from .views import MockGovInvoiceView

urlpatterns = [
    path('invoices/', MockGovInvoiceView.as_view(), name='mock_gov_invoices'),
    path('invoices', MockGovInvoiceView.as_view(), name='mock_gov_invoices_noslash'),
]

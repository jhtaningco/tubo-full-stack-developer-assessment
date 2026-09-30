"""
URL configuration for tubo project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/invoices/', include('apps.invoices.urls')),
    path('api/processing/', include('apps.processing.urls')),
    path('mock-gov/', include('apps.mock_gov.urls')),
]

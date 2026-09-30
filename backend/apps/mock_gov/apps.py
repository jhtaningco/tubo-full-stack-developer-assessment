from django.apps import AppConfig


class MockGovConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.mock_gov'
    label = 'mock_gov'
    verbose_name = 'Mock Government API'

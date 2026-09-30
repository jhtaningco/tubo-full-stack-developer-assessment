from django.contrib import admin
from .models import ProcessingLog


@admin.register(ProcessingLog)
class ProcessingLogAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'attempt_number', 'status', 'http_status_code', 'started_at', 'ended_at')
    list_filter = ('status',)
    search_fields = ('invoice__invoice_number', 'error_message')
    ordering = ('-started_at',)
    readonly_fields = ('id', 'started_at')

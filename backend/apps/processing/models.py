import uuid
from django.db import models


class ProcessingLog(models.Model):
    """Logs each attempt to process/submit an invoice to the government API."""

    class Status(models.TextChoices):
        PROCESSING = 'PROCESSING', 'Processing'
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        'invoices.Invoice',
        on_delete=models.CASCADE,
        related_name='logs'
    )
    attempt_number = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices
    )
    http_status_code = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Processing Log'
        verbose_name_plural = 'Processing Logs'
        ordering = ['-started_at']

    def __str__(self):
        return f"Log #{self.attempt_number} for Invoice {self.invoice.invoice_number} - {self.status}"

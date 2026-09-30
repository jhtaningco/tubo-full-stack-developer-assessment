import uuid
from django.db import models
from django.conf import settings


class Invoice(models.Model):
    """Represents an electronic invoice submitted by a company."""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        SUBMITTED = 'SUBMITTED', 'Submitted'
        FAILED = 'FAILED', 'Failed'
        REJECTED = 'REJECTED', 'Rejected'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField()
    customer_name = models.CharField(max_length=255)
    customer_tax_id = models.CharField(max_length=100)
    customer_email = models.EmailField()
    currency = models.CharField(max_length=3, default='PHP')
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    idempotency_key = models.CharField(max_length=255, unique=True)
    retry_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'invoice_number'],
                name='unique_company_invoice_number'
            )
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.company}"


class InvoiceItem(models.Model):
    """Represents a line item on an invoice."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items'
    )
    description = models.CharField(max_length=500)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        verbose_name = 'Invoice Item'
        verbose_name_plural = 'Invoice Items'

    def __str__(self):
        return f"{self.description} (x{self.quantity}) - Invoice {self.invoice.invoice_number}"

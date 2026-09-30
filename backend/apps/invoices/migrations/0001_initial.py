import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Invoice',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('invoice_number', models.CharField(max_length=100)),
                ('invoice_date', models.DateField()),
                ('customer_name', models.CharField(max_length=255)),
                ('customer_tax_id', models.CharField(max_length=100)),
                ('customer_email', models.EmailField(max_length=254)),
                ('currency', models.CharField(default='PHP', max_length=3)),
                ('subtotal', models.DecimalField(decimal_places=2, max_digits=14)),
                ('tax_amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('total_amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('status', models.CharField(
                    choices=[
                        ('PENDING', 'Pending'),
                        ('PROCESSING', 'Processing'),
                        ('SUBMITTED', 'Submitted'),
                        ('FAILED', 'Failed'),
                        ('REJECTED', 'Rejected'),
                    ],
                    default='PENDING',
                    max_length=20,
                )),
                ('idempotency_key', models.CharField(max_length=255, unique=True)),
                ('retry_count', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invoices', to='accounts.company')),
            ],
            options={
                'verbose_name': 'Invoice',
                'verbose_name_plural': 'Invoices',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='invoice',
            constraint=models.UniqueConstraint(fields=['company', 'invoice_number'], name='unique_company_invoice_number'),
        ),
        migrations.CreateModel(
            name='InvoiceItem',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('description', models.CharField(max_length=500)),
                ('quantity', models.PositiveIntegerField()),
                ('unit_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('tax', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('line_total', models.DecimalField(decimal_places=2, max_digits=12)),
                ('invoice', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='invoices.invoice')),
            ],
            options={
                'verbose_name': 'Invoice Item',
                'verbose_name_plural': 'Invoice Items',
            },
        ),
    ]

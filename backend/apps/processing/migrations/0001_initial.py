import uuid
import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('invoices', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProcessingLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('attempt_number', models.PositiveIntegerField()),
                ('status', models.CharField(
                    choices=[
                        ('PROCESSING', 'Processing'),
                        ('SUCCESS', 'Success'),
                        ('FAILED', 'Failed'),
                    ],
                    max_length=20,
                )),
                ('http_status_code', models.IntegerField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('ended_at', models.DateTimeField(blank=True, null=True)),
                ('invoice', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='invoices.invoice')),
            ],
            options={
                'verbose_name': 'Processing Log',
                'verbose_name_plural': 'Processing Logs',
                'ordering': ['-started_at'],
            },
        ),
    ]

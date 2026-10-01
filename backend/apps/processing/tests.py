import json
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch, MagicMock
import urllib.error

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from celery.exceptions import Retry

from apps.accounts.models import Company
from apps.invoices.models import Invoice, InvoiceItem
from apps.processing.models import ProcessingLog
from apps.processing.tasks import submit_invoice_to_government_task, sweep_stale_processing_invoices_task

User = get_user_model()


class ProcessingTaskTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(
            name='Alpha Hardware',
            tax_id='123-456-789-000',
            email='alpha@hardware.ph'
        )
        self.invoice = Invoice.objects.create(
            company=self.company,
            invoice_number='INV-PROC-001',
            invoice_date='2026-10-01',
            customer_name='Beta Corp',
            customer_tax_id='987-654-321-000',
            customer_email='beta@corp.ph',
            subtotal=Decimal('1000.00'),
            tax_amount=Decimal('120.00'),
            total_amount=Decimal('1120.00'),
            status=Invoice.Status.PENDING,
            idempotency_key='hash_proc_001'
        )
        InvoiceItem.objects.create(
            invoice=self.invoice,
            description='Power Drill',
            quantity=1,
            unit_price=Decimal('1000.00'),
            tax=Decimal('120.00'),
            line_total=Decimal('1120.00')
        )

    @patch('urllib.request.urlopen')
    def test_successful_government_submission(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps({
            'status': 'SUCCESS',
            'government_reference_id': 'GOV-REF-12345'
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response

        result = submit_invoice_to_government_task(str(self.invoice.id))
        self.assertEqual(result['status'], 'SUBMITTED')

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.SUBMITTED)

        log = ProcessingLog.objects.filter(invoice=self.invoice).latest('started_at')
        self.assertEqual(log.status, ProcessingLog.Status.SUCCESS)
        self.assertEqual(log.http_status_code, 200)

    @patch('urllib.request.urlopen')
    def test_permanent_400_rejection_marks_rejected_no_retry(self, mock_urlopen):
        # Mock a 400 Bad Request HTTP error
        err_response = MagicMock()
        err_response.read.return_value = json.dumps({'error': 'Invalid customer TIN'}).encode('utf-8')
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url='http://mock-gov',
            code=400,
            msg='Bad Request',
            hdrs={},
            fp=err_response
        )

        result = submit_invoice_to_government_task(str(self.invoice.id))
        self.assertEqual(result['status'], 'REJECTED')

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.REJECTED)

        log = ProcessingLog.objects.filter(invoice=self.invoice).latest('started_at')
        self.assertEqual(log.status, ProcessingLog.Status.FAILED)
        self.assertEqual(log.http_status_code, 400)
        self.assertIn('Invalid customer TIN', log.error_message)

    @patch('urllib.request.urlopen')
    def test_transient_503_raises_retry(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url='http://mock-gov',
            code=503,
            msg='Service Unavailable',
            hdrs={},
            fp=MagicMock(read=lambda: b'{"error": "Temporary Outage"}')
        )

        with self.assertRaises(Retry):
            submit_invoice_to_government_task(str(self.invoice.id))

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.PENDING)
        self.assertEqual(self.invoice.retry_count, 1)

    @patch('urllib.request.urlopen')
    def test_retry_exhaustion_marks_failed(self, mock_urlopen):
        self.invoice.retry_count = 4  # Next failure will be 5th
        self.invoice.save()

        mock_urlopen.side_effect = urllib.error.HTTPError(
            url='http://mock-gov',
            code=503,
            msg='Service Unavailable',
            hdrs={},
            fp=MagicMock(read=lambda: b'{"error": "Down"}')
        )

        result = submit_invoice_to_government_task(str(self.invoice.id))
        self.assertEqual(result['status'], 'FAILED')

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.FAILED)
        self.assertEqual(self.invoice.retry_count, 5)

    @patch('apps.processing.tasks.submit_invoice_to_government_task.delay')
    def test_crash_recovery_sweeper_recovers_stale_processing(self, mock_celery):
        # Set invoice to PROCESSING with updated_at in the past (> 2 minutes ago)
        self.invoice.status = Invoice.Status.PROCESSING
        self.invoice.save()
        Invoice.objects.filter(id=self.invoice.id).update(
            updated_at=timezone.now() - timedelta(minutes=5)
        )

        res = sweep_stale_processing_invoices_task(stale_threshold_minutes=2)
        self.assertEqual(res['recovered_count'], 1)

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.PENDING)
        mock_celery.assert_called_once_with(str(self.invoice.id))

        # Check crash log appended
        log = ProcessingLog.objects.filter(invoice=self.invoice).latest('ended_at')
        self.assertIn("System Worker Crash Detected", log.error_message)

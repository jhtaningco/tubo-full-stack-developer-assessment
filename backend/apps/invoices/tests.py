from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Company
from apps.invoices.models import Invoice, InvoiceItem

User = get_user_model()


class InvoiceApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company_a = Company.objects.create(name='Company Alpha', tax_id='111-111-111-000', email='alpha@test.com')
        self.user_a = User.objects.create_user(email='user_a@alpha.com', password='Password123!', company=self.company_a)

        self.company_b = Company.objects.create(name='Company Beta', tax_id='222-222-222-000', email='beta@test.com')
        self.user_b = User.objects.create_user(email='user_b@beta.com', password='Password123!', company=self.company_b)

        self.list_create_url = '/api/invoices/'
        self.stats_url = '/api/invoices/stats/'

    @patch('apps.invoices.views.submit_invoice_to_government_task.delay')
    def test_invoice_creation_and_recalculation(self, mock_celery):
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'invoice_number': 'INV-2026-001',
            'invoice_date': '2026-10-01',
            'customer_name': 'Acme Customer Inc',
            'customer_tax_id': '999-999-999-000',
            'customer_email': 'acme@customer.com',
            'currency': 'PHP',
            'items': [
                {
                    'description': 'Software Consulting',
                    'quantity': 2,
                    'unit_price': '5000.00',
                    'tax': '12.00',
                },
                {
                    'description': 'Hardware Router',
                    'quantity': 1,
                    'unit_price': '3000.00',
                    'tax': '12.00',
                }
            ]
        }

        res = self.client.post(self.list_create_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_202_ACCEPTED)
        mock_celery.assert_called_once()

        inv = Invoice.objects.get(id=res.data['invoice']['id'])
        self.assertEqual(inv.company, self.company_a)
        self.assertEqual(inv.subtotal, Decimal('13000.00'))
        self.assertEqual(inv.tax_amount, Decimal('1560.00'))
        self.assertEqual(inv.total_amount, Decimal('14560.00'))
        self.assertEqual(inv.status, Invoice.Status.PENDING)
        self.assertEqual(inv.items.count(), 2)

    def test_empty_line_items_validation(self):
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'invoice_number': 'INV-EMPTY',
            'invoice_date': '2026-10-01',
            'customer_name': 'Acme Customer Inc',
            'customer_tax_id': '999-999-999-000',
            'customer_email': 'acme@customer.com',
            'items': []
        }
        res = self.client.post(self.list_create_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_negative_unit_price_or_quantity_validation(self):
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'invoice_number': 'INV-NEG',
            'invoice_date': '2026-10-01',
            'customer_name': 'Acme Customer Inc',
            'customer_tax_id': '999-999-999-000',
            'customer_email': 'acme@customer.com',
            'items': [
                {
                    'description': 'Negative item',
                    'quantity': 1,
                    'unit_price': '-100.00',
                    'tax': '0.00',
                }
            ]
        }
        res = self.client.post(self.list_create_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('apps.invoices.views.submit_invoice_to_government_task.delay')
    def test_same_invoice_number_for_different_companies(self, mock_celery):
        """Two different companies can legitimately use the same invoice number sequence."""
        payload_a = {
            'invoice_number': 'INV-COMMON-100',
            'invoice_date': '2026-10-01',
            'customer_name': 'Client A',
            'customer_tax_id': '111',
            'customer_email': 'a@client.com',
            'items': [{'description': 'Item A', 'quantity': 1, 'unit_price': '100.00', 'tax': '12.00'}]
        }
        self.client.force_authenticate(user=self.user_a)
        res_a = self.client.post(self.list_create_url, payload_a, format='json')
        self.assertEqual(res_a.status_code, status.HTTP_202_ACCEPTED)

        self.client.force_authenticate(user=self.user_b)
        res_b = self.client.post(self.list_create_url, payload_a, format='json')
        self.assertEqual(res_b.status_code, status.HTTP_202_ACCEPTED)

        self.assertEqual(Invoice.objects.filter(invoice_number='INV-COMMON-100').count(), 2)

    @patch('apps.invoices.views.submit_invoice_to_government_task.delay')
    def test_duplicate_invoice_number_for_same_company_rejected(self, mock_celery):
        payload = {
            'invoice_number': 'INV-DUP-1',
            'invoice_date': '2026-10-01',
            'customer_name': 'Client A',
            'customer_tax_id': '111',
            'customer_email': 'a@client.com',
            'items': [{'description': 'Item A', 'quantity': 1, 'unit_price': '100.00', 'tax': '12.00'}]
        }
        self.client.force_authenticate(user=self.user_a)
        res1 = self.client.post(self.list_create_url, payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_202_ACCEPTED)

        res2 = self.client.post(self.list_create_url, payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_409_CONFLICT)

    def test_multi_tenant_isolation_get_and_list(self):
        # Create invoice for Company A
        inv_a = Invoice.objects.create(
            company=self.company_a,
            invoice_number='INV-TENANT-A',
            invoice_date='2026-10-01',
            customer_name='Cust A',
            customer_tax_id='111',
            customer_email='ca@test.com',
            subtotal=Decimal('100.00'),
            tax_amount=Decimal('12.00'),
            total_amount=Decimal('112.00'),
            status=Invoice.Status.SUBMITTED,
            idempotency_key='hash_a'
        )

        # Create invoice for Company B
        inv_b = Invoice.objects.create(
            company=self.company_b,
            invoice_number='INV-TENANT-B',
            invoice_date='2026-10-01',
            customer_name='Cust B',
            customer_tax_id='222',
            customer_email='cb@test.com',
            subtotal=Decimal('200.00'),
            tax_amount=Decimal('24.00'),
            total_amount=Decimal('224.00'),
            status=Invoice.Status.PENDING,
            idempotency_key='hash_b'
        )

        # User A lists invoices -> should ONLY see Company A
        self.client.force_authenticate(user=self.user_a)
        list_res = self.client.get(self.list_create_url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in list_res.data['results']]
        self.assertIn(str(inv_a.id), ids)
        self.assertNotIn(str(inv_b.id), ids)

        # User A attempts to view Company B's invoice -> 404 NOT FOUND
        detail_res = self.client.get(f'/api/invoices/{inv_b.id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_stats_aggregation(self):
        Invoice.objects.create(
            company=self.company_a,
            invoice_number='INV-STAT-1',
            invoice_date='2026-10-01',
            customer_name='C1',
            customer_tax_id='111',
            customer_email='c1@test.com',
            subtotal=Decimal('100.00'),
            tax_amount=Decimal('12.00'),
            total_amount=Decimal('112.00'),
            status=Invoice.Status.SUBMITTED,
            idempotency_key='stat_1'
        )
        Invoice.objects.create(
            company=self.company_a,
            invoice_number='INV-STAT-2',
            invoice_date='2026-10-01',
            customer_name='C2',
            customer_tax_id='222',
            customer_email='c2@test.com',
            subtotal=Decimal('50.00'),
            tax_amount=Decimal('6.00'),
            total_amount=Decimal('56.00'),
            status=Invoice.Status.FAILED,
            idempotency_key='stat_2'
        )

        self.client.force_authenticate(user=self.user_a)
        res = self.client.get(self.stats_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total'], 2)
        self.assertEqual(res.data['submitted'], 1)
        self.assertEqual(res.data['failed'], 1)

    @patch('apps.invoices.views.submit_invoice_to_government_task.delay')
    def test_retry_endpoint_guards(self, mock_celery):
        # Invoice already submitted cannot be retried
        inv_submitted = Invoice.objects.create(
            company=self.company_a,
            invoice_number='INV-SUBMITTED',
            invoice_date='2026-10-01',
            customer_name='Cust',
            customer_tax_id='111',
            customer_email='c@test.com',
            subtotal=Decimal('100.00'),
            tax_amount=Decimal('12.00'),
            total_amount=Decimal('112.00'),
            status=Invoice.Status.SUBMITTED,
            idempotency_key='sub_1'
        )
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post(f'/api/invoices/{inv_submitted.id}/retry/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Invoice failed CAN be retried
        inv_failed = Invoice.objects.create(
            company=self.company_a,
            invoice_number='INV-FAILED',
            invoice_date='2026-10-01',
            customer_name='Cust',
            customer_tax_id='111',
            customer_email='c@test.com',
            subtotal=Decimal('100.00'),
            tax_amount=Decimal('12.00'),
            total_amount=Decimal('112.00'),
            status=Invoice.Status.FAILED,
            retry_count=5,
            idempotency_key='fail_1'
        )
        res_ok = self.client.post(f'/api/invoices/{inv_failed.id}/retry/')
        self.assertEqual(res_ok.status_code, status.HTTP_202_ACCEPTED)
        inv_failed.refresh_from_db()
        self.assertEqual(inv_failed.status, Invoice.Status.PENDING)
        mock_celery.assert_called_once()

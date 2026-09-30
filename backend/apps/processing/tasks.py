import json
import logging
import urllib.request
import urllib.error
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from celery import shared_task

from apps.invoices.models import Invoice
from .models import ProcessingLog

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=5, acks_late=True, reject_on_worker_lost=True)
def submit_invoice_to_government_task(self, invoice_id, manual_retry=False):
    """
    Celery background task for asynchronous government invoice submission.
    
    Features:
    - acks_late=True + reject_on_worker_lost=True: If worker dies mid-execution, task is preserved in queue
    - Row-level database locking (select_for_update) to prevent race conditions & double processing
    - Idempotency key transmission
    - Append-only processing audit log recording every single attempt
    - Exponential backoff retry strategy for transient errors (503, timeouts)
    - Permanent rejection (400) without wasteful retries
    """
    logger.info(f"[Celery] Processing submission for Invoice ID: {invoice_id}")

    # 1. Acquire invoice with database lock
    try:
        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().select_related('company').prefetch_related('items').get(id=invoice_id)
            
            # If already submitted or rejected (and not explicitly forced), do not re-process
            if invoice.status == Invoice.Status.SUBMITTED:
                logger.info(f"Invoice {invoice.invoice_number} is already SUBMITTED. Skipping.")
                return {'status': 'ALREADY_SUBMITTED', 'invoice_id': invoice_id}
            
            if invoice.status == Invoice.Status.REJECTED and not manual_retry:
                logger.info(f"Invoice {invoice.invoice_number} was REJECTED by Government. Skipping automatic retry.")
                return {'status': 'REJECTED', 'invoice_id': invoice_id}

            # Update status to PROCESSING
            invoice.status = Invoice.Status.PROCESSING
            invoice.save(update_fields=['status', 'updated_at'])

    except Invoice.DoesNotExist:
        logger.error(f"Invoice {invoice_id} does not exist. Aborting task.")
        return {'status': 'ERROR_NOT_FOUND', 'invoice_id': invoice_id}

    # 2. Create append-only ProcessingLog entry for this attempt
    attempt_num = invoice.retry_count + 1
    log = ProcessingLog.objects.create(
        invoice=invoice,
        attempt_number=attempt_num,
        status=ProcessingLog.Status.PROCESSING,
        started_at=timezone.now()
    )

    # 3. Construct Government API payload
    payload = {
        'invoice_number': invoice.invoice_number,
        'invoice_date': invoice.invoice_date.isoformat(),
        'seller': {
            'company_name': invoice.company.name,
            'tax_id': invoice.company.tax_id,
            'email': invoice.company.email,
        },
        'customer': {
            'name': invoice.customer_name,
            'tax_id': invoice.customer_tax_id,
            'email': invoice.customer_email,
        },
        'currency': invoice.currency,
        'subtotal': str(invoice.subtotal),
        'tax_amount': str(invoice.tax_amount),
        'total_amount': str(invoice.total_amount),
        'items': [
            {
                'description': item.description,
                'quantity': item.quantity,
                'unit_price': str(item.unit_price),
                'tax': str(item.tax),
                'line_total': str(item.line_total),
            }
            for item in invoice.items.all()
        ]
    }

    # Government API endpoint (resolves to backend:8000 in Docker network)
    gov_url = getattr(settings, 'MOCK_GOV_API_URL', 'http://backend:8000/mock-gov/invoices/')
    if not gov_url.endswith('/'):
        gov_url += '/'

    headers = {
        'Content-Type': 'application/json',
        'Idempotency-Key': invoice.idempotency_key,
        'User-Agent': 'Tubo-Invoice-Platform/1.0',
    }

    data_bytes = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(gov_url, data=data_bytes, headers=headers, method='POST')

    # 4. Dispatch request
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status_code = response.status
            resp_body = response.read().decode('utf-8')
            resp_json = json.loads(resp_body) if resp_body else {}

            # SUCCESS (HTTP 200)
            with transaction.atomic():
                inv = Invoice.objects.select_for_update().get(id=invoice.id)
                inv.status = Invoice.Status.SUBMITTED
                inv.save(update_fields=['status', 'updated_at'])

            log.status = ProcessingLog.Status.SUCCESS
            log.http_status_code = status_code
            log.error_message = None
            log.ended_at = timezone.now()
            log.save(update_fields=['status', 'http_status_code', 'error_message', 'ended_at'])

            logger.info(f"✅ Invoice {invoice.invoice_number} successfully SUBMITTED to Government Authority.")
            return {
                'status': 'SUBMITTED',
                'invoice_id': str(invoice.id),
                'gov_reference': resp_json.get('government_reference_id'),
            }

    except urllib.error.HTTPError as http_err:
        status_code = http_err.code
        try:
            err_body = http_err.read().decode('utf-8')
            err_json = json.loads(err_body)
            err_msg = err_json.get('error') or err_json.get('detail') or err_body
        except Exception:
            err_msg = str(http_err)

        logger.warning(f"⚠️ Government API returned HTTP {status_code} for Invoice {invoice.invoice_number}: {err_msg}")

        # 400 Bad Request / Validation Failure: Permanent rejection
        if status_code == 400:
            with transaction.atomic():
                inv = Invoice.objects.select_for_update().get(id=invoice.id)
                inv.status = Invoice.Status.REJECTED
                inv.save(update_fields=['status', 'updated_at'])

            log.status = ProcessingLog.Status.FAILED
            log.http_status_code = status_code
            log.error_message = f"Validation Rejection: {err_msg}"
            log.ended_at = timezone.now()
            log.save(update_fields=['status', 'http_status_code', 'error_message', 'ended_at'])
            return {'status': 'REJECTED', 'invoice_id': str(invoice.id), 'error': err_msg}

        # 503 / 504 / 500: Transient / Temporary Failure
        else:
            return handle_retry(self, invoice, log, status_code, err_msg)

    except (urllib.error.URLError, TimeoutError, Exception) as net_err:
        err_msg = f"Connection/Network Timeout: {str(net_err)}"
        logger.warning(f"⚠️ Network error submitting Invoice {invoice.invoice_number}: {err_msg}")
        return handle_retry(self, invoice, log, 504, err_msg)


def handle_retry(task_instance, invoice, log, status_code, err_msg):
    """
    Helper function to record failure and calculate exponential backoff retry.
    Note: Keeps status as PENDING during intermediate retries, and only transitions
    to FAILED once all 5 retry attempts are exhausted.
    """
    new_retry_count = invoice.retry_count + 1

    log.status = ProcessingLog.Status.FAILED
    log.http_status_code = status_code
    log.error_message = err_msg
    log.ended_at = timezone.now()
    log.save(update_fields=['status', 'http_status_code', 'error_message', 'ended_at'])

    with transaction.atomic():
        inv = Invoice.objects.select_for_update().get(id=invoice.id)
        inv.retry_count = new_retry_count

        if new_retry_count >= 5:
            # Exhausted all retries -> Mark as FAILED
            inv.status = Invoice.Status.FAILED
            inv.save(update_fields=['status', 'retry_count', 'updated_at'])
            logger.error(f"❌ Invoice {invoice.invoice_number} reached MAX retries ({new_retry_count}). Marked as FAILED.")
            return {
                'status': 'FAILED',
                'invoice_id': str(invoice.id),
                'error': f"Exhausted all 5 retry attempts. Last error: {err_msg}"
            }
        else:
            # Remains in PENDING status pending scheduled retry
            inv.status = Invoice.Status.PENDING
            inv.save(update_fields=['status', 'retry_count', 'updated_at'])

    # Exponential backoff delay: 10s * (2 ** (retry_count - 1)) -> 10s, 20s, 40s, 80s, 160s
    countdown_seconds = 10 * (2 ** (new_retry_count - 1))
    logger.info(f"Scheduling retry #{new_retry_count + 1} for Invoice {invoice.invoice_number} in {countdown_seconds}s...")

    raise task_instance.retry(countdown=countdown_seconds)


@shared_task
def sweep_stale_processing_invoices_task(stale_threshold_minutes=2):
    """
    CRASH RECOVERY SWEEPER (Part I Requirement).
    Runs periodically via Celery Beat every 60 seconds.
    
    If a Celery worker dies/crashes (OOM kill, hardware failure, unhandled crash)
    while an invoice is in 'PROCESSING' state, this task detects rows that have been
    abandoned without an update for > stale_threshold_minutes.
    
    Actions:
    1. Locks candidate stale rows with select_for_update(skip_locked=True)
    2. Appends a Crash Recovery audit log in ProcessingLog
    3. Resets status to PENDING
    4. Re-enqueues submit_invoice_to_government_task (idempotency key guarantees safety)
    """
    cutoff_time = timezone.now() - timedelta(minutes=stale_threshold_minutes)
    
    with transaction.atomic():
        stale_invoices = list(
            Invoice.objects.select_for_update(skip_locked=True).filter(
                status=Invoice.Status.PROCESSING,
                updated_at__lt=cutoff_time
            )
        )
        
        if not stale_invoices:
            return {'recovered_count': 0}
        
        logger.warning(f"⚠️ [Crash Sweeper] Found {len(stale_invoices)} abandoned PROCESSING invoice(s). Initiating recovery.")

        for inv in stale_invoices:
            # Record crash recovery attempt in audit log
            ProcessingLog.objects.create(
                invoice=inv,
                attempt_number=inv.retry_count + 1,
                status=ProcessingLog.Status.FAILED,
                error_message="System Worker Crash Detected: Invoice was abandoned in PROCESSING state. Automated crash sweeper initiated recovery.",
                started_at=inv.updated_at,
                ended_at=timezone.now()
            )
            
            # Reset to PENDING
            inv.status = Invoice.Status.PENDING
            inv.save(update_fields=['status', 'updated_at'])
            
            # Re-enqueue submission task
            submit_invoice_to_government_task.delay(str(inv.id))
            logger.info(f"🔄 [Crash Sweeper] Re-enqueued Invoice {inv.invoice_number} ({inv.id}) for submission.")

        return {'recovered_count': len(stale_invoices)}

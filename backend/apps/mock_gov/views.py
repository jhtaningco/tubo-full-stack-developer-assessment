import uuid
import random
import time
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.utils import timezone

# In-memory cache for idempotency keys: maps idempotency_key -> stored response data
PROCESSED_IDEMPOTENCY_KEYS = {}


class MockGovInvoiceView(APIView):
    """
    Mock Government E-Invoicing Tax Authority API.
    Endpoint: POST /mock-gov/invoices/

    Simulates external government tax authority behaviors:
    - Idempotency support: replaying same `Idempotency-Key` returns original success reference
    - Explicit test triggers in customer name:
        * Contains '[FAIL]' or '[503]' -> Returns 503 Temporary Outage (triggers retry flow)
        * Contains '[REJECT]' or '[400]' -> Returns 400 Validation Rejection
        * Contains '[TIMEOUT]' -> Simulates Gateway Timeout
    - Standard invoices succeed (200 OK) with realistic clearance reference IDs
    - Support for `X-Mock-Force-Status` HTTP header for automated tests
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Extract Idempotency Key
        idempotency_key = (
            request.headers.get('Idempotency-Key') or
            request.META.get('HTTP_IDEMPOTENCY_KEY') or
            request.data.get('idempotency_key')
        )

        # If already successfully processed under this key -> return previous result (Idempotency)
        if idempotency_key and idempotency_key in PROCESSED_IDEMPOTENCY_KEYS:
            cached_data = PROCESSED_IDEMPOTENCY_KEYS[idempotency_key]
            return Response(
                {
                    **cached_data,
                    'is_idempotent_replay': True,
                },
                status=status.HTTP_200_OK
            )

        # 2. Header-based forced status (for automated integration tests)
        force_status = request.headers.get('X-Mock-Force-Status')
        if force_status:
            if force_status == '200':
                return self._respond_success(idempotency_key)
            elif force_status == '503':
                return Response(
                    {'error': 'Government Tax Portal is temporarily undergoing maintenance (503 Service Unavailable).'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            elif force_status == '400':
                return Response(
                    {'error': 'Validation rejection: Customer TIN format rejected by tax registry.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            elif force_status in ('timeout', '504'):
                time.sleep(2)
                return Response(
                    {'error': 'Government Tax Portal Gateway Timeout (504).'},
                    status=status.HTTP_504_GATEWAY_TIMEOUT
                )

        # 3. Payload-based test triggers (allows user to easily test different failure/retry scenarios from the UI!)
        customer_info = request.data.get('customer', {})
        customer_name = customer_info.get('name', '') if isinstance(customer_info, dict) else ''
        invoice_number = request.data.get('invoice_number', '')

        test_string = f"{customer_name} {invoice_number}".upper()

        if '[FAIL]' in test_string or '[503]' in test_string:
            return Response(
                {'error': 'Government Tax Portal is temporarily undergoing maintenance (503 Service Unavailable). Retry scheduled.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if '[REJECT]' in test_string or '[400]' in test_string:
            return Response(
                {'error': 'Validation rejection: Customer TIN is invalid or not registered in National Tax Registry.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if '[TIMEOUT]' in test_string:
            time.sleep(2)
            return Response(
                {'error': 'Government Tax Portal Gateway Timeout (504).'},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )

        # 4. Realistic Default Processing:
        # Standard valid submissions succeed (200 OK) with 90% probability,
        # with occasional 10% transient 503 to showcase auto-retry resilience.
        roll = random.random()

        if roll < 0.90:
            return self._respond_success(idempotency_key)
        else:
            # 10% - Transient 503 (automatically recovered by Celery worker retry)
            return Response(
                {'error': 'Government Tax Portal is temporarily undergoing maintenance (503 Service Unavailable).'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    def _respond_success(self, idempotency_key):
        ref = f"BIR-EINV-{uuid.uuid4().hex[:12].upper()}"
        res_data = {
            'status': 'ACCEPTED',
            'government_reference_id': ref,
            'submitted_at': timezone.now().isoformat(),
            'message': 'Invoice registered and tax clearance certified by Government Tax Authority.',
        }
        if idempotency_key:
            PROCESSED_IDEMPOTENCY_KEYS[idempotency_key] = res_data
        return Response(res_data, status=status.HTTP_200_OK)

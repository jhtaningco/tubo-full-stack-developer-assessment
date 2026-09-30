import uuid
import random
import time
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.utils import timezone

# Cache for idempotency keys: maps idempotency_key -> stored response data
PROCESSED_IDEMPOTENCY_KEYS = {}


class MockGovInvoiceView(APIView):
    """
    Mock Government E-Invoicing Tax Authority API.
    Endpoint: POST /mock-gov/invoices/

    Simulates realistic external government portal behaviors:
    - Idempotency support via `Idempotency-Key` header
    - Success (200 OK) ~ 60%
    - Temporary Failure (503 Service Unavailable) ~ 15%
    - Validation Error (400 Bad Request) ~ 15%
    - Gateway Timeout / Slow Response (504) ~ 10%
    - Support for `X-Mock-Force-Status` header for deterministic testing
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Extract Idempotency Key
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

        # Allow forced status for deterministic tests
        force_status = request.headers.get('X-Mock-Force-Status')
        if force_status:
            if force_status == '200':
                ref = f"BIR-EINV-{uuid.uuid4().hex[:12].upper()}"
                res_data = {
                    'status': 'ACCEPTED',
                    'government_reference_id': ref,
                    'submitted_at': timezone.now().isoformat(),
                    'message': 'Invoice registered and validated by Government Authority.',
                }
                if idempotency_key:
                    PROCESSED_IDEMPOTENCY_KEYS[idempotency_key] = res_data
                return Response(res_data, status=status.HTTP_200_OK)
            elif force_status == '503':
                return Response(
                    {'error': 'Government Tax Portal is temporarily undergoing maintenance (503).'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            elif force_status == '400':
                return Response(
                    {'error': 'Invalid invoice: Customer TIN format rejected by tax registry.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            elif force_status in ('timeout', '504'):
                time.sleep(2)
                return Response(
                    {'error': 'Government Tax Portal Gateway Timeout (504).'},
                    status=status.HTTP_504_GATEWAY_TIMEOUT
                )

        # Probabilistic response simulation
        roll = random.random()

        if roll < 0.60:
            # 60% - Success
            ref = f"BIR-EINV-{uuid.uuid4().hex[:12].upper()}"
            res_data = {
                'status': 'ACCEPTED',
                'government_reference_id': ref,
                'submitted_at': timezone.now().isoformat(),
                'message': 'Invoice registered and validated by Government Authority.',
            }
            if idempotency_key:
                PROCESSED_IDEMPOTENCY_KEYS[idempotency_key] = res_data
            return Response(res_data, status=status.HTTP_200_OK)

        elif roll < 0.75:
            # 15% - Temporary 503
            return Response(
                {'error': 'Government Tax Portal is temporarily undergoing maintenance (503 Service Unavailable).'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        elif roll < 0.90:
            # 15% - Invalid Invoice 400
            return Response(
                {'error': 'Validation rejection: Invalid customer tax ID format or line-item tax calculation mismatch.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        else:
            # 10% - Timeout simulation
            time.sleep(2)
            return Response(
                {'error': 'Government Tax Portal Gateway Timeout (504).'},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )

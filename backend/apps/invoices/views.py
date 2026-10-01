import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count

from .models import Invoice
from .serializers import (
    InvoiceCreateSerializer,
    InvoiceDetailSerializer,
)
from apps.processing.tasks import submit_invoice_to_government_task

logger = logging.getLogger(__name__)


class StandardResultsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class InvoiceListCreateView(APIView):
    """
    GET  /api/invoices/ - List company invoices with filtering & pagination
    POST /api/invoices/ - Create invoice & trigger asynchronous government submission (202 Accepted)
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.company:
            return Invoice.objects.none()

        # Strictly scoped to user's company (Multi-tenancy isolation)
        queryset = Invoice.objects.filter(company=user.company).prefetch_related('items', 'logs')

        # Filters
        status_param = self.request.query_params.get('status')
        if status_param and status_param.upper() in Invoice.Status.values:
            queryset = queryset.filter(status=status_param.upper())

        date_param = self.request.query_params.get('invoice_date')
        if date_param:
            queryset = queryset.filter(invoice_date=date_param)

        number_param = self.request.query_params.get('invoice_number')
        if number_param:
            queryset = queryset.filter(invoice_number__icontains=number_param)

        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search_query) |
                Q(customer_name__icontains=search_query) |
                Q(customer_tax_id__icontains=search_query) |
                Q(customer_email__icontains=search_query)
            )

        return queryset.order_by('-created_at')

    def get(self, request):
        queryset = self.get_queryset()
        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = InvoiceDetailSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        if not request.user.company:
            return Response(
                {'detail': 'Your user account is not associated with an active company.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = InvoiceCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            # Check if this was a duplicate invoice number error -> 409 Conflict
            if 'invoice_number' in serializer.errors:
                err_text = str(serializer.errors['invoice_number'])
                if 'already exists' in err_text:
                    return Response(serializer.errors, status=status.HTTP_409_CONFLICT)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # 1. Store invoice in database with PENDING status
        invoice = serializer.save()

        # 2. Asynchronously dispatch Celery submission task
        try:
            submit_invoice_to_government_task.delay(str(invoice.id))
            logger.info(f"Enqueued background submission job for Invoice {invoice.invoice_number}")
        except Exception as e:
            logger.error(f"Failed to enqueue Celery task for Invoice {invoice.id}: {e}")

        # 3. Return 202 Accepted (Processing initiated asynchronously)
        response_serializer = InvoiceDetailSerializer(invoice)
        return Response(
            {
                'message': 'Invoice successfully accepted and queued for government submission.',
                'invoice': response_serializer.data,
            },
            status=status.HTTP_202_ACCEPTED
        )


class InvoiceDetailView(APIView):
    """
    GET /api/invoices/<id>/
    Returns complete invoice header, line items, and audit processing logs.
    Strictly scoped to requesting company (returns 404 if not owned).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        if not request.user.company:
            return Response({'detail': 'No company profile found.'}, status=status.HTTP_404_NOT_FOUND)

        # Multi-tenancy check: Scoped to user company. If other company ID given -> 404 Not Found
        invoice = get_object_or_404(
            Invoice.objects.prefetch_related('items', 'logs'),
            id=id,
            company=request.user.company
        )
        serializer = InvoiceDetailSerializer(invoice)
        return Response(serializer.data, status=status.HTTP_200_OK)


class InvoiceRetryView(APIView):
    """
    POST /api/invoices/<id>/retry/
    Manually re-triggers processing for an invoice that failed or was rejected.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        if not request.user.company:
            return Response({'detail': 'No company profile found.'}, status=status.HTTP_404_NOT_FOUND)

        invoice = get_object_or_404(Invoice, id=id, company=request.user.company)

        # Eligibility check: Only FAILED invoices (transient errors exhausted) are eligible for retry.
        # REJECTED invoices (validation errors) require issuing a corrected invoice.
        if invoice.status == Invoice.Status.REJECTED:
            return Response(
                {
                    'detail': 'This invoice was permanently rejected by the Tax Authority due to validation errors. Under electronic invoicing compliance rules, rejected records are immutable. Please issue a new corrected invoice.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if invoice.status != Invoice.Status.FAILED:
            return Response(
                {
                    'detail': f"Invoice is currently in '{invoice.status}' state and is not eligible for manual retry. Only FAILED invoices can be retried."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reset status to PENDING
        invoice.status = Invoice.Status.PENDING
        invoice.save(update_fields=['status', 'updated_at'])

        # Enqueue Celery task
        submit_invoice_to_government_task.delay(str(invoice.id), manual_retry=True)

        return Response(
            {
                'message': f"Retry initiated for Invoice {invoice.invoice_number}. Background submission in progress.",
                'invoice': InvoiceDetailSerializer(invoice).data,
            },
            status=status.HTTP_202_ACCEPTED
        )


class InvoiceStatsView(APIView):
    """
    GET /api/invoices/stats/
    Returns aggregate counts by status for the company dashboard stat cards.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.company:
            return Response({'total': 0, 'pending': 0, 'submitted': 0, 'failed': 0, 'rejected': 0, 'processing': 0})

        company_invoices = Invoice.objects.filter(company=request.user.company)
        stats = {
            'total': company_invoices.count(),
            'pending': company_invoices.filter(status=Invoice.Status.PENDING).count(),
            'processing': company_invoices.filter(status=Invoice.Status.PROCESSING).count(),
            'submitted': company_invoices.filter(status=Invoice.Status.SUBMITTED).count(),
            'failed': company_invoices.filter(status=Invoice.Status.FAILED).count(),
            'rejected': company_invoices.filter(status=Invoice.Status.REJECTED).count(),
        }
        return Response(stats, status=status.HTTP_200_OK)

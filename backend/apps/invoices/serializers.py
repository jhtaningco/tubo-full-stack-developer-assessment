import hashlib
from decimal import Decimal
from rest_framework import serializers
from django.db import transaction, IntegrityError
from .models import Invoice, InvoiceItem
from apps.processing.models import ProcessingLog


class InvoiceItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'tax', 'line_total']
        read_only_fields = ['id', 'line_total']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be greater than zero.')
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Unit price cannot be negative.')
        return value

    def validate_tax(self, value):
        if value < 0:
            raise serializers.ValidationError('Tax cannot be negative.')
        return value


class ProcessingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessingLog
        fields = [
            'id',
            'attempt_number',
            'status',
            'http_status_code',
            'error_message',
            'started_at',
            'ended_at',
        ]
        read_only_fields = ['id', 'started_at']


class InvoiceDetailSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    logs = ProcessingLogSerializer(many=True, read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_tax_id = serializers.CharField(source='company.tax_id', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id',
            'company',
            'company_name',
            'company_tax_id',
            'invoice_number',
            'invoice_date',
            'customer_name',
            'customer_tax_id',
            'customer_email',
            'currency',
            'subtotal',
            'tax_amount',
            'total_amount',
            'status',
            'idempotency_key',
            'retry_count',
            'created_at',
            'updated_at',
            'items',
            'logs',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at', 'idempotency_key', 'retry_count']


class InvoiceCreateItemInputSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=500, required=True)
    quantity = serializers.IntegerField(min_value=1, required=True)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'), required=True)
    tax = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal('0.00'), default=Decimal('0.00'), required=False)


class InvoiceCreateSerializer(serializers.Serializer):
    invoice_number = serializers.CharField(max_length=100, required=True)
    invoice_date = serializers.DateField(required=True)
    customer_name = serializers.CharField(max_length=255, required=True)
    customer_tax_id = serializers.CharField(max_length=100, required=True)
    customer_email = serializers.EmailField(required=True)
    currency = serializers.CharField(max_length=3, default='PHP')
    items = InvoiceCreateItemInputSerializer(many=True, required=True)

    def validate_items(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError('Invoice must contain at least one item.')
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        if not request or not request.user or not request.user.company:
            raise serializers.ValidationError({'detail': 'User must belong to an active company.'})

        company = request.user.company
        invoice_number = attrs.get('invoice_number', '').strip()

        # Application-level duplicate check
        if Invoice.objects.filter(company=company, invoice_number=invoice_number).exists():
            raise serializers.ValidationError({
                'invoice_number': f"Invoice number '{invoice_number}' already exists for your company."
            })

        return attrs

    def create(self, validated_data):
        request = self.context['request']
        company = request.user.company
        invoice_number = validated_data['invoice_number'].strip()
        items_data = validated_data.pop('items')

        # Calculate totals on server
        subtotal = Decimal('0.00')
        tax_total = Decimal('0.00')
        computed_items = []

        for item in items_data:
            qty = Decimal(item['quantity'])
            price = Decimal(str(item['unit_price']))
            tax_rate = Decimal(str(item.get('tax', '0.00')))

            item_subtotal = qty * price
            item_tax = (item_subtotal * (tax_rate / Decimal('100.00'))).quantize(Decimal('0.01'))
            line_total = item_subtotal + item_tax

            subtotal += item_subtotal
            tax_total += item_tax

            computed_items.append({
                'description': item['description'].strip(),
                'quantity': item['quantity'],
                'unit_price': price,
                'tax': tax_rate,
                'line_total': line_total,
            })

        total_amount = subtotal + tax_total

        # Deterministic Idempotency Key = SHA256(company_id + invoice_number)
        raw_key = f"{company.id}:{invoice_number}".encode('utf-8')
        idempotency_key = hashlib.sha256(raw_key).hexdigest()

        try:
            with transaction.atomic():
                invoice = Invoice.objects.create(
                    company=company,
                    invoice_number=invoice_number,
                    invoice_date=validated_data['invoice_date'],
                    customer_name=validated_data['customer_name'].strip(),
                    customer_tax_id=validated_data['customer_tax_id'].strip(),
                    customer_email=validated_data['customer_email'].lower().strip(),
                    currency=validated_data.get('currency', 'PHP').upper(),
                    subtotal=subtotal,
                    tax_amount=tax_total,
                    total_amount=total_amount,
                    status=Invoice.Status.PENDING,
                    idempotency_key=idempotency_key,
                    retry_count=0,
                )

                item_objects = [
                    InvoiceItem(
                        invoice=invoice,
                        description=ci['description'],
                        quantity=ci['quantity'],
                        unit_price=ci['unit_price'],
                        tax=ci['tax'],
                        line_total=ci['line_total'],
                    )
                    for ci in computed_items
                ]
                InvoiceItem.objects.bulk_create(item_objects)

        except IntegrityError as exc:
            raise serializers.ValidationError({
                'invoice_number': f"Invoice with number '{invoice_number}' already exists (DB unique constraint)."
            })

        return invoice

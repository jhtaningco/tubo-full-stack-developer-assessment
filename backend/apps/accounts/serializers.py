from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from .models import Company, User


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'tax_id', 'email', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'company', 'is_active', 'is_staff', 'created_at']
        read_only_fields = ['id', 'is_active', 'is_staff', 'created_at']


class RegisterSerializer(serializers.Serializer):
    # Company fields
    company_name = serializers.CharField(max_length=255, required=True)
    company_tax_id = serializers.CharField(max_length=100, required=True)
    company_email = serializers.EmailField(required=True)
    
    # User fields
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=6)

    def validate_email(self, value):
        normalized_email = value.lower().strip()
        if User.objects.filter(email=normalized_email).exists():
            raise serializers.ValidationError('A user with this email address already exists.')
        return normalized_email

    def validate_company_tax_id(self, value):
        tax_id = value.strip()
        if Company.objects.filter(tax_id=tax_id).exists():
            raise serializers.ValidationError('A company with this Tax ID / TIN already exists.')
        return tax_id

    def create(self, validated_data):
        with transaction.atomic():
            company = Company.objects.create(
                name=validated_data['company_name'].strip(),
                tax_id=validated_data['company_tax_id'],
                email=validated_data['company_email'].lower().strip(),
            )
            user = User.objects.create_user(
                email=validated_data['email'],
                password=validated_data['password'],
                company=company,
            )
            return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        email = attrs.get('email', '').lower().strip()
        password = attrs.get('password')

        try:
            user = User.objects.select_related('company').get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({'detail': 'Invalid email or password.'})

        if not user.check_password(password):
            raise serializers.ValidationError({'detail': 'Invalid email or password.'})

        if not user.is_active:
            raise serializers.ValidationError({'detail': 'This account is disabled.'})

        attrs['user'] = user
        return attrs

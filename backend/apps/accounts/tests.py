from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import Company

User = get_user_model()


class AccountsAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.me_url = '/api/auth/me/'

    def test_successful_registration_and_jwt_issuance(self):
        payload = {
            'email': 'testuser@example.com',
            'password': 'StrongPassword123!',
            'company_name': 'Juan Trading Corp',
            'company_tax_id': '999-888-777-000',
            'company_email': 'info@juantrading.ph',
        }
        res = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', res.data)
        self.assertIn('access', res.data['tokens'])
        self.assertIn('refresh', res.data['tokens'])
        self.assertEqual(res.data['user']['email'], 'testuser@example.com')
        self.assertEqual(res.data['user']['company']['name'], 'Juan Trading Corp')

    def test_duplicate_registration_email_rejection(self):
        company = Company.objects.create(name='Co 1', tax_id='111', email='co1@test.com')
        User.objects.create_user(email='dup@example.com', password='Password123!', company=company)

        payload = {
            'email': 'dup@example.com',
            'password': 'Password123!',
            'company_name': 'Another Co',
            'company_tax_id': '222',
            'company_email': 'another@test.com',
        }
        res = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', res.data)

    def test_login_invalid_credentials(self):
        res = self.client.post(self.login_url, {'email': 'nonexistent@example.com', 'password': 'wrong'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_authenticated_vs_unauthenticated(self):
        # Unauthenticated
        res = self.client.get(self.me_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated
        company = Company.objects.create(name='Auth Co', tax_id='333', email='auth@test.com')
        user = User.objects.create_user(email='auth@example.com', password='Password123!', company=company)
        self.client.force_authenticate(user=user)
        res = self.client.get(self.me_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['user']['email'], 'auth@example.com')
        self.assertEqual(res.data['user']['company']['name'], 'Auth Co')

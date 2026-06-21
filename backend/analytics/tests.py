from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class AnalyticsModuleTests(APITestCase):
    def setUp(self):
        # Users
        self.hr = User.objects.create_user(
            username='hr_test', email='hr@t.com', password='pwd', role='HR'
        )
        self.emp_user = User.objects.create_user(
            username='emp_user', email='emp@t.com', password='pwd', role='EMPLOYEE'
        )

    def test_analytics_endpoints_permissions(self):
        # Map of test URL names → actual URL names registered in analytics/urls.py
        endpoints = [
            'analytics-dashboard',
            'analytics-employees',
            'analytics-attendance',
            'analytics-leave',
            'analytics-payroll',
            'analytics-recruitment',
            'analytics-documents',
            'analytics-overview',
            'analytics-charts',
        ]

        # Employee: allowed (200) - returns scoped personal data
        self.client.force_authenticate(user=self.emp_user)
        for name in endpoints:
            url = reverse(name)
            response = self.client.get(url)
            self.assertEqual(
                response.status_code, status.HTTP_200_OK,
                f"Endpoint {name} failed for Employee"
            )

        # HR: allowed (200)
        self.client.force_authenticate(user=self.hr)
        for name in endpoints:
            url = reverse(name)
            response = self.client.get(url)
            self.assertEqual(
                response.status_code, status.HTTP_200_OK,
                f"Endpoint {name} failed for HR"
            )

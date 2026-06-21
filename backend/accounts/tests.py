from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class AccountsAuthTests(APITestCase):
    def setUp(self):
        # Create users with different roles
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='password123',
            role='ADMIN'
        )
        self.hr_user = User.objects.create_user(
            username='hr_test',
            email='hr@test.com',
            password='password123',
            role='HR'
        )
        self.employee_user = User.objects.create_user(
            username='employee_test',
            email='employee@test.com',
            password='password123',
            role='EMPLOYEE'
        )

    def test_jwt_token_obtain_and_refresh(self):
        # Obtain token
        url = reverse('token_obtain_pair')
        data = {
            'username': 'employee_test',
            'password': 'password123'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

        # Refresh token
        refresh_url = reverse('token_refresh')
        refresh_data = {
            'refresh': response.data['refresh']
        }
        refresh_response = self.client.post(refresh_url, refresh_data)
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_response.data)

    def test_jwt_token_invalid_credentials(self):
        url = reverse('token_obtain_pair')
        data = {
            'username': 'employee_test',
            'password': 'wrongpassword'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_view_permissions_and_response(self):
        url = reverse('auth_me')

        # Test unauthenticated
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test Admin me endpoint
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'ADMIN')
        self.assertIn('manage_employees', response.data['permissions'])

        # Test Employee me endpoint
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'EMPLOYEE')
        self.assertNotIn('manage_employees', response.data['permissions'])
        self.assertIn('clock_in', response.data['permissions'])

    def test_permissions_view_response(self):
        url = reverse('auth_permissions')

        # Test Employee permissions
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertIn('clock_in', response.data)
        self.assertNotIn('manage_employees', response.data)

class HRManagementAPITests(APITestCase):
    def setUp(self):
        from employees.models import Department, Designation
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='password123',
            role='ADMIN'
        )
        self.hr_user = User.objects.create_user(
            username='hr_test',
            email='hr@test.com',
            password='password123',
            role='HR'
        )
        self.employee_user = User.objects.create_user(
            username='employee_test',
            email='employee@test.com',
            password='password123',
            role='EMPLOYEE'
        )
        self.dept = Department.objects.create(name="HR Dept", description="HR Department")
        self.desig = Designation.objects.create(name="HR Specialist", department=self.dept)

    def test_hr_list_create_by_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        # Create
        data = {
            'first_name': 'Jane',
            'last_name': 'Doe',
            'email': 'jane@example.com',
            'username': 'jane_hr',
            'phone': '1234567890',
            'department': self.dept.id,
            'designation': self.desig.id,
            'password': 'password123',
            'confirm_password': 'password123'
        }
        url = reverse('hr_list_create')
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'jane_hr')
        
        # Verify employee was created
        from employees.models import Employee
        self.assertTrue(Employee.objects.filter(user__username='jane_hr').exists())
        emp = Employee.objects.get(user__username='jane_hr')
        self.assertTrue(emp.employee_id.startswith('HR-'))
        
        # Get List
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # self.hr_user and jane_hr

    def test_hr_list_denied_to_hr_and_employee(self):
        url = reverse('hr_list_create')
        
        # HR user denied
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Employee user denied
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


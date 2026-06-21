from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from employees.models import Department, Designation, Employee

User = get_user_model()

class EmployeesModuleTests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(
            username='admin_test', email='admin@t.com', password='pwd', role='ADMIN'
        )
        self.hr = User.objects.create_user(
            username='hr_test', email='hr@t.com', password='pwd', role='HR'
        )
        self.emp_user1 = User.objects.create_user(
            username='emp1_user', email='emp1@t.com', password='pwd', role='EMPLOYEE'
        )
        self.emp_user2 = User.objects.create_user(
            username='emp2_user', email='emp2@t.com', password='pwd', role='EMPLOYEE'
        )

        # Create basic department/designation
        self.dept = Department.objects.create(name="IT", description="IT Department")
        self.designation = Designation.objects.create(name="Developer", department=self.dept)

        # Create Employee profiles linked to users
        self.emp1 = Employee.objects.create(
            employee_id="EMP001",
            user=self.emp_user1,
            first_name="Emp",
            last_name="One",
            email="emp1@t.com",
            department=self.dept,
            designation=self.designation,
            employment_status="ACTIVE",
            assigned_hr=self.hr
        )
        self.emp2 = Employee.objects.create(
            employee_id="EMP002",
            user=self.emp_user2,
            first_name="Emp",
            last_name="Two",
            email="emp2@t.com",
            department=self.dept,
            designation=self.designation,
            employment_status="ACTIVE",
            assigned_hr=self.hr
        )

    def test_department_crud_permissions(self):
        url = reverse('department-list')

        # Test Employee is blocked (403) from listing or creating
        self.client.force_authenticate(user=self.emp_user1)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test HR is allowed (200)
        self.client.force_authenticate(user=self.hr)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test HR can create department
        response = self.client.post(url, {'name': 'Sales', 'description': 'Sales dept'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_employee_queryset_isolation_and_crud(self):
        # List URL
        list_url = reverse('employee-list')

        # Employee: should only see their own profile in list
        self.client.force_authenticate(user=self.emp_user1)
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Standard Results Set Pagination wraps elements in 'results' key
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['employee_id'], 'EMP001')

        # Employee: cannot view other employee details (GET /api/employees/EMP002/)
        detail_url_emp2 = reverse('employee-detail', args=[self.emp2.employee_id])
        response = self.client.get(detail_url_emp2)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Employee: can view own details (GET /api/employees/EMP001/)
        detail_url_emp1 = reverse('employee-detail', args=[self.emp1.employee_id])
        response = self.client.get(detail_url_emp1)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # HR: can view any employee details
        self.client.force_authenticate(user=self.hr)
        response = self.client.get(detail_url_emp2)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['employee_id'], 'EMP002')

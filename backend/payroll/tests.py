from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from employees.models import Department, Designation, Employee
from payroll.models import SalaryStructure, Payroll, Payslip

User = get_user_model()

class PayrollModuleTests(APITestCase):
    def setUp(self):
        # Users
        self.hr = User.objects.create_user(
            username='hr_test', email='hr@t.com', password='pwd', role='HR'
        )
        self.emp_user1 = User.objects.create_user(
            username='emp1_user', email='emp1@t.com', password='pwd', role='EMPLOYEE'
        )
        self.emp_user2 = User.objects.create_user(
            username='emp2_user', email='emp2@t.com', password='pwd', role='EMPLOYEE'
        )

        # Department & Designation (required FKs)
        self.dept = Department.objects.create(name="Finance", description="Finance Dept")
        self.desig = Designation.objects.create(name="Analyst", department=self.dept)

        # Profiles
        self.emp1 = Employee.objects.create(
            employee_id="EMP001", user=self.emp_user1, first_name="Emp", last_name="One",
            email="emp1@t.com", department=self.dept, designation=self.desig,
            employment_status="ACTIVE", assigned_hr=self.hr
        )
        self.emp2 = Employee.objects.create(
            employee_id="EMP002", user=self.emp_user2, first_name="Emp", last_name="Two",
            email="emp2@t.com", department=self.dept, designation=self.desig,
            employment_status="ACTIVE", assigned_hr=self.hr
        )

        # Salary Structure
        self.struct1 = SalaryStructure.objects.create(
            employee=self.emp1, basic_salary=5000, house_allowance=1000,
            transport_allowance=500, medical_allowance=300, tax_percentage=10
        )
        self.struct2 = SalaryStructure.objects.create(
            employee=self.emp2, basic_salary=6000, house_allowance=1200,
            transport_allowance=600, medical_allowance=400, tax_percentage=12
        )

    def test_salary_structure_queryset_isolation(self):
        url = reverse('salary-structure-list')

        # Employee 1: should only see their own salary structure
        self.client.force_authenticate(user=self.emp_user1)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify it returns only 1 record (with EMP001 basic salary)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(float(response.data[0]['basic_salary']), 5000.0)

        # Employee 1: cannot view Employee 2 detail
        # The queryset filters out struct2, so it returns 404 (not found) rather than 403
        detail_url_emp2 = reverse('salary-structure-detail', args=[self.struct2.id])
        response_invalid = self.client.get(detail_url_emp2)
        self.assertIn(response_invalid.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # HR: can view all
        self.client.force_authenticate(user=self.hr)
        response_hr = self.client.get(url)
        self.assertEqual(response_hr.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_hr.data), 2)

    def test_process_payroll(self):
        self.client.force_authenticate(user=self.hr)
        process_url = reverse('payroll-process')

        # Process payroll for Employee 1
        data = {
            'month': 6,
            'year': 2026,
            'employee_id': 'EMP001'
        }
        response = self.client.post(process_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success_count'], 1)

        # Verify Payroll object created with correct calculations
        # Basic: 5000, Allowances: 1000 + 500 + 300 = 1800. Gross = 6800. Tax (10%) = 680. Net = 6120.
        payroll = Payroll.objects.get(employee=self.emp1, payroll_month=6, payroll_year=2026)
        self.assertEqual(float(payroll.gross_salary), 6800.0)
        self.assertEqual(float(payroll.tax_deduction), 680.0)
        self.assertEqual(float(payroll.net_salary), 6120.0)

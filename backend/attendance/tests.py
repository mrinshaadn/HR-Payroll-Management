from django.urls import reverse
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from employees.models import Department, Designation, Employee
from attendance.models import Attendance
User = get_user_model()

class AttendanceModuleTests(APITestCase):
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
        self.dept = Department.objects.create(name="IT", description="IT Dept")
        self.desig = Designation.objects.create(name="Developer", department=self.dept)

        # Profiles
        self.emp1 = Employee.objects.create(
            employee_id="EMP001", user=self.emp_user1, first_name="Emp", last_name="One",
            email="emp1@t.com", department=self.dept, designation=self.desig,
            employment_status="ACTIVE"
        )
        self.emp2 = Employee.objects.create(
            employee_id="EMP002", user=self.emp_user2, first_name="Emp", last_name="Two",
            email="emp2@t.com", department=self.dept, designation=self.desig,
            employment_status="ACTIVE"
        )

    @patch('django.utils.timezone.now')
    def test_clock_in_and_out_flow(self, mock_now):
        from django.utils import timezone
        import datetime
        # Return a time before 09:00 AM local time
        mock_dt = timezone.make_aware(datetime.datetime(2026, 6, 18, 8, 30, 0))
        mock_now.return_value = mock_dt

        # Clock in
        self.client.force_authenticate(user=self.emp_user1)
        clock_in_url = reverse('clock-in')
        response = self.client.post(clock_in_url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'Present')
        self.assertIsNotNone(response.data['check_in'])
        self.assertIsNone(response.data['check_out'])

        # Try clocking in again today (error)
        response_dup = self.client.post(clock_in_url)
        self.assertEqual(response_dup.status_code, status.HTTP_400_BAD_REQUEST)

        # Clock out
        # We need to mock clock_out to happen at e.g. 17:30 (9 hours later)
        mock_dt_out = timezone.make_aware(datetime.datetime(2026, 6, 18, 17, 30, 0))
        mock_now.return_value = mock_dt_out
        clock_out_url = reverse('clock-out')
        response_out = self.client.post(clock_out_url)
        self.assertEqual(response_out.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response_out.data['check_out'])
        self.assertGreaterEqual(float(response_out.data['total_hours']), 9.0)

    def test_attendance_history_isolation(self):
        # Pre-create records
        today = timezone.localdate()
        Attendance.objects.create(employee=self.emp1, date=today, check_in=timezone.now(), status='Present')
        Attendance.objects.create(employee=self.emp2, date=today, check_in=timezone.now(), status='Present')

        # Employee 1 history
        self.client.force_authenticate(user=self.emp_user1)
        history_url = reverse('attendance-history')
        response = self.client.get(history_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # HR history (sees all assigned)
        self.emp1.assigned_hr = self.hr
        self.emp1.save()
        self.emp2.assigned_hr = self.hr
        self.emp2.save()

        self.client.force_authenticate(user=self.hr)
        response_hr = self.client.get(history_url)
        self.assertEqual(response_hr.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_hr.data), 2)

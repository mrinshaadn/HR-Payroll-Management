from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from employees.models import Department, Designation, Employee
from leave_management.models import LeaveType, LeaveBalance, LeaveRequest

User = get_user_model()

class LeaveManagementModuleTests(APITestCase):
    def setUp(self):
        # Users
        self.hr = User.objects.create_user(
            username='hr_test', email='hr@t.com', password='pwd', role='HR'
        )
        self.emp_user = User.objects.create_user(
            username='emp_user', email='emp@t.com', password='pwd', role='EMPLOYEE'
        )

        # Department & Designation (required FKs)
        self.dept = Department.objects.create(name="HR Dept", description="HR")
        self.desig = Designation.objects.create(name="Officer", department=self.dept)

        # Profile
        self.emp = Employee.objects.create(
            employee_id="EMP001", user=self.emp_user, first_name="Emp", last_name="One",
            email="emp@t.com", department=self.dept, designation=self.desig,
            employment_status="ACTIVE", assigned_hr=self.hr
        )

        # Leave types & balances
        self.leave_type = LeaveType.objects.create(name="Casual Leave", max_days_per_year=12, is_paid_leave=True)
        self.balance = LeaveBalance.objects.create(
            employee=self.emp, leave_type=self.leave_type, total_days=12, used_days=0, remaining_days=12, year=2026
        )

    def test_apply_leave_success_and_insufficient_balance(self):
        self.client.force_authenticate(user=self.emp_user)
        apply_url = reverse('leave-apply')

        # Successful application (3 days)
        today = timezone.localdate()
        data = {
            'leave_type': self.leave_type.id,
            'start_date': str(today),
            'end_date': str(today + timedelta(days=2)),
            'reason': 'Vacation'
        }
        response = self.client.post(apply_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(int(float(response.data['total_days'])), 3)
        self.assertEqual(response.data['status'], 'Pending')

        # Try applying for 15 days (insufficient balance, max remaining is 12)
        invalid_data = {
            'leave_type': self.leave_type.id,
            'start_date': str(today + timedelta(days=30)),
            'end_date': str(today + timedelta(days=45)),
            'reason': 'Long vacation'
        }
        response_invalid = self.client.post(apply_url, invalid_data)
        self.assertEqual(response_invalid.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approve_leave_workflow(self):
        # Apply leave
        today = timezone.localdate()
        leave_req = LeaveRequest.objects.create(
            employee=self.emp, leave_type=self.leave_type,
            start_date=today, end_date=today + timedelta(days=2),
            total_days=3, reason='Sick', status='Pending'
        )

        # Approve by HR
        self.client.force_authenticate(user=self.hr)
        approve_url = reverse('leave-approve')
        response = self.client.post(approve_url, {'request_id': leave_req.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'Approved')

        # Verify balance is deducted
        self.balance.refresh_from_db()
        self.assertEqual(self.balance.used_days, 3)
        self.assertEqual(self.balance.remaining_days, 9)

    def test_leave_approval_hierarchy_rules(self):
        # Create Admin
        admin = User.objects.create_user(
            username='admin_test', email='admin@t.com', password='pwd', role='ADMIN'
        )

        # Create HR Employee profile
        hr_emp = Employee.objects.create(
            employee_id="EMP002", user=self.hr, first_name="HR", last_name="User",
            email="hr@t.com", department=self.dept, designation=self.desig,
            employment_status="ACTIVE"
        )
        hr_balance = LeaveBalance.objects.create(
            employee=hr_emp, leave_type=self.leave_type, total_days=12, used_days=0, remaining_days=12, year=2026
        )

        # HR applies for leave
        today = timezone.localdate()
        hr_req = LeaveRequest.objects.create(
            employee=hr_emp, leave_type=self.leave_type,
            start_date=today, end_date=today + timedelta(days=1),
            total_days=2, reason='Holiday', status='Pending'
        )

        # 1. HR tries to approve own leave (should be denied)
        self.client.force_authenticate(user=self.hr)
        approve_url = reverse('leave-approve')
        response = self.client.post(approve_url, {'request_id': hr_req.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Another HR tries to approve it (should be denied because only Admin can approve HR leave)
        another_hr = User.objects.create_user(
            username='hr2', email='hr2@t.com', password='pwd', role='HR'
        )
        self.client.force_authenticate(user=another_hr)
        response = self.client.post(approve_url, {'request_id': hr_req.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Admin approves HR leave (should succeed)
        self.client.force_authenticate(user=admin)
        response = self.client.post(approve_url, {'request_id': hr_req.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'Approved')
        
        # 4. Admin overrides decision (rejecting the approved leave, credits back balance)
        reject_url = reverse('leave-reject')
        response = self.client.post(reject_url, {'request_id': hr_req.id, 'rejection_reason': 'Business need'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'Rejected')
        
        hr_balance.refresh_from_db()
        self.assertEqual(hr_balance.used_days, 0)
        self.assertEqual(hr_balance.remaining_days, 12)

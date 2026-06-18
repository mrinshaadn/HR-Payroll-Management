import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from employees.models import Employee, Department, Designation
from django.contrib.auth import get_user_model
from employees.serializers import EmployeeSerializer
from rest_framework.exceptions import ValidationError

User = get_user_model()

# Setup test dept/desig
dept = Department.objects.first()
desig = Designation.objects.first()

email = "test_dup@gmail.com"
emp_id = "EMP-9999"

# Clean up any existing
Employee.objects.filter(email=email).delete()
Employee.objects.filter(employee_id=emp_id).delete()
User.objects.filter(email=email).delete()

print("1. Creating employee...")
data = {
    "employee_id": emp_id,
    "first_name": "Test",
    "last_name": "Dup",
    "email": email,
    "department": dept.id,
    "designation": desig.id,
    "salary": "50000.00",
    "employment_status": "ACTIVE",
    "password": "password123",
    "confirm_password": "password123"
}

serializer = EmployeeSerializer(data=data)
serializer.is_valid(raise_exception=True)
emp = serializer.save()
print(f"Created: {emp}, User: {emp.user}")

print("2. Soft-deleting employee...")
# Simulate viewset perform_destroy soft delete
emp.is_deleted = True
emp.is_active = False
if emp.user:
    emp.user.is_active = False
    emp.user.save()
emp.save()
print("Soft-deleted successfully.")

print("3. Trying to re-create the same employee...")
serializer2 = EmployeeSerializer(data=data)
try:
    serializer2.is_valid(raise_exception=True)
    emp2 = serializer2.save()
    print(f"Re-created successfully: {emp2}")
except ValidationError as e:
    print(f"Validation failed: {e.detail}")
except Exception as e:
    print(f"Failed with exception: {type(e)} - {e}")

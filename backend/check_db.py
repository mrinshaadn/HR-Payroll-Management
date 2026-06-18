import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from employees.models import Employee
from django.contrib.auth import get_user_model
from employees.serializers import EmployeeSerializer

User = get_user_model()

# Let's see what employees and users we currently have
print("--- Active Employees ---")
for e in Employee.objects.filter(is_deleted=False):
    print(f"ID: {e.employee_id}, Email: {e.email}, Active: {e.is_active}, Deleted: {e.is_deleted}")

print("--- Soft Deleted Employees ---")
for e in Employee.objects.filter(is_deleted=True):
    print(f"ID: {e.employee_id}, Email: {e.email}, Active: {e.is_active}, Deleted: {e.is_deleted}")

print("--- Users ---")
for u in User.objects.all():
    print(f"Username: {u.username}, Email: {u.email}, Active: {u.is_active}")

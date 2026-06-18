import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from employees.models import Employee
from django.contrib.auth import get_user_model

User = get_user_model()

print("Checking connections between Employee and User models:")
for emp in Employee.objects.all():
    print(f"Employee ID: {emp.employee_id}, Email: {emp.email}, User linked: {emp.user}")
    
print("\nChecking Users not linked to any Employee:")
for u in User.objects.all():
    has_emp = hasattr(u, 'employee_profile') and u.employee_profile is not None
    print(f"User username: {u.username}, Email: {u.email}, Active: {u.is_active}, Linked to Employee: {has_emp}")

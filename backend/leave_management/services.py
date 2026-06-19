from datetime import date
from django.db.models import Sum, Q, Count
from django.utils import timezone
from .models import LeaveBalance, LeaveRequest

def calculate_leave_days(start_date: date, end_date: date) -> float:
    """
    Calculates number of calendar days of leave requested.
    """
    if not start_date or not end_date or start_date > end_date:
        return 0.0
    return float((end_date - start_date).days + 1)

def check_overlapping_requests(employee_id: str, start_date: date, end_date: date, exclude_request_id=None) -> bool:
    """
    Checks if there's any active overlapping leave requests.
    """
    query = LeaveRequest.objects.filter(
        employee_id=employee_id,
        status__in=[LeaveRequest.Status.PENDING, LeaveRequest.Status.APPROVED]
    ).filter(
        Q(start_date__lte=end_date) & Q(end_date__gte=start_date)
    )
    if exclude_request_id:
        query = query.exclude(id=exclude_request_id)
        
    return query.exists()

def validate_leave_balance(employee_id: str, leave_type_id: int, total_days: float, year: int) -> bool:
    """
    Validates if the employee has sufficient remaining leave balance.
    """
    try:
        balance = LeaveBalance.objects.get(
            employee_id=employee_id,
            leave_type_id=leave_type_id,
            year=year
        )
    except LeaveBalance.DoesNotExist:
        from employees.models import Employee
        from .models import LeaveType
        try:
            employee = Employee.objects.get(employee_id=employee_id)
            leave_type = LeaveType.objects.get(id=leave_type_id)
            balance = LeaveBalance.objects.create(
                employee=employee,
                leave_type=leave_type,
                year=year,
                total_days=leave_type.max_days_per_year,
                used_days=0.0,
                remaining_days=leave_type.max_days_per_year
            )
        except (Employee.DoesNotExist, LeaveType.DoesNotExist):
            return False
    return float(balance.remaining_days) >= float(total_days)

def deduct_leave_balance(employee_id: str, leave_type_id: int, total_days: float, year: int) -> bool:
    """
    Deducts the approved leave days from the user's LeaveBalance.
    """
    try:
        balance = LeaveBalance.objects.get(
            employee_id=employee_id,
            leave_type_id=leave_type_id,
            year=year
        )
    except LeaveBalance.DoesNotExist:
        from employees.models import Employee
        from .models import LeaveType
        try:
            employee = Employee.objects.get(employee_id=employee_id)
            leave_type = LeaveType.objects.get(id=leave_type_id)
            balance = LeaveBalance.objects.create(
                employee=employee,
                leave_type=leave_type,
                year=year,
                total_days=leave_type.max_days_per_year,
                used_days=0.0,
                remaining_days=leave_type.max_days_per_year
            )
        except (Employee.DoesNotExist, LeaveType.DoesNotExist):
            return False
            
    balance.used_days = float(balance.used_days) + float(total_days)
    balance.remaining_days = float(balance.total_days) - float(balance.used_days)
    balance.save()
    return True

def generate_leave_reports(year: int):
    """
    Generates statistics on leave requests across departments.
    """
    requests = LeaveRequest.objects.filter(start_date__year=year)
    dept_stats = requests.values('employee__department__name').annotate(
        total_leaves=Count('id'),
        approved_leaves=Count('id', filter=Q(status=LeaveRequest.Status.APPROVED)),
        rejected_leaves=Count('id', filter=Q(status=LeaveRequest.Status.REJECTED))
    )
    return list(dept_stats)

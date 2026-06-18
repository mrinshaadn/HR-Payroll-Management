import random
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist

from attendance.models import Attendance
from employees.models import Employee
from .models import SalaryStructure, Payroll, Payslip

def get_overtime_hours(employee_id: str, year: int, month: int) -> float:
    """
    Retrieves sum of overtime hours from Attendance records for the given month and year.
    """
    res = Attendance.objects.filter(
        employee_id=employee_id,
        date__year=year,
        date__month=month
    ).aggregate(
        hours=Sum('overtime_hours'),
        minutes=Sum('overtime_minutes')
    )
    hours = float(res['hours'] or 0.0)
    minutes = float(res['minutes'] or 0.0)
    return hours + (minutes / 60.0)

def generate_payslip_number(employee_id: str, year: int, month: int) -> str:
    """
    Generates a unique payslip number.
    """
    rand = random.randint(100, 999)
    return f"PAY-{year}{month:02d}-{employee_id}-{rand}"

@transaction.atomic
def calculate_and_save_payroll(employee: Employee, year: int, month: int) -> Payroll:
    """
    Calculates monthly payroll figures for an employee and registers a payslip record.
    """
    # Prevent duplicate runs
    if Payroll.objects.filter(employee=employee, payroll_month=month, payroll_year=year).exists():
        raise ValueError("Payroll is already generated for this employee for the selected month/year.")

    try:
        structure = SalaryStructure.objects.get(employee=employee)
    except SalaryStructure.DoesNotExist:
        raise ValueError(f"No active Salary Structure found for employee: {employee.name}.")

    # Gather values
    basic = structure.basic_salary
    allowances = (
        structure.house_allowance + 
        structure.transport_allowance + 
        structure.medical_allowance + 
        structure.special_allowance
    )
    bonus = structure.bonus
    
    # Calculate Overtime from Attendance
    ot_hours = get_overtime_hours(employee.employee_id, year, month)
    ot_amount = ot_hours * float(structure.overtime_rate)
    
    # Gross salary
    gross = float(basic) + float(allowances) + float(bonus) + ot_amount
    
    # Deductions
    tax = gross * (float(structure.tax_percentage) / 100.0)
    pf = float(basic) * (float(structure.provident_fund_percentage) / 100.0)
    other_deductions = 0.0
    
    # Net salary
    net = gross - tax - pf - other_deductions

    # Create Payroll
    payroll = Payroll.objects.create(
        employee=employee,
        payroll_month=month,
        payroll_year=year,
        gross_salary=gross,
        total_allowances=allowances,
        overtime_amount=ot_amount,
        tax_deduction=tax,
        provident_fund=pf,
        other_deductions=other_deductions,
        net_salary=net,
        status=Payroll.Status.PROCESSED
    )

    # Auto generate Payslip
    payslip_num = generate_payslip_number(employee.employee_id, year, month)
    Payslip.objects.create(
        payroll=payroll,
        payslip_number=payslip_num,
        pdf_file=f"/media/payslips/{payslip_num}.pdf"
    )

    return payroll

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
    rand = random.randint(1000, 9999)
    return f"PAY-{year}{month:02d}-{employee_id}-{rand}"


@transaction.atomic
def calculate_and_save_payroll(employee: Employee, year: int, month: int, override: bool = False) -> Payroll:
    """
    Calculates monthly payroll figures for an employee and registers a payslip record.
    If override=True and a payroll already exists, it updates (deletes and recreates) the record.
    """
    # Check for duplicates
    existing = Payroll.objects.filter(employee=employee, payroll_month=month, payroll_year=year).first()
    if existing:
        if not override:
            raise ValueError(
                f"Payroll already generated for {employee.first_name} {employee.last_name} "
                f"({employee.employee_id}) for {month}/{year}. Use override=True to reprocess."
            )
        # Delete existing payroll and payslip before recreating
        try:
            existing.payslip.delete()
        except ObjectDoesNotExist:
            pass
        existing.delete()

    try:
        structure = SalaryStructure.objects.filter(employee=employee).order_by('-updated_at').first()
        if structure is None:
            raise SalaryStructure.DoesNotExist
    except SalaryStructure.DoesNotExist:
        raise ValueError(
            f"No salary structure found for {employee.first_name} {employee.last_name} "
            f"({employee.employee_id}). Please configure one before processing payroll."
        )


    # Gather salary components
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

    # Create Payroll record
    payroll = Payroll.objects.create(
        employee=employee,
        payroll_month=month,
        payroll_year=year,
        gross_salary=round(gross, 2),
        total_allowances=round(float(allowances), 2),
        overtime_amount=round(ot_amount, 2),
        tax_deduction=round(tax, 2),
        provident_fund=round(pf, 2),
        other_deductions=round(other_deductions, 2),
        net_salary=round(net, 2),
        status=Payroll.Status.PROCESSED
    )

    # Auto-generate Payslip
    payslip_num = generate_payslip_number(employee.employee_id, year, month)
    Payslip.objects.create(
        payroll=payroll,
        payslip_number=payslip_num,
        pdf_file=None  # No physical file; download handled via API data
    )

    return payroll

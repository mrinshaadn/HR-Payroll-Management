from django.db import models
from django.conf import settings

class SalaryStructure(models.Model):
    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='salary_structures'
    )
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    house_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    transport_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    medical_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    special_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    overtime_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    provident_fund_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Structure for {self.employee.name}"

class Payroll(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'Draft', 'Draft'
        PROCESSED = 'Processed', 'Processed'
        PAID = 'Paid', 'Paid'

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='payrolls'
    )
    payroll_month = models.IntegerField()
    payroll_year = models.IntegerField()
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    overtime_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    provident_fund = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ('employee', 'payroll_month', 'payroll_year')

    def __str__(self):
        return f"Payroll {self.payroll_month}/{self.payroll_year} for {self.employee.name} ({self.status})"

class Payslip(models.Model):
    payroll = models.OneToOneField(
        Payroll,
        on_delete=models.CASCADE,
        related_name='payslip'
    )
    payslip_number = models.CharField(max_length=50, unique=True)
    pdf_file = models.CharField(max_length=300, blank=True, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payslip {self.payslip_number} for {self.payroll.employee.name}"

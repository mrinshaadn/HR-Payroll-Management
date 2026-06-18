from datetime import datetime
from django.utils import timezone
from django.db.models import Count, Sum, Avg, Q
from django.contrib.auth import get_user_model

from employees.models import Employee, Department, Designation
from attendance.models import Attendance
from leave_management.models import LeaveRequest
from payroll.models import Payroll
from recruitment.models import JobOpening, Candidate, Interview
from documents.models import Document, DocumentCategory

User = get_user_model()

def get_employee_analytics() -> dict:
    """
    Compiles employee metrics: totals, status ratios, department/designation charts, gender dist.
    """
    total = Employee.objects.filter(is_deleted=False).count()
    active_statuses = ['ACTIVE', 'ON LEAVE', 'REMOTE', 'PROBATION', 'SUSPENDED']
    active = Employee.objects.filter(employment_status__in=active_statuses, is_deleted=False).count()
    on_leave = Employee.objects.filter(employment_status=Employee.EmploymentStatus.ON_LEAVE, is_deleted=False).count()
    remote = Employee.objects.filter(employment_status=Employee.EmploymentStatus.REMOTE, is_deleted=False).count()
    terminated = Employee.objects.filter(employment_status=Employee.EmploymentStatus.TERMINATED, is_deleted=False).count()
    resigned = Employee.objects.filter(employment_status=Employee.EmploymentStatus.RESIGNED, is_deleted=False).count()

    now = timezone.now()
    new_this_month = Employee.objects.filter(
        joining_date__year=now.year,
        joining_date__month=now.month,
        is_deleted=False
    ).count()

    by_dept = list(Employee.objects.filter(is_deleted=False).values('department__name').annotate(count=Count('employee_id')))
    by_desig = list(Employee.objects.filter(is_deleted=False).values('designation__name').annotate(count=Count('employee_id')))
    by_gender = list(Employee.objects.filter(is_deleted=False).values('gender').annotate(count=Count('employee_id')))

    return {
        "total_employees": total,
        "active_employees": active,
        "on_leave": on_leave,
        "remote": remote,
        "terminated": terminated,
        "resigned": resigned,
        "new_this_month": new_this_month,
        "by_department": by_dept,
        "by_designation": by_desig,
        "gender_distribution": by_gender
    }

def get_attendance_analytics() -> dict:
    """
    Compiles attendance statistics: daily metrics and monthly trends.
    """
    today = timezone.localdate()
    total_emp = Employee.objects.filter(
        employment_status__in=['ACTIVE', 'ON LEAVE', 'REMOTE', 'PROBATION', 'SUSPENDED'],
        is_deleted=False
    ).count()
    
    today_records = Attendance.objects.filter(date=today)
    present = today_records.filter(status=Attendance.Status.PRESENT).count()
    late = today_records.filter(status=Attendance.Status.LATE).count()
    half_day = today_records.filter(status=Attendance.Status.HALF_DAY).count()
    absent = today_records.filter(status=Attendance.Status.ABSENT).count()
    leave = today_records.filter(status=Attendance.Status.LEAVE).count()
    wfh = today_records.filter(status='WFH').count()  # optional status

    # Percentage
    att_rate = ((present + wfh + late + half_day) / total_emp * 100) if total_emp > 0 else 0.0

    # Monthly trends (last 30 days daily counts)
    thirty_days_ago = today - timezone.timedelta(days=30)
    trends = list(
        Attendance.objects.filter(date__gte=thirty_days_ago)
        .values('date')
        .annotate(
            present_count=Count('id', filter=Q(status__in=['Present', 'Late', 'Half Day', 'WFH'])),
            total_count=Count('id')
        )
        .order_by('date')
    )

    # Department-wise attendance rates
    dept_att = list(
        Attendance.objects.filter(date=today)
        .values('employee__department__name')
        .annotate(
            present=Count('id', filter=Q(status__in=['Present', 'Late', 'Half Day'])),
            total=Count('id')
        )
    )

    # All records status percentage breakdown
    all_records = Attendance.objects.filter(employee__is_deleted=False)
    c_present = all_records.filter(status=Attendance.Status.PRESENT).count()
    c_late = all_records.filter(status=Attendance.Status.LATE).count()
    c_half = all_records.filter(status=Attendance.Status.HALF_DAY).count()
    c_absent = all_records.filter(status=Attendance.Status.ABSENT).count()
    c_leave = all_records.filter(status=Attendance.Status.LEAVE).count()
    
    total_rec = c_present + c_late + c_half + c_absent + c_leave
    
    breakdown = {
        "present": 0,
        "late": 0,
        "half_day": 0,
        "absent": 0,
        "leave": 0
    }
    if total_rec > 0:
        p_pres = round((c_present / total_rec) * 100)
        p_late = round((c_late / total_rec) * 100)
        p_half = round((c_half / total_rec) * 100)
        p_abs = round((c_absent / total_rec) * 100)
        p_lv = round((c_leave / total_rec) * 100)
        
        sum_p = p_pres + p_late + p_half + p_abs + p_lv
        if sum_p != 100:
            vals = [
                ('present', p_pres),
                ('late', p_late),
                ('half_day', p_half),
                ('absent', p_abs),
                ('leave', p_lv)
            ]
            vals.sort(key=lambda x: x[1], reverse=True)
            adjusted_name = vals[0][0]
            if adjusted_name == 'present': p_pres += (100 - sum_p)
            elif adjusted_name == 'late': p_late += (100 - sum_p)
            elif adjusted_name == 'half_day': p_half += (100 - sum_p)
            elif adjusted_name == 'absent': p_abs += (100 - sum_p)
            elif adjusted_name == 'leave': p_lv += (100 - sum_p)
            
        breakdown["present"] = p_pres
        breakdown["late"] = p_late
        breakdown["half_day"] = p_half
        breakdown["absent"] = p_abs
        breakdown["leave"] = p_lv

    return {
        "present_today": present + wfh + late + half_day,
        "absent_today": absent,
        "late_today": late,
        "half_day_today": half_day,
        "leave_today": leave,
        "attendance_percentage": round(att_rate, 2),
        "monthly_trends": trends,
        "department_attendance": dept_att,
        "breakdown": breakdown
    }

def get_leave_analytics() -> dict:
    """
    Compiles leave metrics: status aggregations and department stats.
    """
    total = LeaveRequest.objects.count()
    pending = LeaveRequest.objects.filter(status=LeaveRequest.Status.PENDING).count()
    approved = LeaveRequest.objects.filter(status=LeaveRequest.Status.APPROVED).count()
    rejected = LeaveRequest.objects.filter(status=LeaveRequest.Status.REJECTED).count()

    dept_stats = list(
        LeaveRequest.objects.values('employee__department__name')
        .annotate(
            total_requests=Count('id'),
            approved_requests=Count('id', filter=Q(status=LeaveRequest.Status.APPROVED))
        )
    )

    return {
        "total_leave_requests": total,
        "pending_leave_requests": pending,
        "approved_leave_requests": approved,
        "rejected_leave_requests": rejected,
        "department_leaves": dept_stats
    }

def get_payroll_analytics() -> dict:
    """
    Compiles salary structure averages, tax and provident fund costs.
    """
    now = timezone.now()
    month_payroll = Payroll.objects.filter(payroll_year=now.year, payroll_month=now.month)
    
    total_cost = Payroll.objects.aggregate(total=Sum('net_salary'))['total'] or 0.0
    monthly_cost = month_payroll.aggregate(total=Sum('net_salary'))['total'] or 0.0
    
    avg_salary = Employee.objects.filter(is_deleted=False).aggregate(avg=Avg('salary'))['avg'] or 0.0
    
    dept_salaries = list(
        Employee.objects.filter(is_deleted=False).values('department__name')
        .annotate(
            total_salary=Sum('salary'),
            avg_salary=Avg('salary')
        )
    )
    
    tax_sum = month_payroll.aggregate(total=Sum('tax_deduction'))['total'] or 0.0
    pf_sum = month_payroll.aggregate(total=Sum('provident_fund'))['total'] or 0.0
    
    status_counts = list(
        Payroll.objects.filter(payroll_year=now.year, payroll_month=now.month)
        .values('status')
        .annotate(count=Count('id'))
    )

    return {
        "total_payroll_cost": float(total_cost),
        "monthly_payroll_cost": float(monthly_cost),
        "average_salary": float(avg_salary),
        "department_salaries": dept_salaries,
        "tax_deduction_summary": float(tax_sum),
        "provident_fund_summary": float(pf_sum),
        "payroll_statuses": status_counts
    }

def get_recruitment_analytics() -> dict:
    """
    Compiles recruitment funnel counts and vacancies stats.
    """
    open_jobs = JobOpening.objects.filter(status=JobOpening.Status.OPEN).count()
    total_candidates = Candidate.objects.count()
    
    selected = Candidate.objects.filter(status=Candidate.Status.SELECTED).count()
    hired = selected
    
    by_status = list(Candidate.objects.values('status').annotate(count=Count('id')))
    interviews = Interview.objects.filter(status=Interview.Status.SCHEDULED).count()

    return {
        "open_jobs": open_jobs,
        "total_candidates": total_candidates,
        "candidates_by_status": by_status,
        "interviews_scheduled": interviews,
        "hired_candidates": hired
    }

def get_document_analytics() -> dict:
    """
    Compiles documents uploaded count, categories breakdowns, and completeness rate.
    """
    total = Document.objects.filter(status=Document.Status.ACTIVE).count()
    by_cat = list(
        Document.objects.filter(status=Document.Status.ACTIVE)
        .values('category__name')
        .annotate(count=Count('id'))
    )
    
    recent = list(
        Document.objects.filter(status=Document.Status.ACTIVE)
        .order_by('-uploaded_at')[:5]
        .values('id', 'title', 'uploaded_at', 'employee__first_name', 'employee__last_name')
    )

    # Document Completion Rate: percentage of active employees having uploaded at least one document
    total_active_emp = Employee.objects.filter(
        employment_status__in=['ACTIVE', 'ON LEAVE', 'REMOTE', 'PROBATION', 'SUSPENDED'],
        is_deleted=False
    ).count()
    employees_with_docs = Employee.objects.filter(
        employment_status__in=['ACTIVE', 'ON LEAVE', 'REMOTE', 'PROBATION', 'SUSPENDED'],
        is_deleted=False,
        documents__status=Document.Status.ACTIVE
    ).distinct().count()
    
    completion_rate = (employees_with_docs / total_active_emp * 100) if total_active_emp > 0 else 0.0

    return {
        "total_documents": total,
        "documents_by_category": by_cat,
        "recently_uploaded": recent,
        "document_completion_rate": round(completion_rate, 2)
    }

def get_dashboard_overview() -> dict:
    """
    Consolidates critical high-level stats for the landing dashboard.
    """
    now = timezone.now()
    emp = get_employee_analytics()
    att = get_attendance_analytics()
    payroll = get_payroll_analytics()
    
    return {
        "total_employees": emp["total_employees"],
        "active_employees": emp["active_employees"],
        "present_today": att["present_today"],
        "attendance_percentage": att["attendance_percentage"],
        "monthly_payroll": payroll["monthly_payroll_cost"]
    }

def get_chart_data() -> dict:
    """
    Returns chart-ready coordinates for workforce, payroll, and recruitment growths.
    """
    # Employee growth trend (by joining date month)
    growth = list(
        Employee.objects.filter(is_deleted=False).values('joining_date__year', 'joining_date__month')
        .annotate(count=Count('employee_id'))
        .order_by('joining_date__year', 'joining_date__month')
    )
    
    # Payroll trends
    payroll_trends = list(
        Payroll.objects.values('payroll_year', 'payroll_month')
        .annotate(total_cost=Sum('net_salary'))
        .order_by('payroll_year', 'payroll_month')
    )
    
    # Recruitment trends
    recruitment_trends = list(
        Candidate.objects.values('application_date__year', 'application_date__month')
        .annotate(count=Count('id'))
        .order_by('application_date__year', 'application_date__month')
    )

    return {
        "employee_growth": growth,
        "payroll_trends": payroll_trends,
        "recruitment_trends": recruitment_trends
    }

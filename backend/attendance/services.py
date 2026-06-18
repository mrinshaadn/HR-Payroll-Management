from datetime import datetime, date, timedelta
from django.db.models import Count, Q
from .models import Attendance

def calculate_hours(check_in: datetime, check_out: datetime) -> tuple[int, int, int, int]:
    """
    Calculates total working hours, working minutes, overtime hours, and overtime minutes.
    Assumes standard shift of 8 hours.
    """
    if not check_in or not check_out:
        return 0, 0, 0, 0
        
    duration = check_out - check_in
    total_seconds = int(duration.total_seconds())
    if total_seconds < 0:
        total_seconds = 0
        
    total_mins = total_seconds // 60
    total_hours = total_mins // 60
    remaining_mins = total_mins % 60
    
    standard_mins = 8 * 60
    if total_mins > standard_mins:
        ot_mins = total_mins - standard_mins
        overtime_hours = ot_mins // 60
        overtime_minutes = ot_mins % 60
    else:
        overtime_hours = 0
        overtime_minutes = 0
        
    return total_hours, remaining_mins, overtime_hours, overtime_minutes

def get_daily_summary(query_date: date):
    """
    Returns summary statistics for a specific date.
    """
    records = Attendance.objects.filter(date=query_date)
    summary = records.values('status').annotate(count=Count('id'))
    
    counts = {status[0]: 0 for status in Attendance.Status.choices}
    for item in summary:
        status = item['status']
        if status in counts:
            counts[status] = item['count']
            
    counts['total_records'] = records.count()
    return counts

def get_monthly_summary(employee_id: str, year: int, month: int):
    """
    Returns monthly summary statistics for a specific employee.
    """
    import calendar
    from leave_management.models import LeaveRequest
    
    records = Attendance.objects.filter(
        employee__employee_id=employee_id,
        date__year=year,
        date__month=month
    )
    
    counts = {
        'Present': 0,
        'Absent': 0,
        'Late': 0,
        'Half Day': 0,
        'Leave': 0,
    }
    
    total_hours = 0.0
    total_overtime = 0.0
    
    _, num_days = calendar.monthrange(year, month)
    today_date = date.today()
    
    start_of_month = date(year, month, 1)
    end_of_month = date(year, month, num_days)
    
    leaves = LeaveRequest.objects.filter(
        employee__employee_id=employee_id,
        status=LeaveRequest.Status.APPROVED,
        start_date__lte=end_of_month,
        end_date__gte=start_of_month
    )
    
    record_map = {r.date: r for r in records}
    
    for day_num in range(1, num_days + 1):
        d = date(year, month, day_num)
        
        # Don't count future days
        if d > today_date:
            continue
            
        if d in record_map:
            r = record_map[d]
            status = r.status
            if status in counts:
                counts[status] += 1
            # Calculate decimal hours for summary stats
            h_decimal = float(r.total_hours or 0.0) + (float(r.total_minutes or 0.0) / 60.0)
            ot_decimal = float(r.overtime_hours or 0.0) + (float(r.overtime_minutes or 0.0) / 60.0)
            total_hours += h_decimal
            total_overtime += ot_decimal
        else:
            # Only count weekdays (Mon-Fri) for automatic absent/leave
            is_weekday = d.weekday() < 5
            if not is_weekday:
                continue
                
            on_leave = leaves.filter(start_date__lte=d, end_date__gte=d).exists()
            if on_leave:
                counts['Leave'] += 1
            else:
                counts['Absent'] += 1
                
    status_keys = ['Present', 'Late', 'Half Day', 'Absent', 'Leave']
    total_days = sum(counts[k] for k in status_keys)
    
    breakdown = {
        "present": 0,
        "late": 0,
        "half_day": 0,
        "absent": 0,
        "leave": 0
    }
    if total_days > 0:
        p_pres = round((counts['Present'] / total_days) * 100)
        p_late = round((counts['Late'] / total_days) * 100)
        p_half = round((counts['Half Day'] / total_days) * 100)
        p_abs = round((counts['Absent'] / total_days) * 100)
        p_lv = round((counts['Leave'] / total_days) * 100)
        
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

    counts['total_hours_worked'] = round(total_hours, 2)
    counts['total_overtime'] = round(total_overtime, 2)
    counts['total_days'] = total_days
    counts['breakdown'] = breakdown
    return counts

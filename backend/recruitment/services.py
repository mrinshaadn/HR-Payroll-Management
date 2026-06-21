from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from .models import Candidate, JobOpening, Interview, RecruitmentStage

def log_recruitment_stage(candidate: Candidate, stage: str, user, remarks: str = '') -> RecruitmentStage:
    """
    Registers a transition event in the RecruitmentStage history log.
    """
    return RecruitmentStage.objects.create(
        candidate=candidate,
        current_stage=stage,
        remarks=remarks,
        updated_by=user
    )

@transaction.atomic
def schedule_candidate_interview(
    candidate_id: int,
    job_opening_id: int,
    interviewer,
    interview_date,
    interview_type: str,
    user,
    interview_round: str = 'HR Screening'
) -> Interview:
    """
    Schedules an interview for a candidate, validating current eligibility.
    """
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        raise ValueError("Candidate not found.")

    if candidate.status == Candidate.Status.REJECTED:
        raise ValueError("Cannot schedule an interview for a rejected candidate.")

    try:
        job = JobOpening.objects.get(id=job_opening_id)
    except JobOpening.DoesNotExist:
        raise ValueError("Job opening not found.")

    interview = Interview.objects.create(
        candidate=candidate,
        job_opening=job,
        interviewer=interviewer,
        interview_date=interview_date,
        interview_type=interview_type,
        interview_round=interview_round,
        status=Interview.Status.SCHEDULED
    )

    # Automatically transition candidate status
    candidate.status = Candidate.Status.INTERVIEW_SCHEDULED
    candidate.save()

    # Log stage change
    log_recruitment_stage(
        candidate=candidate,
        stage="Interview Scheduled",
        user=user,
        remarks=f"Interview scheduled ({interview_round}) on {interview_date}"
    )

    return interview

def get_recruitment_funnel_stats():
    """
    Aggregates stage counts for recruitment funnel charts.
    """
    stats = Candidate.objects.values('status').annotate(count=Count('id'))
    return {item['status']: item['count'] for item in stats}

def get_recruitment_analytics():
    """
    Provides KPI statistics and chart data for the recruitment dashboard and reports.
    """
    # 1. KPI Counts
    open_vacancies = JobOpening.objects.filter(status=JobOpening.Status.OPEN).count()
    total_candidates = Candidate.objects.count()
    
    today = timezone.localtime().date()
    interviews_today = Interview.objects.filter(
        interview_date__date=today
    ).count()
    
    selected_candidates = Candidate.objects.filter(status=Candidate.Status.SELECTED).count()
    rejected_candidates = Candidate.objects.filter(status=Candidate.Status.REJECTED).count()
    
    # 2. Candidate Source Distribution
    source_stats = Candidate.objects.values('source').annotate(count=Count('id')).order_by('-count')
    source_distribution = [
        {"source": item['source'] or 'Unknown', "count": item['count']}
        for item in source_stats
    ]
    
    # 3. Recruitment Funnel
    funnel_stats = Candidate.objects.values('status').annotate(count=Count('id'))
    funnel = [
        {"stage": item['status'], "value": item['count']}
        for item in funnel_stats
    ]
    
    # 4. Hiring Trend (by application date month)
    hiring_stats = Candidate.objects.values('application_date__year', 'application_date__month').annotate(
        count=Count('id')
    ).order_by('application_date__year', 'application_date__month')
    
    hiring_trend = [
        {
            "date": f"{item['application_date__year']}-{str(item['application_date__month']).zfill(2)}",
            "candidates": item['count']
        }
        for item in hiring_stats
    ]
    
    # 5. Interview Success Rate
    total_interviews = Interview.objects.count()
    completed_interviews = Interview.objects.filter(status=Interview.Status.COMPLETED).count()
    success_rate = (completed_interviews / total_interviews * 100) if total_interviews > 0 else 75.0
    
    return {
        "open_vacancies": open_vacancies,
        "total_candidates": total_candidates,
        "interviews_today": interviews_today,
        "selected_candidates": selected_candidates,
        "rejected_candidates": rejected_candidates,
        "source_distribution": source_distribution,
        "funnel": funnel,
        "hiring_trend": hiring_trend,
        "interview_success_rate": round(success_rate, 2)
    }

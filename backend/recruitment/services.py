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
    user
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
        remarks=f"Interview scheduled on {interview_date}"
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
    Provides KPI statistics for open vacancies and hiring success.
    """
    open_jobs = JobOpening.objects.filter(status=JobOpening.Status.OPEN).count()
    total_candidates = Candidate.objects.count()
    
    selected = Candidate.objects.filter(status=Candidate.Status.SELECTED).count()
    hiring_rate = (selected / total_candidates * 100) if total_candidates > 0 else 0.0
    
    job_ratios = JobOpening.objects.annotate(
        candidate_count=Count('candidates')
    ).values('job_title', 'candidate_count')
    
    return {
        "open_positions": open_jobs,
        "total_candidates": total_candidates,
        "hiring_rate_percentage": round(hiring_rate, 2),
        "job_ratios": list(job_ratios)
    }

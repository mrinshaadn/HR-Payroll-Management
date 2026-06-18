from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import JobOpening, Candidate, Interview
from .serializers import JobOpeningSerializer, CandidateSerializer, InterviewSerializer
from .services import (
    schedule_candidate_interview,
    log_recruitment_stage,
    get_recruitment_analytics,
    get_recruitment_funnel_stats
)
from accounts.permissions import IsAdminOrHR, IsManagerOrHROrAdmin
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer
from rest_framework import serializers

User = get_user_model()

@extend_schema(
    responses={200: JobOpeningSerializer(many=True)},
    summary="Get Open Job Openings",
    description="Returns list of all recruitment job openings currently in OPEN status.",
    tags=['Recruitment']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManagerOrHROrAdmin])
def open_jobs_api(request):
    """
    Returns only open JobOpening positions.
    """
    jobs = JobOpening.objects.filter(status=JobOpening.Status.OPEN).order_by('-posted_date')
    serializer = JobOpeningSerializer(jobs, many=True)
    return Response(serializer.data)

@extend_schema(
    request=inline_serializer(
        name='ShortlistCandidateRequest',
        fields={
            'candidate_id': serializers.IntegerField(help_text="Candidate ID"),
        }
    ),
    responses={200: CandidateSerializer},
    summary="Shortlist Candidate",
    description="Updates candidate status to SHORTLISTED and logs a stage progress entry.",
    tags=['Recruitment']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def shortlist_candidate_api(request):
    """
    Shortlists an active candidate and logs the stage update.
    """
    candidate_id = request.data.get('candidate_id')
    if not candidate_id:
        return Response(
            {"detail": "candidate_id parameter is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response(
            {"detail": "Candidate not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    candidate.status = Candidate.Status.SHORTLISTED
    candidate.save()

    # Log stage change
    log_recruitment_stage(
        candidate=candidate,
        stage="Shortlisted",
        user=request.user,
        remarks="Candidate shortlisted for review"
    )

    serializer = CandidateSerializer(candidate)
    return Response(serializer.data)

@extend_schema(
    request=inline_serializer(
        name='ScheduleInterviewRequest',
        fields={
            'candidate_id': serializers.IntegerField(),
            'job_opening_id': serializers.IntegerField(),
            'interviewer_id': serializers.IntegerField(help_text="User ID of interviewer"),
            'interview_date': serializers.CharField(help_text="YYYY-MM-DD HH:MM"),
            'interview_type': serializers.CharField(default="Online"),
        }
    ),
    responses={201: InterviewSerializer},
    summary="Schedule Candidate Interview",
    description="Schedules a phone/online/offline interview session with a selected interviewer.",
    tags=['Recruitment']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def schedule_interview_api(request):
    """
    Triggers scheduling flow for candidate interviews.
    """
    candidate_id = request.data.get('candidate_id')
    job_opening_id = request.data.get('job_opening_id')
    interviewer_id = request.data.get('interviewer_id')
    interview_date = request.data.get('interview_date')
    interview_type = request.data.get('interview_type', 'Online')

    if not (candidate_id and job_opening_id and interviewer_id and interview_date):
        return Response(
            {"detail": "candidate_id, job_opening_id, interviewer_id, and interview_date are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        interviewer = User.objects.get(id=interviewer_id)
    except User.DoesNotExist:
        return Response(
            {"detail": "Interviewer user not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        interview = schedule_candidate_interview(
            candidate_id=candidate_id,
            job_opening_id=job_opening_id,
            interviewer=interviewer,
            interview_date=interview_date,
            interview_type=interview_type,
            user=request.user
        )
        serializer = InterviewSerializer(interview)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@extend_schema(
    responses={
        200: inline_serializer(
            name='RecruitmentModuleReportsResponse',
            fields={
                'funnel': serializers.DictField(),
            }
        )
    },
    summary="Get Recruitment Funnel Reports",
    description="Generates recruitment funnel stages statistics and ratios.",
    tags=['Recruitment']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManagerOrHROrAdmin])
def recruitment_reports_api(request):
    """
    Generates funnel reports.
    """
    funnel = get_recruitment_funnel_stats()
    return Response({"funnel": funnel})

@extend_schema(
    responses={
        200: inline_serializer(
            name='RecruitmentModuleAnalyticsResponse',
            fields={
                'open_vacancies': serializers.IntegerField(),
                'total_candidates': serializers.IntegerField(),
                'interviews_scheduled': serializers.IntegerField(),
            }
        )
    },
    summary="Get Recruitment Analytics",
    description="Aggregates and returns recruitment metrics summary.",
    tags=['Recruitment']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManagerOrHROrAdmin])
def recruitment_analytics_api(request):
    """
    Generates statistics on open vacancies and hiring ratios.
    """
    analytics = get_recruitment_analytics()
    return Response(analytics)

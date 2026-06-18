from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import (
    JobOpeningViewSet,
    CandidateViewSet,
    InterviewViewSet,
    RecruitmentStageViewSet
)
from .views import (
    open_jobs_api,
    shortlist_candidate_api,
    schedule_interview_api,
    recruitment_reports_api,
    recruitment_analytics_api
)

router = DefaultRouter()
router.register(r'recruitment/jobs', JobOpeningViewSet, basename='recruitment-job')
router.register(r'recruitment/candidates', CandidateViewSet, basename='recruitment-candidate')
router.register(r'recruitment/interviews', InterviewViewSet, basename='recruitment-interview')
router.register(r'recruitment/stages', RecruitmentStageViewSet, basename='recruitment-stage')

urlpatterns = [
    # Custom actions mapped before router to prevent collision
    path('recruitment/jobs/open/', open_jobs_api, name='recruitment-jobs-open'),
    path('recruitment/candidates/shortlist/', shortlist_candidate_api, name='recruitment-candidates-shortlist'),
    path('recruitment/interviews/schedule/', schedule_interview_api, name='recruitment-interviews-schedule'),
    path('recruitment/reports/', recruitment_reports_api, name='recruitment-reports'),
    path('recruitment/analytics/', recruitment_analytics_api, name='recruitment-analytics'),
    
    # Standard CRUD endpoints
    path('', include(router.urls)),
]

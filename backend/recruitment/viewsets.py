from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import JobOpening, Candidate, Interview, RecruitmentStage
from .serializers import (
    JobOpeningSerializer,
    CandidateSerializer,
    InterviewSerializer,
    RecruitmentStageSerializer
)
from accounts.permissions import IsAdminOrHR, IsManagerOrHROrAdmin

class JobOpeningViewSet(viewsets.ModelViewSet):
    queryset = JobOpening.objects.all().order_by('-posted_date')
    serializer_class = JobOpeningSerializer
    permission_classes = [IsAuthenticated, IsManagerOrHROrAdmin]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminOrHR()]
        return super().get_permissions()

class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.all().order_by('-application_date')
    serializer_class = CandidateSerializer
    permission_classes = [IsAuthenticated, IsManagerOrHROrAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'skills']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminOrHR()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

class InterviewViewSet(viewsets.ModelViewSet):
    queryset = Interview.objects.all().order_by('-interview_date')
    serializer_class = InterviewSerializer
    permission_classes = [IsAuthenticated, IsManagerOrHROrAdmin]

    def get_permissions(self):
        # View level overrides are checked via has_object_permission
        return super().get_permissions()

class RecruitmentStageViewSet(viewsets.ModelViewSet):
    queryset = RecruitmentStage.objects.all().order_by('-updated_at')
    serializer_class = RecruitmentStageSerializer
    permission_classes = [IsAuthenticated, IsManagerOrHROrAdmin]

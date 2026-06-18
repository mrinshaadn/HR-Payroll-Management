from django.contrib import admin
from .models import JobOpening, Candidate, Interview, RecruitmentStage

@admin.register(JobOpening)
class JobOpeningAdmin(admin.ModelAdmin):
    list_display = ('id', 'job_title', 'department', 'designation', 'vacancies', 'status')
    list_filter = ('status', 'department')
    search_fields = ('job_title', 'description')
    ordering = ('-posted_date',)

@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'email', 'job_opening', 'status')
    list_filter = ('status', 'job_opening')
    search_fields = ('first_name', 'last_name', 'email', 'phone')
    ordering = ('-application_date',)

@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'candidate', 'job_opening', 'interviewer', 'interview_date', 'status')
    list_filter = ('status', 'interview_type')
    search_fields = ('candidate__first_name', 'candidate__last_name', 'interviewer__username')
    ordering = ('-interview_date',)
    raw_id_fields = ('candidate', 'job_opening', 'interviewer')

@admin.register(RecruitmentStage)
class RecruitmentStageAdmin(admin.ModelAdmin):
    list_display = ('id', 'candidate', 'current_stage', 'updated_at', 'updated_by')
    list_filter = ('current_stage',)
    search_fields = ('candidate__first_name', 'candidate__last_name')
    ordering = ('-updated_at',)
    raw_id_fields = ('candidate', 'updated_by')

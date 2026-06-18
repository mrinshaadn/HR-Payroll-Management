from rest_framework import serializers
from .models import JobOpening, Candidate, Interview, RecruitmentStage

class JobOpeningSerializer(serializers.ModelSerializer):
    department_name = serializers.ReadOnlyField(source='department.name')
    designation_name = serializers.ReadOnlyField(source='designation.name')
    candidate_count = serializers.IntegerField(source='candidates.count', read_only=True)

    class Meta:
        model = JobOpening
        fields = '__all__'

class CandidateSerializer(serializers.ModelSerializer):
    job_title = serializers.ReadOnlyField(source='job_opening.job_title')

    class Meta:
        model = Candidate
        fields = '__all__'

class InterviewSerializer(serializers.ModelSerializer):
    candidate_name = serializers.SerializerMethodField()
    job_title = serializers.ReadOnlyField(source='job_opening.job_title')
    interviewer_name = serializers.ReadOnlyField(source='interviewer.username')

    class Meta:
        model = Interview
        fields = '__all__'

    from drf_spectacular.utils import extend_schema_field

    @extend_schema_field(serializers.CharField())
    def get_candidate_name(self, obj):
        return f"{obj.candidate.first_name} {obj.candidate.last_name}"

class RecruitmentStageSerializer(serializers.ModelSerializer):
    candidate_name = serializers.SerializerMethodField()
    updated_by_name = serializers.ReadOnlyField(source='updated_by.username')

    class Meta:
        model = RecruitmentStage
        fields = '__all__'

    from drf_spectacular.utils import extend_schema_field

    @extend_schema_field(serializers.CharField())
    def get_candidate_name(self, obj):
        return f"{obj.candidate.first_name} {obj.candidate.last_name}"

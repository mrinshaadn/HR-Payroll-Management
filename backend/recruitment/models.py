from django.db import models
from django.conf import settings

class JobOpening(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'Draft', 'Draft'
        OPEN = 'Open', 'Open'
        CLOSED = 'Closed', 'Closed'
        ON_HOLD = 'On Hold', 'On Hold'

    job_title = models.CharField(max_length=150)
    department = models.ForeignKey(
        'employees.Department',
        on_delete=models.PROTECT,
        related_name='job_openings'
    )
    designation = models.ForeignKey(
        'employees.Designation',
        on_delete=models.PROTECT,
        related_name='job_openings'
    )
    description = models.TextField()
    required_skills = models.TextField()
    experience_required = models.CharField(max_length=100)
    employment_type = models.CharField(max_length=50)  # Full-Time, Part-Time, Contract
    location = models.CharField(max_length=100)
    salary_range = models.CharField(max_length=100)
    vacancies = models.IntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN
    )
    posted_date = models.DateField(auto_now_add=True)
    closing_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.job_title} - {self.department.name} ({self.status})"

class Candidate(models.Model):
    class Status(models.TextChoices):
        APPLIED = 'Applied', 'Applied'
        SCREENING = 'Screening', 'Screening'
        SHORTLISTED = 'Shortlisted', 'Shortlisted'
        INTERVIEW_SCHEDULED = 'Interview Scheduled', 'Interview Scheduled'
        INTERVIEW_COMPLETED = 'Interview Completed', 'Interview Completed'
        SELECTED = 'Selected', 'Selected'
        REJECTED = 'Rejected', 'Rejected'

    job_opening = models.ForeignKey(
        JobOpening,
        on_delete=models.CASCADE,
        related_name='candidates'
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    address = models.TextField(blank=True, null=True)
    resume = models.FileField(upload_to='resumes/', blank=True, null=True)
    skills = models.TextField()
    experience = models.CharField(max_length=100)
    education = models.CharField(max_length=150)
    source = models.CharField(max_length=100, blank=True, null=True)  # LinkedIn, Agency, Website
    application_date = models.DateField(auto_now_add=True)
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.APPLIED
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('email', 'job_opening')

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.job_opening.job_title}"

class Interview(models.Model):
    class Type(models.TextChoices):
        ONLINE = 'Online', 'Online'
        OFFLINE = 'Offline', 'Offline'
        PHONE = 'Phone', 'Phone'

    class Status(models.TextChoices):
        SCHEDULED = 'Scheduled', 'Scheduled'
        COMPLETED = 'Completed', 'Completed'
        CANCELLED = 'Cancelled', 'Cancelled'

    class Round(models.TextChoices):
        HR_SCREENING = 'HR Screening', 'HR Screening'
        TECHNICAL_ROUND = 'Technical Round', 'Technical Round'
        MANAGER_ROUND = 'Manager Round', 'Manager Round'
        FINAL_ROUND = 'Final Round', 'Final Round'

    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name='interviews'
    )
    job_opening = models.ForeignKey(
        JobOpening,
        on_delete=models.CASCADE,
        related_name='interviews'
    )
    interviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='assigned_interviews'
    )
    interview_date = models.DateTimeField()
    interview_type = models.CharField(
        max_length=20,
        choices=Type.choices,
        default=Type.ONLINE
    )
    interview_round = models.CharField(
        max_length=50,
        choices=Round.choices,
        default=Round.HR_SCREENING
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED
    )
    feedback = models.TextField(blank=True, null=True)
    rating = models.IntegerField(blank=True, null=True)  # Rating from 1 to 5
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Interview for {self.candidate.first_name} by {self.interviewer.username} ({self.status})"

class RecruitmentStage(models.Model):
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name='stages'
    )
    current_stage = models.CharField(max_length=50)
    remarks = models.TextField(blank=True, null=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.candidate.first_name} moved to {self.current_stage}"

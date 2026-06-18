from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from employees.models import Department, Designation
from recruitment.models import JobOpening, Candidate, Interview

User = get_user_model()

class RecruitmentModuleTests(APITestCase):
    def setUp(self):
        # Users
        self.hr = User.objects.create_user(
            username='hr_test', email='hr@t.com', password='pwd', role='HR'
        )
        self.emp_user = User.objects.create_user(
            username='emp_user', email='emp@t.com', password='pwd', role='EMPLOYEE'
        )

        # Department & Designation
        self.dept = Department.objects.create(name="Engineering")
        self.desig = Designation.objects.create(name="Developer", department=self.dept)

        # Job opening
        self.job = JobOpening.objects.create(
            job_title="Python Developer", department=self.dept, designation=self.desig,
            vacancies=3, status='Open'
        )

        # Candidate
        self.candidate = Candidate.objects.create(
            first_name="Alice", last_name="Smith", email="alice@test.com", status='Applied',
            job_opening=self.job
        )

    def test_employee_is_blocked_from_recruitment(self):
        self.client.force_authenticate(user=self.emp_user)

        # Try GET job list (uses router basename='recruitment-job' → 'recruitment-job-list')
        url_jobs = reverse('recruitment-job-list')
        response = self.client.get(url_jobs)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Try POST candidate shortlist
        url_shortlist = reverse('recruitment-candidates-shortlist')
        response_post = self.client.post(url_shortlist, {'candidate_id': self.candidate.id})
        self.assertEqual(response_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_hr_can_manage_recruitment(self):
        self.client.force_authenticate(user=self.hr)

        # Get job openings (router basename='recruitment-job' → 'recruitment-job-list')
        url_jobs = reverse('recruitment-job-list')
        response = self.client.get(url_jobs)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Shortlist candidate
        url_shortlist = reverse('recruitment-candidates-shortlist')
        response_post = self.client.post(url_shortlist, {'candidate_id': self.candidate.id})
        self.assertEqual(response_post.status_code, status.HTTP_200_OK)
        self.candidate.refresh_from_db()
        self.assertEqual(self.candidate.status, 'Shortlisted')

        # Schedule interview
        url_schedule = reverse('recruitment-interviews-schedule')
        interview_data = {
            'candidate_id': self.candidate.id,
            'job_opening_id': self.job.id,
            'interviewer_id': self.hr.id,
            'interview_date': '2026-06-20 14:00',
            'interview_type': 'Online'
        }
        response_schedule = self.client.post(url_schedule, interview_data)
        self.assertEqual(response_schedule.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Interview.objects.filter(candidate=self.candidate).count(), 1)

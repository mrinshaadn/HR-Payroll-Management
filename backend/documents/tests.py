from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from employees.models import Department, Designation, Employee
from documents.models import DocumentCategory, Document, DocumentAccessLog

User = get_user_model()

class DocumentsModuleTests(APITestCase):
    def setUp(self):
        # Users
        self.hr = User.objects.create_user(
            username='hr_test', email='hr@t.com', password='pwd', role='HR'
        )
        self.emp_user1 = User.objects.create_user(
            username='emp1_user', email='emp1@t.com', password='pwd', role='EMPLOYEE'
        )
        self.emp_user2 = User.objects.create_user(
            username='emp2_user', email='emp2@t.com', password='pwd', role='EMPLOYEE'
        )

        # Department & Designation (required FKs)
        self.dept = Department.objects.create(name="Operations", description="Operations Dept")
        self.desig = Designation.objects.create(name="Staff", department=self.dept)

        # Profiles
        self.emp1 = Employee.objects.create(
            employee_id="EMP001", user=self.emp_user1, first_name="Emp", last_name="One",
            email="emp1@t.com", department=self.dept, designation=self.desig,
            employment_status="ACTIVE"
        )
        self.emp2 = Employee.objects.create(
            employee_id="EMP002", user=self.emp_user2, first_name="Emp", last_name="Two",
            email="emp2@t.com", department=self.dept, designation=self.desig,
            employment_status="ACTIVE"
        )

        # Category
        self.category = DocumentCategory.objects.create(name="Contracts", description="Contracts folder")

        # Create dummy file
        self.dummy_file = SimpleUploadedFile("contract.pdf", b"dummy PDF content", content_type="application/pdf")

        # Document belonging to Emp 1
        self.doc1 = Document.objects.create(
            title="Emp 1 Contract",
            category=self.category,
            employee=self.emp1,
            uploaded_by=self.hr,
            file=self.dummy_file,
            file_type=".pdf",
            file_size=17,
            status='Active'
        )

    def test_document_list_isolation(self):
        list_url = reverse('document-list')

        # Employee 1: should only see their own contract
        self.client.force_authenticate(user=self.emp_user1)
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Emp 1 Contract")

        # Employee 2: should see zero documents
        self.client.force_authenticate(user=self.emp_user2)
        response_emp2 = self.client.get(list_url)
        self.assertEqual(response_emp2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_emp2.data), 0)

    def test_download_document_authorization(self):
        download_url = reverse('document-download')

        # Employee 1: authorized to download own document
        self.client.force_authenticate(user=self.emp_user1)
        response = self.client.get(download_url, {'document_id': self.doc1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Employee 2: unauthorized (403)
        self.client.force_authenticate(user=self.emp_user2)
        response_unauth = self.client.get(download_url, {'document_id': self.doc1.id})
        self.assertEqual(response_unauth.status_code, status.HTTP_403_FORBIDDEN)

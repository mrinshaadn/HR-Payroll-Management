from django.contrib.auth.models import AbstractUser
from django.db import models
class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        HR = 'HR', 'HR'
        EMPLOYEE = 'EMPLOYEE', 'Employee'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.EMPLOYEE
    )
    
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    avatar = models.URLField(max_length=300, blank=True, null=True)
    
    # User preferences
    theme = models.CharField(max_length=20, default='dark')
    language = models.CharField(max_length=20, default='en')
    dashboard_preferences = models.JSONField(default=dict, blank=True)
    
    # Notification settings
    email_notifications = models.BooleanField(default=True)
    attendance_notifications = models.BooleanField(default=True)
    leave_notifications = models.BooleanField(default=True)
    payroll_notifications = models.BooleanField(default=True)
    recruitment_notifications = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        # Safeguard: prevent role demotion/overwrite for existing HR/Admin users to EMPLOYEE
        if self.pk:
            try:
                original = User.objects.get(pk=self.pk)
                if original.role in [self.Role.ADMIN, self.Role.HR] and self.role == self.Role.EMPLOYEE:
                    self.role = original.role
            except User.DoesNotExist:
                pass
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"

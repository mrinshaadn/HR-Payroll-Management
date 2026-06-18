from django.db import models

class DashboardMetric(models.Model):
    metric_name = models.CharField(max_length=150)
    metric_value = models.JSONField(default=dict)
    metric_type = models.CharField(max_length=50)  # employee, attendance, leave, payroll, recruitment, documents, overview
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.metric_name} ({self.metric_type}) at {self.generated_at}"

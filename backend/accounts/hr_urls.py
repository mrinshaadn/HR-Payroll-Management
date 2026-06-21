from django.urls import path
from .views import (
    hr_list_create_api,
    hr_detail_update_delete_api,
    hr_toggle_status_api
)

urlpatterns = [
    path('', hr_list_create_api, name='hr_list_create'),
    path('<int:pk>/', hr_detail_update_delete_api, name='hr_detail_update_delete'),
    path('<int:pk>/status/', hr_toggle_status_api, name='hr_toggle_status'),
]

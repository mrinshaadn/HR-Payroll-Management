from django.urls import path
from .views import (
    user_profile,
    users_list_create_api,
    toggle_user_active_api,
    reset_user_password_api
)

urlpatterns = [
    path('profile/', user_profile, name='user_profile'),
    path('users/', users_list_create_api, name='users_list_create'),
    path('users/<int:pk>/toggle-active/', toggle_user_active_api, name='user_toggle_active'),
    path('users/<int:pk>/reset-password/', reset_user_password_api, name='user_reset_password'),
]

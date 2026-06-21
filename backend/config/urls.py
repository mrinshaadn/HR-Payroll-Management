from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from accounts.views import (
    me_view,
    permissions_view,
    change_password_view,
    settings_profile_view,
    settings_preferences_view,
    settings_notifications_view
)
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Documentation Schema and UIs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Auth endpoints
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', me_view, name='auth_me'),
    path('api/auth/permissions/', permissions_view, name='auth_permissions'),
    path('api/auth/change-password/', change_password_view, name='change_password'),
    
    # Settings endpoints
    path('api/settings/profile/', settings_profile_view, name='settings_profile'),
    path('api/settings/preferences/', settings_preferences_view, name='settings_preferences'),
    path('api/settings/notifications/', settings_notifications_view, name='settings_notifications'),
    
    # App modules API placeholders
    path('api/accounts/', include('accounts.urls')),
    path('api/hr/', include('accounts.hr_urls')),
    path('api/', include('employees.urls')),
    path('api/', include('attendance.urls')),
    path('api/', include('leave_management.urls')),
    path('api/', include('payroll.urls')),
    path('api/', include('recruitment.urls')),
    path('api/', include('documents.urls')),
    path('api/', include('analytics.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


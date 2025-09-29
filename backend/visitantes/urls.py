from rest_framework.routers import DefaultRouter
from .views import HistorialVisitaViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r'historial-visitas', HistorialVisitaViewSet, basename='historialvisita')

urlpatterns = [
    path('', include(router.urls)),
]

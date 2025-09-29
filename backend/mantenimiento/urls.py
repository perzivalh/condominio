from rest_framework.routers import DefaultRouter
from .views import MantenimientoViewSet, ResponsableViewSet
from django.urls import path, include

router = DefaultRouter()

router.register(r'mantenimientos', MantenimientoViewSet, basename='mantenimiento')
router.register(r"responsables", ResponsableViewSet, basename="responsables")

urlpatterns = [
    path('', include(router.urls)),
]
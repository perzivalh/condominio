from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RolViewSet, UsuarioViewSet, ViviendaViewSet, ResidenteViewSet,
    VehiculoViewSet, AvisoViewSet, CondominioViewSet,
    recuperar_password, reset_password
)

router = DefaultRouter()
router.register(r'roles', RolViewSet)
router.register(r'usuarios', UsuarioViewSet)
router.register(r'viviendas', ViviendaViewSet)
router.register(r'residentes', ResidenteViewSet)
router.register(r'vehiculos', VehiculoViewSet)
router.register(r'avisos', AvisoViewSet)
router.register(r'condominios', CondominioViewSet)   # 👈 nuevo endpoint

urlpatterns = [
    path('', include(router.urls)),
    path('recuperar-password/', recuperar_password),
    path('reset-password/', reset_password),
]

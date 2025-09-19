from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    RolViewSet, UsuarioViewSet, ViviendaViewSet, ResidenteViewSet,
    VehiculoViewSet, AvisoViewSet, CondominioViewSet,
    recuperar_password, reset_password, perfil
)
from .finanzas.views import resumen_finanzas, lista_facturas, detalle_factura

router = DefaultRouter()
router.register(r'roles', RolViewSet)
router.register(r'usuarios', UsuarioViewSet)
router.register(r'viviendas', ViviendaViewSet)
router.register(r'residentes', ResidenteViewSet)
router.register(r'vehiculos', VehiculoViewSet)
router.register(r'avisos', AvisoViewSet)
router.register(r'condominios', CondominioViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('recuperar-password/', recuperar_password),
    path('reset-password/', reset_password),
    path('perfil/', perfil),
    path('finanzas/resumen/', resumen_finanzas),
    path('finanzas/facturas/', lista_facturas),
    path('finanzas/facturas/<uuid:pk>/', detalle_factura),
]

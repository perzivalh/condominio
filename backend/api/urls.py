from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    RolViewSet, UsuarioViewSet, ViviendaViewSet, ResidenteViewSet,
    VehiculoViewSet, AvisoViewSet, CondominioViewSet,
    recuperar_password, reset_password, perfil
)
from .finanzas.views import (
    catalogo_multa_detalle,
    catalogo_multas,
    configuracion_expensa_detalle,
    configuraciones_expensa,
    generar_facturas_admin,
    lista_facturas,
    detalle_factura,
    multas_aplicadas,
    multa_aplicada_detalle,
    resumen_finanzas,
    resumen_finanzas_admin,
)

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
    path('finanzas/admin/resumen/', resumen_finanzas_admin),
    path('finanzas/admin/generar-facturas/', generar_facturas_admin),
    path('finanzas/facturas/', lista_facturas),
    path('finanzas/facturas/<uuid:pk>/', detalle_factura),
    path('finanzas/config/expensas/', configuraciones_expensa),
    path('finanzas/config/expensas/<uuid:pk>/', configuracion_expensa_detalle),
    path('finanzas/config/multas/', multas_aplicadas),
    path('finanzas/config/multas/<uuid:pk>/', multa_aplicada_detalle),
    path('finanzas/config/multas/catalogo/', catalogo_multas),
    path('finanzas/config/multas/catalogo/<uuid:pk>/', catalogo_multa_detalle),
]

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
    codigo_qr_admin,
    codigo_qr_residente,
    configuracion_expensa_detalle,
    configuraciones_expensa,
    detalle_factura,
    factura_residente_pdf,
    factura_admin_detalle,
    factura_admin_pdf,
    facturas_admin,
    generar_facturas_admin,
    marcar_notificacion_leida,
    lista_facturas,
    multas_aplicadas,
    multa_aplicada_detalle,
    notificaciones_directas_admin,
    notificaciones_residente,
    registrar_pago_manual,
    resolver_pago_revision,
    resumen_finanzas,
    resumen_finanzas_admin,
    confirmar_pago_factura,
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
    path('finanzas/admin/facturas/', facturas_admin),
    path('finanzas/admin/facturas/<uuid:pk>/', factura_admin_detalle),
    path('finanzas/admin/facturas/<uuid:pk>/pdf/', factura_admin_pdf),
    path('finanzas/admin/facturas/<uuid:pk>/registrar-pago/', registrar_pago_manual),
    path('finanzas/admin/facturas/<uuid:factura_pk>/pagos/<uuid:pago_pk>/resolver/', resolver_pago_revision),
    path('finanzas/admin/generar-facturas/', generar_facturas_admin),
    path('finanzas/admin/codigo-qr/', codigo_qr_admin),
    path('finanzas/admin/notificaciones/', notificaciones_directas_admin),
    path('finanzas/facturas/', lista_facturas),
    path('finanzas/facturas/<uuid:pk>/', detalle_factura),
    path('finanzas/facturas/<uuid:pk>/pdf/', factura_residente_pdf),
    path('finanzas/facturas/<uuid:pk>/confirmar-pago/', confirmar_pago_factura),
    path('finanzas/codigo-qr/', codigo_qr_residente),
    path('finanzas/notificaciones/', notificaciones_residente),
    path('finanzas/notificaciones/<uuid:pk>/leida/', marcar_notificacion_leida),
    path('finanzas/config/expensas/', configuraciones_expensa),
    path('finanzas/config/expensas/<uuid:pk>/', configuracion_expensa_detalle),
    path('finanzas/config/multas/', multas_aplicadas),
    path('finanzas/config/multas/<uuid:pk>/', multa_aplicada_detalle),
    path('finanzas/config/multas/catalogo/', catalogo_multas),
    path('finanzas/config/multas/catalogo/<uuid:pk>/', catalogo_multa_detalle),
]

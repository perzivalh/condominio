from decimal import Decimal

from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Factura, Pago, ResidenteVivienda, Usuario
from .serializers import FacturaSerializer, PagoSerializer


def _obtener_vivienda_actual(usuario_auth):
    try:
        usuario = Usuario.objects.select_related("residente").get(user=usuario_auth)
    except Usuario.DoesNotExist as exc:
        raise ValueError("El usuario autenticado no tiene perfil asociado") from exc

    if not hasattr(usuario, "residente") or usuario.residente is None:
        raise ValueError("El usuario autenticado no tiene residente vinculado")

    relacion = (
        ResidenteVivienda.objects.select_related("vivienda")
        .filter(residente=usuario.residente, fecha_hasta__isnull=True)
        .order_by("-fecha_desde")
        .first()
    )
    if not relacion:
        raise ValueError("El residente no tiene una vivienda activa asignada")
    return relacion.vivienda


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resumen_finanzas(request):
    try:
        vivienda = _obtener_vivienda_actual(request.user)
    except ValueError as error:
        return Response({"detail": str(error)}, status=400)

    facturas_vivienda = Factura.objects.filter(vivienda=vivienda)
    pendientes = facturas_vivienda.filter(estado__iexact="PENDIENTE")

    total_pendiente = pendientes.aggregate(total=Sum("monto"))['total'] or Decimal("0")
    factura_mas_antigua = pendientes.order_by("fecha_vencimiento", "fecha_emision", "periodo").first()

    data = {
        "vivienda_id": str(vivienda.id),
        "vivienda_codigo": vivienda.codigo_unidad,
        "total_pendiente": str(total_pendiente),
        "cantidad_pendiente": pendientes.count(),
        "factura_mas_antigua": FacturaSerializer(factura_mas_antigua).data if factura_mas_antigua else None,
        "facturas_pendientes": FacturaSerializer(pendientes.order_by("-fecha_emision"), many=True).data,
    }
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_facturas(request):
    try:
        vivienda = _obtener_vivienda_actual(request.user)
    except ValueError as error:
        return Response({"detail": str(error)}, status=400)

    estado = request.query_params.get("estado")
    facturas = Factura.objects.filter(vivienda=vivienda)

    if estado:
        facturas = facturas.filter(estado__iexact=estado)

    facturas = facturas.order_by("-fecha_vencimiento", "-fecha_emision", "-periodo")
    serializer = FacturaSerializer(facturas, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def detalle_factura(request, pk):
    try:
        vivienda = _obtener_vivienda_actual(request.user)
    except ValueError as error:
        return Response({"detail": str(error)}, status=400)

    factura = get_object_or_404(Factura, pk=pk, vivienda=vivienda)
    pagos = Pago.objects.filter(factura=factura).order_by("-fecha_pago")

    data = {
        "factura": FacturaSerializer(factura).data,
        "pagos": PagoSerializer(pagos, many=True).data,
    }
    return Response(data)

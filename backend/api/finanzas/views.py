from datetime import date
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import TruncMonth, Upper
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Factura, Pago, ResidenteVivienda, Usuario
from .serializers import FacturaSerializer, PagoSerializer


VALID_PAYMENT_STATES = {"APROBADO", "CONFIRMADO", "COMPLETADO", "PAGADO"}
FACTURA_PAID_STATES = {"PAGADO", "PAGADA", "CANCELADO", "CANCELADA"}
MONTH_SHORT_LABELS = {
    1: "ene",
    2: "feb",
    3: "mar",
    4: "abr",
    5: "may",
    6: "jun",
    7: "jul",
    8: "ago",
    9: "sep",
    10: "oct",
    11: "nov",
    12: "dic",
}


def _decimal_to_str(value):
    if value is None:
        value = Decimal("0")
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return f"{value:.2f}"


def _pagos_confirmados_queryset():
    return (
        Pago.objects.annotate(estado_upper=Upper("estado"))
        .filter(estado_upper__in=VALID_PAYMENT_STATES)
        .order_by()
    )


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
def resumen_finanzas_admin(request):
    today = timezone.localdate()
    current_period = today.strftime("%Y-%m")

    ingresos_mes_total = (
        Factura.objects.filter(periodo=current_period).aggregate(total=Sum("monto"))["total"]
        or Decimal("0")
    )

    pagos_confirmados = _pagos_confirmados_queryset()

    pagado_mes_total = (
        pagos_confirmados
        .filter(fecha_pago__year=today.year, fecha_pago__month=today.month)
        .aggregate(total=Sum("monto_pagado"))["total"]
        or Decimal("0")
    )

    pendiente_mes_total = ingresos_mes_total - pagado_mes_total
    if pendiente_mes_total < Decimal("0"):
        pendiente_mes_total = Decimal("0")

    morosidad_total = (
        Factura.objects.filter(estado__iexact="PENDIENTE", fecha_vencimiento__lt=today)
        .aggregate(total=Sum("monto"))["total"]
        or Decimal("0")
    )

    months_to_return = 7
    month_keys = []
    year = today.year
    month = today.month
    for _ in range(months_to_return):
        month_keys.append((year, month))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    month_keys.reverse()

    pagos_por_mes = {
        (row["month"].date() if hasattr(row["month"], "date") else row["month"]): row["total"]
        or Decimal("0")
        for row in (
            pagos_confirmados
            .annotate(month=TruncMonth("fecha_pago"))
            .values("month")
            .annotate(total=Sum("monto_pagado"))
        )
        if row["month"] is not None
    }

    ingresos_mensuales = []
    for year, month in month_keys:
        first_day = date(year, month, 1)
        total_mes = pagos_por_mes.get(first_day, Decimal("0"))
        ingresos_mensuales.append(
            {
                "periodo": first_day.strftime("%Y-%m"),
                "label": MONTH_SHORT_LABELS.get(month, first_day.strftime("%b")).lower(),
                "total": _decimal_to_str(total_mes),
            }
        )

    total_facturas = Factura.objects.count()
    facturas_pagadas = (
        Factura.objects.annotate(estado_upper=Upper("estado"))
        .filter(estado_upper__in=FACTURA_PAID_STATES)
        .count()
    )
    porcentaje_pagadas = 0.0
    if total_facturas:
        porcentaje_pagadas = round((facturas_pagadas / total_facturas) * 100, 2)

    data = {
        "ingresos_mes": _decimal_to_str(ingresos_mes_total),
        "pagado_mes": _decimal_to_str(pagado_mes_total),
        "pendiente_mes": _decimal_to_str(pendiente_mes_total),
        "morosidad_total": _decimal_to_str(morosidad_total),
        "ingresos_mensuales": ingresos_mensuales,
        "facturas": {
            "total_emitidas": total_facturas,
            "total_pagadas": facturas_pagadas,
            "porcentaje_pagadas": porcentaje_pagadas,
        },
    }

    return Response(data)


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

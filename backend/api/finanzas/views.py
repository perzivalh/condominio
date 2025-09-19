from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import TruncMonth, Upper
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import (
    ExpensaConfig,
    Factura,
    FacturaDetalle,
    MultaAplicada,
    MultaConfig,
    Pago,
    ResidenteVivienda,
    Usuario,
    Vivienda,
)
from .serializers import (
    ExpensaConfigSerializer,
    FacturaSerializer,
    MultaAplicadaSerializer,
    MultaConfigSerializer,
    PagoSerializer,
)


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


def _parse_periodo(periodo):
    if not isinstance(periodo, str) or "-" not in periodo:
        raise ValueError("El periodo debe tener formato YYYY-MM")
    year_part, month_part = periodo.split("-", 1)
    try:
        year = int(year_part)
        month = int(month_part)
        date(year, month, 1)
    except ValueError as exc:
        raise ValueError("El periodo debe tener formato YYYY-MM") from exc
    return year, month


def _expensa_config_por_bloque():
    configuraciones = ExpensaConfig.objects.select_related("condominio")
    resultado = {}
    for config in configuraciones:
        clave = (config.condominio_id, (config.bloque or "").strip().upper())
        resultado[clave] = config
    return resultado


@transaction.atomic
def _generar_facturas_para_periodo(periodo):
    year, month = _parse_periodo(periodo)
    _, last_day = monthrange(year, month)
    fecha_vencimiento = date(year, month, last_day)

    expensas_map = _expensa_config_por_bloque()
    viviendas = Vivienda.objects.select_related("condominio").filter(estado=1)

    resumen = {"creadas": 0, "actualizadas": 0, "sin_cambios": 0}

    for vivienda in viviendas:
        clave = (vivienda.condominio_id, (vivienda.bloque or "").strip().upper())
        expensa_config = expensas_map.get(clave)
        expensa_monto = Decimal("0")
        expensa_descripcion = None
        if expensa_config and expensa_config.esta_activa:
            expensa_monto = Decimal(expensa_config.monto)
            expensa_descripcion = f"Expensa bloque {expensa_config.bloque}"

        multas_pendientes = list(
            MultaAplicada.objects.select_related("multa_config")
            .filter(vivienda=vivienda, factura__isnull=True)
            .order_by("fecha_aplicacion")
        )
        total_multas = sum((Decimal(multa.monto) for multa in multas_pendientes), Decimal("0"))

        total_factura = expensa_monto + total_multas
        if total_factura <= Decimal("0") and not multas_pendientes:
            resumen["sin_cambios"] += 1
            continue

        factura, creada = Factura.objects.get_or_create(
            vivienda=vivienda,
            periodo=periodo,
            tipo="expensa",
            defaults={
                "monto": total_factura,
                "estado": "PENDIENTE",
                "fecha_vencimiento": fecha_vencimiento,
            },
        )

        if not creada and factura.estado.upper() in FACTURA_PAID_STATES:
            resumen["sin_cambios"] += 1
            continue

        if not creada:
            factura.detalles.all().delete()

        detalles_creados = 0
        if expensa_descripcion and expensa_monto > 0:
            FacturaDetalle.objects.create(
                factura=factura,
                descripcion=expensa_descripcion,
                tipo=FacturaDetalle.TIPO_EXPENSA,
                monto=expensa_monto,
            )
            detalles_creados += 1

        for multa in multas_pendientes:
            FacturaDetalle.objects.create(
                factura=factura,
                descripcion=multa.descripcion or multa.multa_config.descripcion or multa.multa_config.nombre,
                tipo=FacturaDetalle.TIPO_MULTA,
                monto=multa.monto,
                multa_aplicada=multa,
            )
            multa.factura = factura
            multa.periodo_facturado = periodo
            multa.save(update_fields=["factura", "periodo_facturado"])
            detalles_creados += 1

        factura.monto = total_factura
        if not factura.fecha_vencimiento:
            factura.fecha_vencimiento = fecha_vencimiento
        factura.save(update_fields=["monto", "fecha_vencimiento"])

        if creada:
            resumen["creadas"] += 1
        else:
            resumen["actualizadas"] += 1

        if detalles_creados == 0:
            resumen["sin_cambios"] += 1

    return resumen


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


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def configuraciones_expensa(request):
    if request.method == "GET":
        queryset = ExpensaConfig.objects.select_related("condominio").order_by("bloque")
        serializer = ExpensaConfigSerializer(queryset, many=True)
        return Response(serializer.data)

    serializer = ExpensaConfigSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    expensa = serializer.save()
    return Response(ExpensaConfigSerializer(expensa).data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def configuracion_expensa_detalle(request, pk):
    expensa = get_object_or_404(ExpensaConfig, pk=pk)

    if request.method == "DELETE":
        expensa.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    partial = request.method == "PATCH"
    serializer = ExpensaConfigSerializer(expensa, data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    expensa = serializer.save()
    return Response(ExpensaConfigSerializer(expensa).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def catalogo_multas(request):
    if request.method == "GET":
        queryset = MultaConfig.objects.all().order_by("nombre")
        serializer = MultaConfigSerializer(queryset, many=True)
        return Response(serializer.data)

    serializer = MultaConfigSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    multa = serializer.save()
    return Response(MultaConfigSerializer(multa).data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def catalogo_multa_detalle(request, pk):
    multa_config = get_object_or_404(MultaConfig, pk=pk)

    if request.method == "DELETE":
        multa_config.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    partial = request.method == "PATCH"
    serializer = MultaConfigSerializer(multa_config, data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    multa_config = serializer.save()
    return Response(MultaConfigSerializer(multa_config).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def multas_aplicadas(request):
    if request.method == "GET":
        queryset = (
            MultaAplicada.objects.select_related("multa_config", "vivienda")
            .filter(factura__isnull=True)
            .order_by("-fecha_aplicacion")
        )
        serializer = MultaAplicadaSerializer(queryset, many=True)
        return Response(serializer.data)

    serializer = MultaAplicadaSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    multa = serializer.save()
    return Response(MultaAplicadaSerializer(multa).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def multa_aplicada_detalle(request, pk):
    multa = get_object_or_404(MultaAplicada, pk=pk)
    if multa.factura_id:
        return Response(
            {"detail": "La multa ya fue incluida en una factura y no puede eliminarse."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    multa.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generar_facturas_admin(request):
    periodo = request.data.get("periodo")
    if not periodo:
        periodo = timezone.localdate().strftime("%Y-%m")

    try:
        resumen = _generar_facturas_para_periodo(periodo)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    data = {
        "periodo": periodo,
        "creadas": resumen.get("creadas", 0),
        "actualizadas": resumen.get("actualizadas", 0),
        "sin_cambios": resumen.get("sin_cambios", 0),
    }
    return Response(data, status=status.HTTP_200_OK)

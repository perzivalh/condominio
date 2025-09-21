from calendar import monthrange
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation
import mimetypes

from django.db import transaction
from django.db.models import Exists, OuterRef, Prefetch, Q, Sum
from django.db.models.functions import TruncMonth, Upper
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404, HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..models import (
    ExpensaConfig,
    Factura,
    FacturaDetalle,
    FinanzasCodigoQR,
    MultaAplicada,
    MultaConfig,
    NotificacionDirecta,
    Pago,
    Residente,
    ResidenteVivienda,
    Usuario,
    Vivienda,
)
from .serializers import (
    ExpensaConfigSerializer,
    FacturaAdminSerializer,
    FacturaDetalleSerializer,
    FinanzasQRSerializer,
    FacturaSerializer,
    MultaAplicadaSerializer,
    MultaConfigSerializer,
    NotificacionDirectaSerializer,
    PagoSerializer,
)


VALID_PAYMENT_STATES = {"APROBADO", "CONFIRMADO", "COMPLETADO", "PAGADO"}
FACTURA_PAID_STATES = {"PAGADO", "PAGADA", "CANCELADO", "CANCELADA"}
FACTURA_REVISION_STATE = "REVISION"
PAGO_REVISION_STATE = "REVISION"
PAGO_RECHAZADO_STATE = "RECHAZADO"
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


def _prefetch_residentes_activos():
    return Prefetch(
        "vivienda__residentevivienda_set",
        queryset=
        ResidenteVivienda.objects.select_related("residente").filter(
            fecha_hasta__isnull=True
        ),
        to_attr="_residentes_activos",
    )


def _obtener_residente_principal(vivienda):
    relaciones = getattr(vivienda, "_residentes_activos", None)
    if relaciones:
        return relaciones[0].residente
    relacion = (
        ResidenteVivienda.objects.select_related("residente")
        .filter(vivienda=vivienda, fecha_hasta__isnull=True)
        .order_by("-fecha_desde")
        .first()
    )
    return relacion.residente if relacion else None


def _crear_notificacion_residente(
    vivienda,
    titulo,
    mensaje,
    *,
    residente=None,
    enviado_por=None,
    factura=None,
    pago=None,
):
    if residente is None:
        residente = _obtener_residente_principal(vivienda)
    if residente is None:
        return None
    if isinstance(enviado_por, Usuario):
        usuario_envia = enviado_por
    elif enviado_por is None:
        usuario_envia = None
    else:
        if hasattr(enviado_por, "user") and not isinstance(enviado_por, Usuario):
            usuario_envia = enviado_por
        elif hasattr(enviado_por, "pk") and not isinstance(enviado_por, Usuario):
            usuario_envia = Usuario.objects.filter(user=enviado_por).first()
        else:
            usuario_envia = Usuario.objects.filter(pk=enviado_por).first()
    return NotificacionDirecta.objects.create(
        residente=residente,
        titulo=titulo,
        mensaje=mensaje,
        enviado_por=usuario_envia,
        factura=factura,
        pago=pago,
    )


def _pdf_escape(text):
    if text is None:
        return ""
    return (
        str(text)
        .replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def _build_factura_pdf(factura):
    detalles = list(
        factura.detalles.all().order_by("tipo", "descripcion")
    )
    vivienda_prefetch = getattr(factura, "vivienda", None)
    residentes = []
    if vivienda_prefetch is not None:
        residentes = getattr(vivienda_prefetch, "_residentes_activos", [])
    if not residentes:
        residentes = (
            ResidenteVivienda.objects.select_related("residente")
            .filter(vivienda=factura.vivienda, fecha_hasta__isnull=True)
            .order_by("-fecha_desde")
        )

    nombres_residentes = [
        f"{rel.residente.nombres} {rel.residente.apellidos}".strip()
        for rel in residentes
    ]
    bloque = factura.vivienda.bloque or "-"

    lineas = [
        f"Factura periodo {factura.periodo}",
        f"Condominio: {factura.vivienda.condominio.nombre}",
        f"Vivienda: {factura.vivienda.codigo_unidad} (Bloque {bloque})",
        "Residentes: " + (", ".join(nombres_residentes) or "-"),
        f"Estado: {factura.estado}",
        f"Monto total: Bs {factura.monto}",
        "",
        "Detalle:",
    ]

    if detalles:
        for detalle in detalles:
            lineas.append(
                f"- {detalle.descripcion} ({detalle.tipo}) Bs {detalle.monto}"
            )
    else:
        lineas.append("(Sin detalles registrados)")

    if factura.fecha_vencimiento:
        lineas.append("")
        lineas.append(f"Fecha de vencimiento: {factura.fecha_vencimiento}")
    if factura.fecha_pago:
        lineas.append(f"Fecha de pago: {factura.fecha_pago}")

    from io import BytesIO

    buffer = BytesIO()
    write = buffer.write
    write(b"%PDF-1.4\n")
    offsets = {}

    def add_object(obj_id, body):
        offsets[obj_id] = buffer.tell()
        write(f"{obj_id} 0 obj\n".encode("latin-1"))
        if isinstance(body, bytes):
            write(body)
        else:
            write(body.encode("latin-1"))
        write(b"\nendobj\n")

    add_object(1, "<< /Type /Catalog /Pages 2 0 R >>")
    add_object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>")

    content_lines = ["BT", "/F1 12 Tf"]
    start_y = 780
    for index, linea in enumerate(lineas):
        y = start_y - index * 18
        content_lines.append(
            f"1 0 0 1 72 {y} Tm ({_pdf_escape(linea)}) Tj"
        )
    content_lines.append("ET")

    content_stream = "\n".join(content_lines).encode("latin-1")

    stream_header = f"<< /Length {len(content_stream)} >>\nstream\n".encode("latin-1")
    offsets[4] = buffer.tell()
    write(b"4 0 obj\n")
    write(stream_header)
    write(content_stream)
    write(b"\nendstream\nendobj\n")

    add_object(
        3,
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>",
    )
    add_object(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    xref_position = buffer.tell()
    write(b"xref\n")
    max_obj = max(offsets.keys()) if offsets else 0
    write(f"0 {max_obj + 1}\n".encode("latin-1"))
    write(b"0000000000 65535 f \n")
    for obj_id in range(1, max_obj + 1):
        offset = offsets.get(obj_id, 0)
        write(f"{offset:010d} 00000 n \n".encode("latin-1"))
    size_value = max_obj + 1
    write(
        (
            "trailer\n<< /Size {size} /Root 1 0 R >>\nstartxref\n{pos}\n%%EOF".format(
                size=size_value, pos=xref_position
            )
        ).encode("latin-1")
    )

    return buffer.getvalue()
@transaction.atomic
def _generar_facturas_para_periodo(periodo):
    year, month = _parse_periodo(periodo)
    _, last_day = monthrange(year, month)
    fecha_vencimiento = date(year, month, last_day)

    expensas_map = _expensa_config_por_bloque()
    residentes_activos = ResidenteVivienda.objects.filter(
        vivienda=OuterRef("pk"), fecha_hasta__isnull=True
    )

    viviendas = (
        Vivienda.objects.select_related("condominio")
        .annotate(tiene_residentes_activos=Exists(residentes_activos))
        .filter(estado=1, tiene_residentes_activos=True)
    )

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
def facturas_admin(request):
    queryset = (
        Factura.objects.select_related("vivienda", "vivienda__condominio")
        .prefetch_related(_prefetch_residentes_activos())
        .order_by("-fecha_vencimiento", "-fecha_emision", "-periodo")
    )

    periodo = request.query_params.get("periodo")
    if periodo:
        queryset = queryset.filter(periodo__icontains=periodo.strip())

    estado = request.query_params.get("estado")
    if estado:
        queryset = queryset.filter(estado__iexact=estado.strip())

    vivienda_param = request.query_params.get("vivienda")
    if vivienda_param:
        queryset = queryset.filter(
            vivienda__codigo_unidad__icontains=vivienda_param.strip()
        )

    residente_param = request.query_params.get("residente")
    if residente_param:
        queryset = queryset.filter(
            Q(vivienda__residentevivienda__residente__nombres__icontains=residente_param)
            | Q(
                vivienda__residentevivienda__residente__apellidos__icontains=
                residente_param
            )
        )

    search = request.query_params.get("search")
    if search:
        queryset = queryset.filter(
            Q(periodo__icontains=search)
            | Q(vivienda__codigo_unidad__icontains=search)
            | Q(vivienda__residentevivienda__residente__nombres__icontains=search)
            | Q(vivienda__residentevivienda__residente__apellidos__icontains=search)
        )

    tipo = request.query_params.get("tipo")
    if tipo:
        queryset = queryset.filter(tipo__iexact=tipo.strip())

    queryset = queryset.distinct()

    serializer = FacturaAdminSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def factura_admin_detalle(request, pk):
    factura = get_object_or_404(
        Factura.objects.select_related("vivienda", "vivienda__condominio")
        .prefetch_related(
            _prefetch_residentes_activos(),
            Prefetch(
                "detalles",
                queryset=FacturaDetalle.objects.order_by("tipo", "descripcion"),
            ),
            Prefetch("pagos", queryset=Pago.objects.order_by("-fecha_pago")),
        ),
        pk=pk,
    )

    factura_data = FacturaAdminSerializer(factura).data
    detalles_data = FacturaDetalleSerializer(factura.detalles.all(), many=True).data
    pagos_data = PagoSerializer(factura.pagos.all(), many=True).data

    return Response(
        {
            "factura": factura_data,
            "detalles": detalles_data,
            "pagos": pagos_data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def factura_admin_pdf(request, pk):
    factura = get_object_or_404(
        Factura.objects.select_related("vivienda", "vivienda__condominio")
        .prefetch_related(
            _prefetch_residentes_activos(),
            Prefetch(
                "detalles",
                queryset=FacturaDetalle.objects.order_by("tipo", "descripcion"),
            ),
        ),
        pk=pk,
    )

    pdf_bytes = _build_factura_pdf(factura)
    filename = (
        f"factura-{factura.vivienda.codigo_unidad}-{factura.periodo}".replace(" ", "_")
        + ".pdf"
    )
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def registrar_pago_manual(request, pk):
    factura = get_object_or_404(Factura, pk=pk)

    if factura.estado and factura.estado.upper() in FACTURA_PAID_STATES:
        return Response(
            {"detail": "La factura ya se encuentra registrada como pagada."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    monto_entrada = request.data.get("monto_pagado") or request.data.get("monto")
    if monto_entrada in (None, ""):
        monto_dec = Decimal(factura.monto)
    else:
        try:
            monto_dec = Decimal(str(monto_entrada))
        except (InvalidOperation, TypeError, ValueError):
            return Response(
                {"detail": "El monto ingresado no es válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if monto_dec <= Decimal("0"):
        return Response(
            {"detail": "El monto debe ser mayor a cero."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    metodo = (request.data.get("metodo") or "EFECTIVO").upper()
    referencia = request.data.get("referencia") or request.data.get("observaciones")
    if referencia:
        referencia = str(referencia)

    fecha_pago_param = request.data.get("fecha_pago")
    fecha_pago_date = None
    if fecha_pago_param:
        try:
            fecha_pago_date = datetime.strptime(fecha_pago_param, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"detail": "La fecha de pago debe tener formato YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    fecha_pago_final = fecha_pago_date or timezone.localdate()

    usuario_actor = Usuario.objects.filter(user=request.user).first()
    comentario = request.data.get("comentario")
    if comentario:
        comentario = str(comentario)
    else:
        comentario = ""

    with transaction.atomic():
        pago = Pago.objects.create(
            factura=factura,
            metodo=metodo,
            monto_pagado=monto_dec,
            estado="CONFIRMADO",
            referencia_externa=referencia,
            registrado_por=usuario_actor,
            comentario=comentario,
        )

        if fecha_pago_date:
            pago_fecha = datetime.combine(fecha_pago_date, time(hour=12, minute=0))
            if timezone.is_naive(pago_fecha):
                pago_fecha = timezone.make_aware(pago_fecha)
            Pago.objects.filter(pk=pago.pk).update(fecha_pago=pago_fecha)
            pago.refresh_from_db()
        else:
            pago.refresh_from_db()

        factura.estado = "PAGADA"
        factura.fecha_pago = fecha_pago_final
        factura.save(update_fields=["estado", "fecha_pago"])

    factura_refrescada = (
        Factura.objects.select_related("vivienda", "vivienda__condominio")
        .prefetch_related(
            _prefetch_residentes_activos(),
            Prefetch(
                "detalles",
                queryset=FacturaDetalle.objects.order_by("tipo", "descripcion"),
            ),
            Prefetch("pagos", queryset=Pago.objects.order_by("-fecha_pago")),
        )
        .get(pk=factura.pk)
    )

    data = {
        "factura": FacturaAdminSerializer(factura_refrescada).data,
        "pagos": PagoSerializer(factura_refrescada.pagos.all(), many=True).data,
        "pago": PagoSerializer(pago).data,
    }

    return Response(data, status=status.HTTP_200_OK)


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def codigo_qr_admin(request):
    queryset = FinanzasCodigoQR.objects.order_by("-actualizado_en")
    actual = queryset.first()

    if request.method == "GET":
        if not actual:
            return Response({"detail": "No existe un código QR configurado."}, status=404)
        serializer = FinanzasQRSerializer(actual, context={"request": request})
        return Response(serializer.data)

    if request.method == "DELETE":
        if not actual:
            return Response(status=status.HTTP_204_NO_CONTENT)
        if actual.imagen:
            actual.imagen.delete(save=False)
        actual.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    archivo = request.FILES.get("archivo") or request.FILES.get("qr")
    if not archivo:
        return Response(
            {"detail": "Debe adjuntar una imagen con el código QR."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    content_type = getattr(archivo, "content_type", "") or ""
    if not content_type.lower().startswith("image/"):
        return Response(
            {"detail": "El archivo debe ser una imagen."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    descripcion = request.data.get("descripcion") or ""
    if descripcion:
        descripcion = str(descripcion)[:140]

    usuario_actor = Usuario.objects.filter(user=request.user).first()

    with transaction.atomic():
        if actual:
            if actual.imagen:
                actual.imagen.delete(save=False)
            actual.imagen = archivo
            actual.descripcion = descripcion
            actual.actualizado_por = usuario_actor
            actual.save()
        else:
            actual = FinanzasCodigoQR.objects.create(
                imagen=archivo,
                descripcion=descripcion,
                actualizado_por=usuario_actor,
            )

    serializer = FinanzasQRSerializer(actual, context={"request": request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def codigo_qr_residente(request):
    actual = FinanzasCodigoQR.objects.order_by("-actualizado_en").first()
    if not actual:
        return Response({"detail": "No existe un código QR disponible."}, status=404)
    serializer = FinanzasQRSerializer(actual, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def codigo_qr_publico(request):
    actual = FinanzasCodigoQR.objects.order_by("-actualizado_en").first()
    if not actual or not actual.imagen:
        raise Http404("No existe un código QR configurado.")

    try:
        archivo = actual.imagen.open("rb")
    except FileNotFoundError as exc:
        raise Http404("El archivo del código QR no está disponible.") from exc

    content_type, _ = mimetypes.guess_type(actual.imagen.name)
    response = FileResponse(
        archivo,
        content_type=content_type or "application/octet-stream",
        as_attachment=False,
    )
    filename = actual.imagen.name.rsplit("/", 1)[-1]
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    response["Cache-Control"] = "no-store"
    if hasattr(actual.imagen, "size"):
        response["Content-Length"] = actual.imagen.size
    response["Cross-Origin-Resource-Policy"] = "cross-origin"
    response["Access-Control-Allow-Origin"] = "*"
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resumen_finanzas(request):
    try:
        vivienda = _obtener_vivienda_actual(request.user)
    except ValueError as error:
        return Response({"detail": str(error)}, status=400)

    facturas_vivienda = Factura.objects.filter(vivienda=vivienda)
    pendientes = facturas_vivienda.filter(
        estado__in=["PENDIENTE", FACTURA_REVISION_STATE]
    )

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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def factura_residente_pdf(request, pk):
    try:
        vivienda = _obtener_vivienda_actual(request.user)
    except ValueError as error:
        return Response({"detail": str(error)}, status=400)

    factura = get_object_or_404(
        Factura.objects.select_related("vivienda", "vivienda__condominio")
        .prefetch_related(
            _prefetch_residentes_activos(),
            Prefetch(
                "detalles",
                queryset=FacturaDetalle.objects.order_by("tipo", "descripcion"),
            ),
        ),
        pk=pk,
        vivienda=vivienda,
    )

    pdf_bytes = _build_factura_pdf(factura)
    filename = (
        f"factura-{factura.vivienda.codigo_unidad}-{factura.periodo}".replace(" ", "_")
        + ".pdf"
    )

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def confirmar_pago_factura(request, pk):
    try:
        vivienda = _obtener_vivienda_actual(request.user)
    except ValueError as error:
        return Response({"detail": str(error)}, status=400)

    factura = get_object_or_404(Factura, pk=pk, vivienda=vivienda)
    estado_actual = (factura.estado or "").upper()
    if estado_actual in FACTURA_PAID_STATES:
        return Response(
            {"detail": "La factura ya se encuentra registrada como pagada."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if estado_actual == FACTURA_REVISION_STATE:
        return Response(
            {"detail": "Ya existe un pago en revisión para esta factura."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if factura.pagos.filter(estado__iexact=PAGO_REVISION_STATE).exists():
        return Response(
            {"detail": "Ya existe un pago en revisión para esta factura."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    monto_param = request.data.get("monto_pagado") or request.data.get("monto")
    if monto_param in (None, ""):
        monto_dec = Decimal(factura.monto)
    else:
        try:
            monto_dec = Decimal(str(monto_param))
        except (InvalidOperation, TypeError, ValueError):
            return Response(
                {"detail": "El monto ingresado no es válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if monto_dec <= Decimal("0"):
        return Response(
            {"detail": "El monto debe ser mayor a cero."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    referencia = request.data.get("referencia") or request.data.get("observaciones")
    comentario = request.data.get("comentario")
    if referencia:
        referencia = str(referencia)
    if comentario:
        comentario = str(comentario)
    else:
        comentario = ""

    usuario_registra = (
        Usuario.objects.select_related("residente").filter(user=request.user).first()
    )

    with transaction.atomic():
        pago = Pago.objects.create(
            factura=factura,
            metodo="QR",
            monto_pagado=monto_dec,
            estado=PAGO_REVISION_STATE,
            referencia_externa=referencia,
            registrado_por=usuario_registra,
            comentario=comentario,
        )
        factura.estado = FACTURA_REVISION_STATE
        factura.save(update_fields=["estado"])

    residente_destino = None
    if usuario_registra and hasattr(usuario_registra, "residente"):
        residente_destino = usuario_registra.residente

    _crear_notificacion_residente(
        factura.vivienda,
        "Pago en revisión",
        "Tu comprobante fue enviado y está pendiente de validación del administrador.",
        residente=residente_destino,
        enviado_por=usuario_registra,
        factura=factura,
        pago=pago,
    )

    data = {
        "detail": "Pago registrado y en revisión.",
        "factura": FacturaSerializer(factura).data,
        "pago": PagoSerializer(pago).data,
    }
    return Response(data, status=status.HTTP_202_ACCEPTED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resolver_pago_revision(request, factura_pk, pago_pk):
    factura = get_object_or_404(Factura, pk=factura_pk)
    pago = get_object_or_404(Pago, pk=pago_pk, factura=factura)

    accion = (request.data.get("accion") or "").strip().lower()
    if accion not in {"aprobar", "rechazar"}:
        return Response(
            {"detail": "La acción debe ser 'aprobar' o 'rechazar'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    estado_pago = (pago.estado or "").upper()
    if estado_pago not in {PAGO_REVISION_STATE, "PENDIENTE"} and not (
        accion == "rechazar" and estado_pago == PAGO_RECHAZADO_STATE
    ):
        return Response(
            {"detail": "El pago ya fue procesado."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    comentario = request.data.get("comentario")
    if comentario:
        comentario = str(comentario)
    else:
        comentario = ""

    usuario_actor = (
        Usuario.objects.select_related("residente").filter(user=request.user).first()
    )

    with transaction.atomic():
        if accion == "aprobar":
            Pago.objects.filter(pk=pago.pk).update(
                estado="CONFIRMADO",
                comentario=comentario,
                registrado_por=pago.registrado_por or usuario_actor,
                fecha_pago=timezone.now(),
            )
            pago.refresh_from_db()
            factura.estado = "PAGADA"
            factura.fecha_pago = timezone.localdate()
            factura.save(update_fields=["estado", "fecha_pago"])
            mensaje = "Tu pago fue confirmado y la factura quedó registrada como pagada."
        else:
            Pago.objects.filter(pk=pago.pk).update(
                estado=PAGO_RECHAZADO_STATE,
                comentario=comentario,
                registrado_por=pago.registrado_por or usuario_actor,
            )
            pago.refresh_from_db()
            factura.estado = "PENDIENTE"
            factura.fecha_pago = None
            factura.save(update_fields=["estado", "fecha_pago"])
            mensaje = (
                "El pago fue rechazado. "
                + ("Motivo: " + comentario if comentario else "Revisa los datos e inténtalo nuevamente.")
            )

    residente_destino = None
    if pago.registrado_por and hasattr(pago.registrado_por, "residente"):
        residente_destino = pago.registrado_por.residente

    _crear_notificacion_residente(
        factura.vivienda,
        "Actualización de pago",
        mensaje,
        residente=residente_destino,
        enviado_por=usuario_actor,
        factura=factura,
        pago=pago,
    )

    factura_refrescada = (
        Factura.objects.select_related("vivienda", "vivienda__condominio")
        .prefetch_related(
            _prefetch_residentes_activos(),
            Prefetch(
                "detalles",
                queryset=FacturaDetalle.objects.order_by("tipo", "descripcion"),
            ),
            Prefetch("pagos", queryset=Pago.objects.order_by("-fecha_pago")),
        )
        .get(pk=factura.pk)
    )

    data = {
        "factura": FacturaAdminSerializer(factura_refrescada).data,
        "pagos": PagoSerializer(factura_refrescada.pagos.all(), many=True).data,
        "pago": PagoSerializer(pago).data,
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


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def notificaciones_directas_admin(request):
    if request.method == "GET":
        queryset = (
            NotificacionDirecta.objects.select_related(
                "residente",
                "enviado_por__user",
                "factura",
                "pago",
            )
            .order_by("-creado_en")
        )
        residente_id = request.query_params.get("residente")
        estado = request.query_params.get("estado")
        if residente_id:
            queryset = queryset.filter(residente_id=residente_id)
        if estado:
            queryset = queryset.filter(estado__iexact=estado)

        limite = request.query_params.get("limit")
        if limite:
            try:
                limite_int = max(1, min(int(limite), 200))
                queryset = queryset[:limite_int]
            except (TypeError, ValueError):
                queryset = queryset[:100]
        else:
            queryset = queryset[:100]

        serializer = NotificacionDirectaSerializer(queryset, many=True)
        return Response(serializer.data)

    serializer = NotificacionDirectaSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    usuario_actor = Usuario.objects.filter(user=request.user).first()
    notificacion = serializer.save(enviado_por=usuario_actor)
    return Response(
        NotificacionDirectaSerializer(notificacion).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notificaciones_residente(request):
    usuario = (
        Usuario.objects.select_related("residente").filter(user=request.user).first()
    )
    if not usuario or not getattr(usuario, "residente", None):
        return Response(
            {"detail": "El usuario autenticado no tiene un residente asociado."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    queryset = (
        NotificacionDirecta.objects.select_related("factura", "pago")
        .filter(residente=usuario.residente)
        .order_by("-creado_en")
    )
    serializer = NotificacionDirectaSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def marcar_notificacion_leida(request, pk):
    usuario = (
        Usuario.objects.select_related("residente").filter(user=request.user).first()
    )
    if not usuario or not getattr(usuario, "residente", None):
        return Response(
            {"detail": "El usuario autenticado no tiene un residente asociado."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    notificacion = get_object_or_404(
        NotificacionDirecta, pk=pk, residente=usuario.residente
    )
    if notificacion.estado != NotificacionDirecta.ESTADO_LEIDA:
        NotificacionDirecta.objects.filter(pk=notificacion.pk).update(
            estado=NotificacionDirecta.ESTADO_LEIDA
        )
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

import base64
import json
import logging
import time
import uuid
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
from urllib import error as urllib_error, request as urllib_request

from django.conf import settings
from django.core.files.base import ContentFile
from django.db.models import Count
from django.http import HttpResponse, StreamingHttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_GET
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..models import (
    RegistroAccesoVehicular,
    Vehiculo,
    Usuario,
    UsuarioRol,
    CategoriaIncidenteSeguridad,
    ReporteIncidenteSeguridad,
    ResidenteVivienda,
)
from ..serializers import (
    RegistroAccesoVehicularSerializer,
    CategoriaIncidenteSeguridadSerializer,
    ReporteIncidenteSeguridadSerializer,
)

logger = logging.getLogger(__name__)


class RegistroAccesoVehicularViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = (
        RegistroAccesoVehicular.objects.select_related(
            "vehiculo__residente", "guardia__user"
        )
        .all()
        .order_by("-creado_en")
    )
    serializer_class = RegistroAccesoVehicularSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        limit_param = request.query_params.get("limit")
        if limit_param:
            try:
                limit_value = int(limit_param)
                queryset = queryset[: max(limit_value, 1)]
            except (TypeError, ValueError):
                pass
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="identificar")
    def identificar(self, request):
        image_base64 = request.data.get("image_base64")
        if not image_base64:
            return Response(
                {"detail": "Se requiere una imagen para procesar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        image_bytes, filename, mime_type = _decode_base64_image(image_base64)
        if image_bytes is None:
            return Response(
                {"detail": "No se pudo procesar la imagen proporcionada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            response_payload = _call_plate_recognizer(image_bytes, mime_type)
        except PlateRecognizerNotConfigured:
            return Response(
                {"detail": "El servicio de reconocimiento de placas no está configurado."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except PlateRecognizerConnectionError:
            return Response(
                {
                    "detail": "No se pudo contactar al servicio de reconocimiento de placas. Intente nuevamente en unos minutos.",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except PlateRecognizerError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plate, score = _extract_best_plate(response_payload)
        if not plate:
            plate = "NO_IDENTIFICADA"

        vehiculo = (
            Vehiculo.objects.select_related("residente")
            .filter(placa__iexact=plate)
            .first()
        )

        estado = (
            RegistroAccesoVehicular.ESTADO_APROBADO
            if vehiculo
            else RegistroAccesoVehicular.ESTADO_RECHAZADO
        )

        confianza = None
        if score is not None:
            confianza = Decimal(str(score * 100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        registro = RegistroAccesoVehicular(
            guardia=_usuario_actual(request.user),
            vehiculo=vehiculo,
            placa_detectada=plate.upper(),
            confianza=confianza,
            estado=estado,
            respuesta_api=response_payload,
        )

        if image_bytes:
            registro.imagen.save(filename, ContentFile(image_bytes), save=False)

        registro.save()

        serializer = self.get_serializer(registro)
        historial_qs = self.get_queryset()[:10]
        historial = self.get_serializer(historial_qs, many=True).data

        return Response(
            {
                "registro": serializer.data,
                "historial": historial,
                "coincide": bool(vehiculo),
            },
            status=status.HTTP_201_CREATED,
        )


class CategoriaIncidenteSeguridadViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = CategoriaIncidenteSeguridad.objects.filter(activo=True).order_by("nombre")
    serializer_class = CategoriaIncidenteSeguridadSerializer
    permission_classes = [IsAuthenticated]


class ReporteIncidenteSeguridadViewSet(viewsets.ModelViewSet):
    serializer_class = ReporteIncidenteSeguridadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        usuario = _usuario_actual(self.request.user)
        queryset = (
            ReporteIncidenteSeguridad.objects.select_related(
                "residente",
                "categoria",
                "guardia_asignado__user",
            )
            .all()
            .order_by("-creado_en")
        )

        if not usuario:
            return queryset.none()

        if _usuario_tiene_rol(usuario, {"ADM", "GUA"}):
            estado_param = self.request.query_params.get("estado")
            if estado_param:
                queryset = queryset.filter(estado=estado_param)
            return queryset

        residente = getattr(usuario, "residente", None)
        if residente:
            return queryset.filter(residente=residente)

        return queryset.none()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.action == "create":
            usuario = _usuario_actual(self.request.user)
            residente = getattr(usuario, "residente", None) if usuario else None
            if residente:
                context["residente"] = residente
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        limit_param = request.query_params.get("limit")
        if limit_param:
            try:
                limit_value = int(limit_param)
                queryset = queryset[: max(limit_value, 1)]
            except (TypeError, ValueError):
                pass
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        usuario = _usuario_actual(request.user)
        residente = getattr(usuario, "residente", None) if usuario else None
        if not residente:
            return Response(
                {"detail": "Solo los residentes pueden reportar incidentes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()
        es_emergencia = _to_bool(data.get("es_emergencia", False))
        data["es_emergencia"] = es_emergencia
        if "categoria_otro" in data and isinstance(data["categoria_otro"], str):
            data["categoria_otro"] = data["categoria_otro"].strip()

        if es_emergencia and not data.get("ubicacion"):
            ubicacion_default = _ubicacion_residente(residente)
            if ubicacion_default:
                data["ubicacion"] = ubicacion_default

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        incidente = serializer.save()
        output = self.get_serializer(incidente)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="resolver")
    def resolver(self, request, pk=None):
        usuario = _usuario_actual(request.user)
        if not usuario or not _usuario_tiene_rol(usuario, {"ADM", "GUA"}):
            return Response(status=status.HTTP_403_FORBIDDEN)

        incidente = self.get_object()
        estado = request.data.get("estado", ReporteIncidenteSeguridad.ESTADO_ATENDIDO)
        if estado not in {
            ReporteIncidenteSeguridad.ESTADO_PENDIENTE,
            ReporteIncidenteSeguridad.ESTADO_ATENDIDO,
            ReporteIncidenteSeguridad.ESTADO_DESCARTADO,
        }:
            return Response(
                {"detail": "Estado inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        incidente.estado = estado
        if estado in {
            ReporteIncidenteSeguridad.ESTADO_ATENDIDO,
            ReporteIncidenteSeguridad.ESTADO_DESCARTADO,
        }:
            incidente.guardia_asignado = usuario
            incidente.atendido_en = timezone.now()
        incidente.save(update_fields=["estado", "guardia_asignado", "atendido_en", "actualizado_en"])

        serializer = self.get_serializer(incidente)
        return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resumen_seguridad(request):
    period = request.query_params.get("period", "total")
    data = _build_resumen(period, request)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_resumen_pdf(request):
    period = request.query_params.get("period", "total")
    resumen = _build_resumen(period, request)

    pdf_bytes = _render_resumen_pdf(resumen)

    filename = f"reporte-seguridad-{timezone.now().strftime('%Y%m%d-%H%M%S')}.pdf"
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f"attachment; filename={filename}"
    return response


@require_GET
def incidentes_event_stream(request):
    """Server-sent events stream with recent security incidents."""

    user = _authenticate_event_stream(request)
    if not user:
        return HttpResponse(status=status.HTTP_401_UNAUTHORIZED)

    request.user = user
    usuario = _usuario_actual(user)
    if not usuario or not _usuario_tiene_rol(usuario, {"ADM", "GUA"}):
        return HttpResponse(status=status.HTTP_403_FORBIDDEN)

    last_seen = _parse_last_event_id(request)

    def stream():
        nonlocal last_seen
        sleep_seconds = 5

        while True:
            try:
                queryset = (
                    ReporteIncidenteSeguridad.objects.select_related(
                        "residente",
                        "categoria",
                        "guardia_asignado__user",
                    )
                    .order_by("-creado_en")
                )
                limit = 6
                items = list(queryset[:limit])

                if items:
                    latest_timestamp = max(item.actualizado_en for item in items)
                else:
                    latest_timestamp = None

                if latest_timestamp and (
                    not last_seen or latest_timestamp > last_seen
                ):
                    serializer = ReporteIncidenteSeguridadSerializer(
                        items,
                        many=True,
                        context={"request": request},
                    )
                    payload = json.dumps({"incidents": serializer.data})
                    last_seen = latest_timestamp

                    yield f"id: {latest_timestamp.isoformat() }\n"
                    yield "event: incidents\n"
                    yield f"data: {payload}\n\n"

                yield "event: keepalive\n"
                yield "data: {}\n\n"
                time.sleep(sleep_seconds)
            except GeneratorExit:
                break
            except Exception as exc:  # pragma: no cover - logged for observability
                logger.exception("Error en stream de incidentes: %s", exc)
                yield "event: error\n"
                yield "data: \"stream_error\"\n\n"
                time.sleep(sleep_seconds)

    response = StreamingHttpResponse(stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


def _authenticate_event_stream(request):
    authenticator = JWTAuthentication()

    try:
        header = authenticator.get_header(request)
        if header:
            raw_token = authenticator.get_raw_token(header)
            validated_token = authenticator.get_validated_token(raw_token)
            return authenticator.get_user(validated_token)
    except AuthenticationFailed:
        return None

    token_param = request.GET.get("token")
    if not token_param:
        return None

    try:
        validated_token = authenticator.get_validated_token(token_param)
    except AuthenticationFailed:
        return None

    return authenticator.get_user(validated_token)


def _parse_last_event_id(request):
    candidate = request.headers.get("Last-Event-ID") or request.GET.get("last_event_id")
    if not candidate:
        return None

    value = parse_datetime(candidate)
    if not value:
        return None

    if timezone.is_naive(value):
        value = timezone.make_aware(value, timezone=timezone.utc)
    return value


def _render_resumen_pdf(resumen: dict) -> bytes:
    composer = _PDFComposer()

    composer.add_text("Reporte de Seguridad", font="F2", size=18, leading=26)
    composer.add_text(
        f"Periodo: {resumen['periodo_label']}",
        font="F1",
        size=11,
        leading=18,
    )
    if resumen.get("desde"):
        composer.add_text(
            f"Desde: {resumen['desde']}",
            font="F1",
            size=11,
            leading=18,
        )

    composer.add_spacing(8)

    accesos = resumen["accesos"]
    composer.add_text("Control vehicular", font="F2", size=14, leading=20)
    composer.add_text(
        f"Total registros: {accesos['total']}", font="F1", size=11, leading=16
    )
    composer.add_text(
        f"Aprobados: {accesos['aprobados']}", font="F1", size=11, leading=16
    )
    composer.add_text(
        f"Rechazados: {accesos['rechazados']}", font="F1", size=11, leading=16
    )

    composer.add_spacing(12)

    incidentes = resumen["incidentes"]
    composer.add_text("Incidentes reportados", font="F2", size=14, leading=20)
    composer.add_text(
        f"Total incidentes: {incidentes['total']}", font="F1", size=11, leading=16
    )
    composer.add_text(
        f"Pendientes: {incidentes['pendientes']}", font="F1", size=11, leading=16
    )
    composer.add_text(
        f"Atendidos: {incidentes['atendidos']}", font="F1", size=11, leading=16
    )
    composer.add_text(
        f"Emergencias: {incidentes['emergencias']}", font="F1", size=11, leading=16
    )

    composer.add_spacing(10)
    composer.add_text("Por categoría:", font="F2", size=12, leading=16)
    for categoria in incidentes["por_categoria"]:
        composer.add_text(
            f"• {categoria['nombre']}: {categoria['total']}",
            font="F1",
            size=11,
            leading=14,
            indent=12,
        )

    recientes = incidentes["recientes"]
    if recientes:
        composer.ensure_space(120)
        composer.add_text("Incidentes recientes:", font="F2", size=12, leading=18)
        for item in recientes:
            descripcion = item.get("descripcion") or "Sin descripción"
            resumen_linea = (
                f"{item['tiempo_transcurrido']} - {item['categoria_nombre']}"
            )
            vivienda = item["residente"].get("codigo_vivienda") or "Sin vivienda"
            composer.add_text(
                f"• {resumen_linea} ({vivienda})",
                font="F1",
                size=10,
                leading=14,
                indent=12,
            )
            composer.add_text(
                descripcion[:90],
                font="F1",
                size=10,
                leading=14,
                indent=18,
            )

    return composer.render()


def _pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


class _PDFComposer:
    width = 612
    height = 792
    margin = 54

    def __init__(self) -> None:
        self.pages: list[list[tuple[str, float, float, float, str]]] = [[]]
        self.y_position = self.height - self.margin

    def add_text(
        self,
        text: str,
        *,
        font: str,
        size: float,
        leading: float,
        indent: float = 0.0,
    ) -> None:
        if self.y_position < self.margin:
            self._new_page()
        x = self.margin + indent
        self.pages[-1].append((font, size, x, self.y_position, text))
        self.y_position -= leading

    def add_spacing(self, amount: float) -> None:
        if self.y_position - amount < self.margin:
            self._new_page()
        else:
            self.y_position -= amount

    def ensure_space(self, amount: float) -> None:
        if self.y_position - amount < self.margin:
            self._new_page()

    def _new_page(self) -> None:
        self.pages.append([])
        self.y_position = self.height - self.margin

    def render(self) -> bytes:
        if not any(self.pages):
            self.pages = [[]]

        objects: list[bytes] = []

        def add_object(content: bytes | str) -> int:
            if isinstance(content, str):
                content_bytes = content.encode("utf-8")
            else:
                content_bytes = content
            objects.append(content_bytes)
            return len(objects)

        font_regular = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        font_bold = add_object(
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
        )

        page_object_indices: list[int] = []

        for page in self.pages:
            if not page:
                stream_content = "BT\nET"
            else:
                parts: list[str] = []
                for font, size, x, y, text in page:
                    parts.append("BT")
                    parts.append(f"/{font} {size:.2f} Tf")
                    parts.append(f"1 0 0 1 {x:.2f} {y:.2f} Tm")
                    parts.append(f"({_pdf_escape(text)}) Tj")
                    parts.append("ET")
                stream_content = "\n".join(parts)

            stream_bytes = stream_content.encode("utf-8")
            stream_obj = (
                f"<< /Length {len(stream_bytes)} >>\nstream\n".encode("utf-8")
                + stream_bytes
                + b"\nendstream"
            )
            stream_id = add_object(stream_obj)

            page_obj = (
                "<< /Type /Page /Parent __PARENT__ /MediaBox [0 0 {width} {height}] "
                "/Contents {stream} 0 R /Resources << /Font << /F1 {font_regular} 0 R "
                "/F2 {font_bold} 0 R >> >> >>"
            ).format(
                width=self.width,
                height=self.height,
                stream=stream_id,
                font_regular=font_regular,
                font_bold=font_bold,
            )
            page_obj_id = add_object(page_obj)
            page_object_indices.append(page_obj_id)

        kids = " ".join(f"{idx} 0 R" for idx in page_object_indices) or ""
        pages_obj_id = add_object(
            f"<< /Type /Pages /Kids [{kids}] /Count {len(page_object_indices)} >>"
        )
        catalog_id = add_object(f"<< /Type /Catalog /Pages {pages_obj_id} 0 R >>")

        parent_ref = f"{pages_obj_id} 0 R".encode("utf-8")
        for idx in page_object_indices:
            objects[idx - 1] = objects[idx - 1].replace(b"__PARENT__", parent_ref)

        buffer = BytesIO()
        buffer.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

        offsets: list[int] = []
        for i, content in enumerate(objects, start=1):
            offsets.append(buffer.tell())
            buffer.write(f"{i} 0 obj\n".encode("utf-8"))
            buffer.write(content)
            buffer.write(b"\nendobj\n")

        xref_position = buffer.tell()
        buffer.write(f"xref\n0 {len(objects) + 1}\n".encode("utf-8"))
        buffer.write(b"0000000000 65535 f \n")
        for offset in offsets:
            buffer.write(f"{offset:010} 00000 n \n".encode("ascii"))

        buffer.write(b"trailer\n")
        buffer.write(
            f"<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n".encode("utf-8")
        )
        buffer.write(b"startxref\n")
        buffer.write(f"{xref_position}\n".encode("ascii"))
        buffer.write(b"%%EOF")

        return buffer.getvalue()


class PlateRecognizerError(Exception):
    """Error genérico al invocar Plate Recognizer."""


class PlateRecognizerConnectionError(PlateRecognizerError):
    """Error al conectar con el servicio externo."""


class PlateRecognizerNotConfigured(PlateRecognizerError):
    """Se lanza cuando falta el token de autenticación."""


def _decode_base64_image(data: str):
    try:
        header, _, encoded = data.partition(",")
        if _:
            mime_type = header.split(":")[1].split(";")[0]
        else:
            encoded = header
            mime_type = "image/jpeg"
        image_bytes = base64.b64decode(encoded)
        extension = "jpg"
        if "png" in mime_type:
            extension = "png"
        elif "jpeg" in mime_type:
            extension = "jpg"
        filename = f"captura-{uuid.uuid4().hex}.{extension}"
        return image_bytes, filename, mime_type
    except Exception as exc:  # noqa: BLE001
        logger.warning("No se pudo decodificar la imagen capturada: %s", exc)
        return None, None, None


def _call_plate_recognizer(image_bytes: bytes, mime_type: str | None):
    token = getattr(settings, "PLATE_RECOGNIZER_TOKEN", "").strip()
    if not token:
        raise PlateRecognizerNotConfigured

    endpoint = getattr(
        settings,
        "PLATE_RECOGNIZER_ENDPOINT",
        "https://api.platerecognizer.com/v1/plate-reader/",
    )

    boundary = f"----PlateRecognizer{uuid.uuid4().hex}"
    mime = mime_type or "image/jpeg"
    body = (
        b"--"
        + boundary.encode()
        + b"\r\n"
        + b'Content-Disposition: form-data; name="upload"; filename="captura.jpg"\r\n'
        + b"Content-Type: "
        + mime.encode()
        + b"\r\n\r\n"
        + image_bytes
        + b"\r\n--"
        + boundary.encode()
        + b"--\r\n"
    )

    request = urllib_request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Token {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
        },
    )

    try:
        with urllib_request.urlopen(request, timeout=20) as response:
            charset = response.headers.get_content_charset("utf-8")
            payload = response.read().decode(charset)
    except urllib_error.HTTPError as exc:  # noqa: BLE001
        try:
            error_body = exc.read().decode("utf-8", errors="ignore")
        except Exception:  # noqa: BLE001
            error_body = exc.reason if isinstance(exc.reason, str) else ""
        logger.error(
            "Plate Recognizer respondió con %s: %s",
            getattr(exc, "code", "desconocido"),
            error_body,
        )
        raise PlateRecognizerError(
            "No fue posible reconocer la placa. Revise la captura e intente nuevamente."
        ) from exc
    except urllib_error.URLError as exc:  # noqa: BLE001
        logger.exception("Error de conexión con Plate Recognizer: %s", exc)
        raise PlateRecognizerConnectionError from exc

    try:
        return json.loads(payload)
    except json.JSONDecodeError as exc:  # noqa: BLE001
        logger.error("Respuesta inválida de Plate Recognizer: %s", exc)
        raise PlateRecognizerError("Respuesta inválida del servicio de reconocimiento.") from exc


def _extract_best_plate(payload: dict):
    results = payload.get("results") or []
    if not results:
        return None, None

    best = max(results, key=lambda item: item.get("score") or 0)
    plate = best.get("plate")
    score = best.get("score")
    if plate:
        plate = plate.upper()
    return plate, score


def _usuario_actual(auth_user):
    if not auth_user or not auth_user.is_authenticated:
        return None
    return (
        Usuario.objects.select_related("user")
        .filter(user=auth_user)
        .first()
    )


def _usuario_tiene_rol(usuario: Usuario, roles: set[str]) -> bool:
    if not usuario:
        return False
    return UsuarioRol.objects.filter(
        usuario=usuario,
        rol__nombre__in=roles,
        estado=1,
    ).exists()


def _ubicacion_residente(residente):
    relacion = (
        ResidenteVivienda.objects.select_related("vivienda")
        .filter(residente=residente, fecha_hasta__isnull=True)
        .first()
    )
    if relacion and relacion.vivienda:
        return relacion.vivienda.codigo_unidad
    return None


def _to_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "t", "si", "sí", "y", "yes"}
    return False


def _build_resumen(period: str, request):
    normalized = (period or "").strip().lower()
    ahora = timezone.now()
    if normalized == "daily" or normalized == "dia":
        inicio = ahora - timedelta(days=1)
        label = "Últimas 24 horas"
        periodo = "daily"
    elif normalized == "monthly" or normalized == "mes":
        inicio = ahora - timedelta(days=30)
        label = "Últimos 30 días"
        periodo = "monthly"
    else:
        inicio = None
        label = "Histórico"
        periodo = "total"

    accesos_qs = RegistroAccesoVehicular.objects.all()
    incidentes_qs = ReporteIncidenteSeguridad.objects.select_related("residente", "categoria")
    if inicio:
        accesos_qs = accesos_qs.filter(creado_en__gte=inicio)
        incidentes_qs = incidentes_qs.filter(creado_en__gte=inicio)

    accesos_total = accesos_qs.count()
    accesos_aprobados = accesos_qs.filter(estado=RegistroAccesoVehicular.ESTADO_APROBADO).count()
    accesos_rechazados = accesos_qs.filter(estado=RegistroAccesoVehicular.ESTADO_RECHAZADO).count()

    incidentes_total = incidentes_qs.count()
    incidentes_pendientes = incidentes_qs.filter(estado=ReporteIncidenteSeguridad.ESTADO_PENDIENTE).count()
    incidentes_atendidos = incidentes_qs.filter(estado=ReporteIncidenteSeguridad.ESTADO_ATENDIDO).count()
    incidentes_emergencias = incidentes_qs.filter(es_emergencia=True).count()

    categorias_data = []
    categorias_raw = (
        incidentes_qs.values("categoria__nombre", "categoria_otro")
        .annotate(total=Count("id"))
        .order_by("-total")
    )
    for item in categorias_raw:
        nombre = item.get("categoria__nombre") or (item.get("categoria_otro") or "Sin categoría")
        categorias_data.append({"nombre": nombre, "total": item.get("total", 0)})

    recientes_qs = incidentes_qs.order_by("-creado_en")[:5]
    serializer_context = {"request": request}
    recientes_serializados = ReporteIncidenteSeguridadSerializer(
        recientes_qs, many=True, context=serializer_context
    ).data

    return {
        "periodo": periodo,
        "periodo_label": label,
        "desde": inicio.isoformat() if inicio else None,
        "accesos": {
            "total": accesos_total,
            "aprobados": accesos_aprobados,
            "rechazados": accesos_rechazados,
        },
        "incidentes": {
            "total": incidentes_total,
            "pendientes": incidentes_pendientes,
            "atendidos": incidentes_atendidos,
            "emergencias": incidentes_emergencias,
            "por_categoria": categorias_data,
            "recientes": recientes_serializados,
        },
    }

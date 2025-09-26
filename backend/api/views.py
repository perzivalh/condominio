import datetime
import logging
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db.models import F
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


from .models import (
    Rol,
    Usuario,
    UsuarioRol,
    Vivienda,
    Residente,
    Vehiculo,
    Aviso,
    TokenRecuperacion,
    Condominio,
    FCMDevice,
)
from .serializers import (
    RolSerializer, UsuarioSerializer, ViviendaSerializer,
    ResidenteSerializer, VehiculoSerializer, AvisoSerializer, CondominioSerializer,
    FCMDeviceSerializer,
)
from .permissions import IsAdmin
from .fcm_utils import send_fcm_notification

# --- ROLES ---
class RolViewSet(viewsets.ModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer

    def get_permissions(self):
        if self.action == "list":       # 👈 listado de roles accesible sin login (para selects en frontend)
            return [AllowAny()]
        return [IsAuthenticated()]      # resto de acciones requieren login


# --- USUARIOS ---
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]

    def perform_destroy(self, instance):
        auth_user = instance.user
        super().perform_destroy(instance)
        if auth_user:
            User.objects.filter(pk=auth_user.pk).delete()




# --- VIVIENDAS ---
class ViviendaViewSet(viewsets.ModelViewSet):
    queryset = Vivienda.objects.all()
    serializer_class = ViviendaSerializer
    permission_classes = [IsAuthenticated]


# --- RESIDENTES ---
class ResidenteViewSet(viewsets.ModelViewSet):
    queryset = Residente.objects.all()
    serializer_class = ResidenteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        solo_disponibles = self.request.query_params.get("solo_disponibles")

        if solo_disponibles is None:
            return queryset

        if solo_disponibles.lower() in ("1", "true", "t", "yes", "y"):
            return queryset.filter(usuario__isnull=True)

        return queryset


# --- VEHICULOS ---
class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer
    permission_classes = [IsAuthenticated]


# --- AVISOS ---
class AvisoViewSet(viewsets.ModelViewSet):
    queryset = Aviso.objects.all()
    serializer_class = AvisoSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        usuario = self._current_usuario()
        es_admin = self._usuario_es_admin(usuario)

        queryset = (
            Aviso.objects.select_related("autor_usuario__user")
            .order_by(
                F("fecha_publicacion").desc(nulls_last=True),
                "-fecha_creacion",
            )
        )

        estado_param = self.request.query_params.get("estado")
        if estado_param is not None:
            estado_normalizado = estado_param.strip().lower()
            if estado_normalizado in {"publicado", "publicados", "1", "true", "t"}:
                queryset = queryset.filter(estado=Aviso.ESTADO_PUBLICADO)
            elif estado_normalizado in {"borrador", "borradores", "0", "false", "f"}:
                queryset = queryset.filter(estado=Aviso.ESTADO_BORRADOR)
        elif not es_admin:
            queryset = queryset.filter(estado=Aviso.ESTADO_PUBLICADO)

        return queryset

    def perform_create(self, serializer):
        usuario = self._current_usuario()
        if not usuario:
            raise ValueError("No existe perfil de Usuario vinculado al auth_user actual")
        serializer.save(
            autor_usuario=usuario,
            estado=Aviso.ESTADO_BORRADOR,
            fecha_publicacion=None,
        )
        # El aviso se mantiene como borrador hasta que un administrador lo publique.

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def publicar(self, request, pk=None):
        aviso = self.get_object()
        if aviso.estado == Aviso.ESTADO_PUBLICADO:
            return Response({"detail": "El aviso ya está publicado."}, status=status.HTTP_400_BAD_REQUEST)

        aviso.estado = Aviso.ESTADO_PUBLICADO
        aviso.fecha_publicacion = timezone.now()
        aviso.save(update_fields=["estado", "fecha_publicacion"])

        serializer = self.get_serializer(aviso)

        for residente in self._residentes_activos_con_usuario():
            enviar_push_a_usuario(
                residente.usuario,
                f"Aviso publicado: {aviso.titulo}",
                aviso.contenido,
                data={"tipo": "aviso_publicado", "aviso_id": str(aviso.id)}
            )

        return Response(serializer.data, status=status.HTTP_200_OK)

    def _current_usuario(self):
        if not self.request.user or not self.request.user.is_authenticated:
            return None
        return Usuario.objects.filter(user=self.request.user).first()

    def _usuario_es_admin(self, usuario):
        if not usuario:
            return False
        return UsuarioRol.objects.filter(
            usuario=usuario,
            rol__nombre="ADM",
            estado=1,
        ).exists()

    def _residentes_activos_con_usuario(self):
        return (
            Residente.objects.filter(estado=1, usuario__isnull=False)
            .select_related("usuario")
        )

# --- PERFIL ---
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def perfil(request):
    try:
        usuario = Usuario.objects.get(user=request.user)
    except Usuario.DoesNotExist:
        return Response({"detail": "Perfil de usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    serializer = UsuarioSerializer(usuario)
    return Response(serializer.data)


# --- CONDOMINIOS ---
class CondominioViewSet(viewsets.ModelViewSet):
    queryset = Condominio.objects.all()
    serializer_class = CondominioSerializer
    permission_classes = [IsAuthenticated]


# --- HELPERS ---
logger = logging.getLogger(__name__)


def _usuario_unico_por_correo(correo: str):
    correo_normalizado = correo.strip()
    queryset = (
        Usuario.objects.filter(user__email__iexact=correo_normalizado)
        .select_related("user")
        .order_by("id")
    )
    usuarios = list(queryset[:2])

    if not usuarios:
        return None, Response({"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if len(usuarios) > 1:
        return None, Response(
            {
                "error": (
                    "Existen múltiples cuentas con este correo. "
                    "Comunícate con el administrador para continuar."
                )
            },
            status=status.HTTP_409_CONFLICT,
        )

    return usuarios[0], None


def _build_reset_link(email: str, token: str) -> str | None:
    template = getattr(settings, "PASSWORD_RESET_URL_TEMPLATE", "")
    if not template:
        return None

    try:
        return template.format(email=email, token=token)
    except Exception:
        logger.warning("PASSWORD_RESET_URL_TEMPLATE malformado. Se envía correo sin enlace.")
        return None


def _enviar_correo_recuperacion(usuario: Usuario, correo: str, token: str, minutos_validez: int) -> None:
    nombre = usuario.user.get_full_name().strip() if usuario.user else ""
    saludo = f"Hola {nombre}," if nombre else "Hola,"

    reset_link = _build_reset_link(correo, token)
    lineas = [
        saludo,
        "",
        "Recibimos una solicitud para restablecer tu contraseña en Condominio.",
        f"Tu código de verificación es: {token}",
        f"Este código vencerá en {minutos_validez} minutos.",
    ]

    if reset_link:
        lineas.extend([
            "",
            "También puedes continuar con el proceso utilizando el siguiente enlace:",
            reset_link,
        ])

    lineas.extend([
        "",
        "Si tú no solicitaste este cambio puedes ignorar este correo.",
    ])

    asunto = getattr(
        settings,
        "PASSWORD_RESET_EMAIL_SUBJECT",
        "Instrucciones para restablecer tu contraseña",
    )

    remitente = getattr(settings, "DEFAULT_FROM_EMAIL", None)
    send_mail(asunto, "\n".join(lineas), remitente, [correo], fail_silently=False)


# --- RECUPERAR PASSWORD ---
@api_view(["POST"])
@permission_classes([AllowAny])
def recuperar_password(request):
    correo = request.data.get("correo") or request.data.get("email")
    if correo is None:
        return Response({"error": "Debe ingresar un correo"}, status=status.HTTP_400_BAD_REQUEST)

    correo_normalizado = str(correo).strip()
    if not correo_normalizado:
        return Response({"error": "Debe ingresar un correo"}, status=status.HTTP_400_BAD_REQUEST)

    usuario, error_response = _usuario_unico_por_correo(correo_normalizado)
    if error_response:
        return error_response

    token = str(uuid.uuid4())[:8]
    minutos_validez = getattr(settings, "PASSWORD_RESET_TOKEN_MINUTES", 15)
    expiracion = timezone.now() + datetime.timedelta(minutes=minutos_validez)

    token_obj = TokenRecuperacion.objects.create(
        usuario=usuario,
        codigo=token,
        expiracion=expiracion,
        usado=False
    )

    try:
        _enviar_correo_recuperacion(usuario, correo_normalizado, token, minutos_validez)
    except Exception as exc:  # pragma: no cover - logging, pero mantenemos mensaje al cliente
        logger.error("Error enviando correo de recuperación: %s", exc)
        token_obj.delete()
        return Response(
            {"error": "No fue posible enviar el correo de recuperación. Inténtalo nuevamente."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {"mensaje": f"Se envió un token de recuperación a {correo_normalizado}."},
        status=status.HTTP_200_OK
    )


# --- RESET PASSWORD ---
@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    correo = request.data.get("correo") or request.data.get("email")
    codigo = request.data.get("token")
    nueva_pass = request.data.get("nueva_password")

    if correo is None or not codigo or not nueva_pass:
        return Response({"error": "Datos incompletos"}, status=status.HTTP_400_BAD_REQUEST)

    correo_normalizado = str(correo).strip()
    if not correo_normalizado:
        return Response({"error": "Datos incompletos"}, status=status.HTTP_400_BAD_REQUEST)

    usuario, error_response = _usuario_unico_por_correo(correo_normalizado)
    if error_response:
        return error_response

    token_obj = TokenRecuperacion.objects.filter(
        usuario=usuario, codigo=codigo, usado=False
    ).first()

    if not token_obj:
        return Response({"error": "Token inválido"}, status=status.HTTP_400_BAD_REQUEST)

    if token_obj.expiracion < timezone.now():
        return Response({"error": "Token expirado"}, status=status.HTTP_400_BAD_REQUEST)

    auth_user = usuario.user
    auth_user.set_password(nueva_pass)
    auth_user.save(update_fields=["password"])

    token_obj.usado = True
    token_obj.save(update_fields=["usado"])

    # invalidar otros tokens pendientes
    TokenRecuperacion.objects.filter(usuario=usuario, usado=False).exclude(pk=token_obj.pk).update(usado=True)

    return Response({"mensaje": "Contraseña actualizada con éxito"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cambiar_password(request):
    actual = request.data.get("password_actual")
    nueva = request.data.get("nueva_password")
    confirmacion = request.data.get("confirmacion") or request.data.get("confirmar_password")

    if not actual or not nueva or not confirmacion:
        return Response({"error": "Datos incompletos"}, status=status.HTTP_400_BAD_REQUEST)

    if nueva != confirmacion:
        return Response({"error": "Las contraseñas no coinciden"}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user

    if not user.check_password(actual):
        return Response({"error": "La contraseña actual es incorrecta"}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(nueva)
    user.save(update_fields=["password"])

    try:
        usuario = Usuario.objects.get(user=user)
        usuario.updated_at = timezone.now()
        usuario.save(update_fields=["updated_at"])
    except Usuario.DoesNotExist:
        pass

    TokenRecuperacion.objects.filter(usuario__user=user, usado=False).update(usado=True)

    return Response({"mensaje": "Contraseña actualizada con éxito"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def registrar_fcm_token(request):
    usuario, _ = Usuario.objects.get_or_create(user=request.user, defaults={'estado': 1})
    token = request.data.get("token")
    if not usuario:
        return Response({"detail": "No se encontró el perfil de usuario para el token enviado."}, status=status.HTTP_400_BAD_REQUEST)
    if not token:
        return Response({"detail": "Token FCM faltante."}, status=status.HTTP_400_BAD_REQUEST)

    token_normalizado = str(token).strip()
    if not token_normalizado:
        return Response({"detail": "Token FCM inválido."}, status=status.HTTP_400_BAD_REQUEST)

    device = FCMDevice.objects.filter(token=token_normalizado).first()
    if device:
        if device.usuario_id != usuario.id:
            device.usuario = usuario
            device.save(update_fields=["usuario", "actualizado_en"])
    else:
        device = FCMDevice.objects.create(usuario=usuario, token=token_normalizado)

    dispositivos_duplicados = FCMDevice.objects.filter(usuario=usuario, token=token_normalizado).exclude(pk=device.pk)
    if dispositivos_duplicados.exists():
        dispositivos_duplicados.delete()

    serializer = FCMDeviceSerializer(device)
    return Response(serializer.data, status=status.HTTP_200_OK)


def enviar_push_a_usuario(usuario, title, body, data=None):
    import logging
    logger = logging.getLogger("fcm")
    devices = FCMDevice.objects.filter(usuario=usuario)
    if not devices:
        print(f"[FCM] Usuario {usuario} no tiene dispositivos FCM registrados.")
    for device in devices:
        try:
            print(f"[FCM] Intentando enviar push a token: {device.token} | title: {title}")
            logger.info(f"Intentando enviar push a token: {device.token} | title: {title}")
            response = send_fcm_notification(device.token, title, body, data)
            print(f"[FCM] Push enviado correctamente a {device.token}: {response}")
            logger.info(f"Push enviado correctamente a {device.token}: {response}")
        except Exception as e:
            print(f"[FCM] Error enviando push a {device.token}: {e}")
            logger.error(f"Error enviando push a {device.token}: {e}")

import datetime
import logging
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status, viewsets
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


from .models import (
    Rol,
    Usuario,
    Vivienda,
    Residente,
    Vehiculo,
    Aviso,
    TokenRecuperacion,
    Condominio,
    NotificacionUsuario,
)
from .serializers import (
    RolSerializer, UsuarioSerializer, ViviendaSerializer,
    ResidenteSerializer, VehiculoSerializer, AvisoSerializer, CondominioSerializer,
    AvisoUsuarioSerializer,
)
from .permissions import IsAdmin, IsResidente

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
    queryset = Aviso.objects.all().order_by("-fecha_publicacion")
    serializer_class = AvisoSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Buscar el perfil Usuario vinculado al auth_user que está logueado
        try:
            usuario = Usuario.objects.get(user=self.request.user)
        except Usuario.DoesNotExist:
            raise ValueError("No existe perfil de Usuario vinculado al auth_user actual")

        serializer.save(autor_usuario=usuario)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdmin])
    def publicar(self, request, pk=None):
        aviso = self.get_object()

        with transaction.atomic():
            aviso.estado = 1
            aviso.fecha_publicacion = timezone.now()
            aviso.save(update_fields=["estado", "fecha_publicacion"])

            residentes_qs = (
                Usuario.objects.filter(
                    estado=1,
                    user__isnull=False,
                    usuariorol__rol__nombre="RES",
                    usuariorol__estado=1,
                )
                .select_related("user")
                .distinct()
            )

            existentes = set(
                NotificacionUsuario.objects.filter(aviso=aviso).values_list("usuario_id", flat=True)
            )

            ahora = timezone.now()
            nuevos = [
                NotificacionUsuario(aviso=aviso, usuario=usuario, fecha_envio=ahora)
                for usuario in residentes_qs
                if usuario.id not in existentes
            ]

            if nuevos:
                NotificacionUsuario.objects.bulk_create(nuevos)

        total_destinatarios = NotificacionUsuario.objects.filter(aviso=aviso).count()
        return Response(
            {
                "detail": "Aviso publicado correctamente.",
                "nuevos_destinatarios": len(nuevos),
                "total_destinatarios": total_destinatarios,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated, IsResidente],
        url_path="mis",
    )
    def avisos_residente(self, request):
        usuario = Usuario.objects.filter(user=request.user).select_related("user").first()
        if not usuario:
            return Response(
                {"detail": "El usuario autenticado no tiene un perfil válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = (
            NotificacionUsuario.objects.select_related("aviso", "aviso__autor_usuario__user")
            .filter(usuario=usuario, aviso__estado=1)
            .order_by("-aviso__fecha_publicacion", "-fecha_envio")
        )
        serializer = AvisoUsuarioSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, IsResidente],
        url_path="marcar-leido",
    )
    def marcar_leido(self, request, pk=None):
        usuario = Usuario.objects.filter(user=request.user).first()
        if not usuario:
            return Response(
                {"detail": "El usuario autenticado no tiene un perfil válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notificacion = get_object_or_404(
            NotificacionUsuario, aviso_id=pk, usuario=usuario
        )
        if not notificacion.fecha_lectura:
            notificacion.fecha_lectura = timezone.now()
            notificacion.save(update_fields=["fecha_lectura"])
        return Response(status=status.HTTP_204_NO_CONTENT)

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

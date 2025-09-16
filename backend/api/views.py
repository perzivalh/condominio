from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth.hashers import make_password
import uuid, datetime

from .permissions import IsAdmin
from .models import Rol, Usuario, Vivienda, Residente, Vehiculo, Aviso, TokenRecuperacion, Condominio
from .serializers import (
    RolSerializer, UsuarioSerializer, ViviendaSerializer,
    ResidenteSerializer, VehiculoSerializer, AvisoSerializer, CondominioSerializer
)

# --- ROLES ---
class RolViewSet(viewsets.ModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer

    def get_permissions(self):
        if self.action == "list":       # roles visibles sin token
            return [AllowAny()]
        if self.action in ["retrieve"]: # ver detalle de rol requiere login
            return [IsAuthenticated()]
        return [IsAdmin()]              # crear, editar, eliminar solo admin


# --- USUARIOS ---
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]   # cualquiera logueado puede ver
        return [IsAdmin()]               # admin gestiona usuarios


# --- VIVIENDAS ---
class ViviendaViewSet(viewsets.ModelViewSet):
    queryset = Vivienda.objects.all()
    serializer_class = ViviendaSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAdmin()]


# --- RESIDENTES ---
class ResidenteViewSet(viewsets.ModelViewSet):
    queryset = Residente.objects.all()
    serializer_class = ResidenteSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAdmin()]


# --- VEHICULOS ---
class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAdmin()]


# --- AVISOS ---
class AvisoViewSet(viewsets.ModelViewSet):
    queryset = Aviso.objects.all()
    serializer_class = AvisoSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]   # cualquiera logueado puede leer
        return [IsAdmin()]               # admin crea/gestiona

    def perform_create(self, serializer):
        from .models import Usuario
        usuario = Usuario.objects.get(user=self.request.user)
        serializer.save(autor_usuario=usuario)


# --- CONDOMINIOS ---
class CondominioViewSet(viewsets.ModelViewSet):
    queryset = Condominio.objects.all()
    serializer_class = CondominioSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAdmin()]


# --- RECUPERAR PASSWORD ---
@api_view(["POST"])
@permission_classes([AllowAny])
def recuperar_password(request):
    correo = request.data.get("correo") or request.data.get("email")
    if not correo:
        return Response({"error": "Debe ingresar un correo"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        usuario = Usuario.objects.get(user__email=correo)  # busca en auth_user.email

        token = str(uuid.uuid4())[:8]
        expiracion = timezone.now() + datetime.timedelta(minutes=15)

        TokenRecuperacion.objects.create(
            usuario=usuario,
            codigo=token,
            expiracion=expiracion,
            usado=False
        )

        return Response(
            {"mensaje": f"Se envió un token de recuperación a {correo} (simulado)"},
            status=status.HTTP_200_OK
        )

    except Usuario.DoesNotExist:
        return Response({"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)


# --- RESET PASSWORD ---
@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    correo = request.data.get("correo")
    codigo = request.data.get("token")
    nueva_pass = request.data.get("nueva_password")

    if not correo or not codigo or not nueva_pass:
        return Response({"error": "Datos incompletos"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        usuario = Usuario.objects.get(correo=correo)
        token_obj = TokenRecuperacion.objects.filter(
            usuario=usuario, codigo=codigo, usado=False
        ).first()

        if not token_obj:
            return Response({"error": "Token inválido"}, status=status.HTTP_400_BAD_REQUEST)

        if token_obj.expiracion < timezone.now():
            return Response({"error": "Token expirado"}, status=status.HTTP_400_BAD_REQUEST)

        usuario.password_hash = make_password(nueva_pass)
        usuario.save()

        token_obj.usado = True
        token_obj.save()

        return Response({"mensaje": "Contraseña actualizada con éxito"}, status=status.HTTP_200_OK)

    except Usuario.DoesNotExist:
        return Response({"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

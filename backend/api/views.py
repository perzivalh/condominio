from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth.hashers import make_password
import uuid, datetime
from django.contrib.auth.models import User


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

    def perform_create(self, serializer):
    # Buscar el perfil Usuario vinculado al auth_user que está logueado
        try:
            usuario = Usuario.objects.get(user=self.request.user)
        except Usuario.DoesNotExist:
            raise ValueError("No existe perfil de Usuario vinculado al auth_user actual")

        serializer.save(autor_usuario=usuario)



# --- CONDOMINIOS ---
class CondominioViewSet(viewsets.ModelViewSet):
    queryset = Condominio.objects.all()
    serializer_class = CondominioSerializer
    permission_classes = [IsAuthenticated]


# --- RECUPERAR PASSWORD ---
@api_view(["POST"])
@permission_classes([AllowAny])
def recuperar_password(request):
    correo = request.data.get("correo") or request.data.get("email")
    if not correo:
        return Response({"error": "Debe ingresar un correo"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        usuario = Usuario.objects.get(user__email=correo)

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

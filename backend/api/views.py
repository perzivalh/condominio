from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth.hashers import make_password
import uuid, datetime
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes


from .permissions import IsAdmin, IsResidente
from .models import Rol, Usuario, Vivienda, Residente, Vehiculo, Aviso, TokenRecuperacion, Condominio
from .serializers import (
    RolSerializer, UsuarioSerializer, ViviendaSerializer,
    ResidenteSerializer, VehiculoSerializer, AvisoSerializer, CondominioSerializer
)

class RolViewSet(viewsets.ModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [IsAdmin]   # solo ADM puede usar esto

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAdmin]   # solo ADM

class ViviendaViewSet(viewsets.ModelViewSet):
    queryset = Vivienda.objects.all()
    serializer_class = ViviendaSerializer
    permission_classes = [IsAdmin]   # solo ADM

class ResidenteViewSet(viewsets.ModelViewSet):
    queryset = Residente.objects.all()
    serializer_class = ResidenteSerializer
    permission_classes = [IsAdmin]   # solo ADM

class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer
    permission_classes = [IsAdmin]   # solo ADM

class AvisoViewSet(viewsets.ModelViewSet):
    queryset = Aviso.objects.all()
    serializer_class = AvisoSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]   # cualquiera logueado puede leer
        return [IsAdmin()] # admin crea y gestiona

    def perform_create(self, serializer):
        from .models import Usuario
        usuario = Usuario.objects.get(user=self.request.user)
        serializer.save(autor_usuario=usuario)

class CondominioViewSet(viewsets.ModelViewSet):
    queryset = Condominio.objects.all()
    serializer_class = CondominioSerializer
    permission_classes = [IsAdmin]


# 1) Generar token de recuperación
@api_view(["POST"])
@permission_classes([AllowAny])
def recuperar_password(request):
    correo = request.data.get("correo") or request.data.get("email")
    if not correo:
        return Response({"error": "Debe ingresar un correo"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        usuario = Usuario.objects.get(user__email=correo)  # 👈 buscar en auth_user.email

        # Generar token único
        token = str(uuid.uuid4())[:8]  # ejemplo: "A1B2C3D4"
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


# 2) Resetear contraseña con token
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

        # Guardar contraseña con hash
        usuario.password_hash = make_password(nueva_pass)
        usuario.save()

        # Marcar token como usado
        token_obj.usado = True
        token_obj.save()

        return Response({"mensaje": "Contraseña actualizada con éxito"}, status=status.HTTP_200_OK)

    except Usuario.DoesNotExist:
        return Response({"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
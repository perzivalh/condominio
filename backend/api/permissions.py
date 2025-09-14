from rest_framework.permissions import BasePermission
from .models import Usuario, UsuarioRol

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            usuario = Usuario.objects.get(user=request.user)
            return UsuarioRol.objects.filter(usuario=usuario, rol__nombre="ADM", estado=1).exists()
        except Usuario.DoesNotExist:
            return False

class IsResidente(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            usuario = Usuario.objects.get(user=request.user)
            return UsuarioRol.objects.filter(usuario=usuario, rol__nombre="RES", estado=1).exists()
        except Usuario.DoesNotExist:
            return False

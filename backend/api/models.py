from django.db import models
import uuid
from django.contrib.auth.models import User
# =====================
# CU1 - Usuarios y Roles
# =====================

class Usuario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE)  # vínculo con auth_user
    estado = models.SmallIntegerField(default=1)  # 0 = inactivo, 1 = activo
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.username


class Rol(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=40, unique=True)  # ADM, RES, GUA

    def __str__(self):
        return self.nombre


class UsuarioRol(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE)
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    estado = models.SmallIntegerField(default=1)

    class Meta:
        unique_together = ('usuario', 'rol')

# =====================
# Sesiones de usuario (auditoría)
# =====================

class Sesion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    hora_inicio = models.DateTimeField(auto_now_add=True)
    hora_fin = models.DateTimeField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    dispositivo = models.CharField(max_length=60, null=True, blank=True)

    def __str__(self):
        return f"Sesión de {self.usuario.correo} - {self.hora_inicio}"
    class Meta:
        db_table = "sesion"


# =====================
# CU3 - Recuperar contraseña
# =====================

class TokenRecuperacion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    codigo = models.CharField(max_length=64, unique=True)
    expiracion = models.DateTimeField()
    usado = models.BooleanField(default=False)

    class Meta:
        db_table = "token_recuperacion"


# =====================
# CU4 - Viviendas
# =====================

class Condominio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=80)
    direccion = models.CharField(max_length=120, null=True, blank=True)

    def __str__(self):
        return self.nombre
    class Meta:
        db_table = "condominio"


class Vivienda(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    condominio = models.ForeignKey(Condominio, on_delete=models.CASCADE)
    codigo_unidad = models.CharField(max_length=30, unique=True)
    bloque = models.CharField(max_length=20, null=True, blank=True)
    numero = models.CharField(max_length=20, null=True, blank=True)
    estado = models.SmallIntegerField(default=1)  # 1 = activo, 0 = inactivo

    def __str__(self):
        return self.codigo_unidad
    class Meta:
        db_table = "vivienda"


# =====================
# CU5 - Residentes
# =====================

class Residente(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ci = models.CharField(max_length=20, unique=True)
    nombres = models.CharField(max_length=60)
    apellidos = models.CharField(max_length=60)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    correo = models.EmailField(max_length=120, null=True, blank=True)
    estado = models.SmallIntegerField(default=1)
    usuario = models.OneToOneField(Usuario, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.nombres} {self.apellidos}"
    class Meta:
        db_table = "residente"


class ResidenteVivienda(models.Model):
    residente = models.ForeignKey(Residente, on_delete=models.CASCADE)
    vivienda = models.ForeignKey(Vivienda, on_delete=models.CASCADE)
    fecha_desde = models.DateField()
    fecha_hasta = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "residente_vivienda"
        unique_together = ('residente', 'vivienda', 'fecha_desde')
    


# =====================
# CU6 - Vehículos
# =====================

class Vehiculo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    residente = models.ForeignKey(Residente, on_delete=models.CASCADE)
    placa = models.CharField(max_length=15, unique=True)
    marca = models.CharField(max_length=40, null=True, blank=True)
    modelo = models.CharField(max_length=40, null=True, blank=True)
    color = models.CharField(max_length=30, null=True, blank=True)
    estado = models.SmallIntegerField(default=1)

    class Meta:
        db_table = "vehiculo"
# =====================
# CU11 - Avisos
# =====================

class Aviso(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    autor_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    titulo = models.CharField(max_length=120)
    contenido = models.TextField()
    fecha_publicacion = models.DateTimeField(auto_now_add=True)
    estado = models.SmallIntegerField(default=1)  # 1=Publicado, 0=Borrador
    visibilidad = models.SmallIntegerField(default=0)  # 0=todos,1=bloque,2=vivienda
    adjunto_url = models.CharField(max_length=200, null=True, blank=True)

    def __str__(self):
        return self.titulo
    class Meta:
        db_table = "aviso"


class NotificacionUsuario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    aviso = models.ForeignKey(Aviso, on_delete=models.CASCADE)
    fecha_envio = models.DateTimeField(auto_now_add=True)
    fecha_lectura = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notificacion_usuario"

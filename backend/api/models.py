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


class RegistroAccesoVehicular(models.Model):
    ESTADO_APROBADO = "aprobado"
    ESTADO_RECHAZADO = "rechazado"
    ESTADO_CHOICES = (
        (ESTADO_APROBADO, "Aprobado"),
        (ESTADO_RECHAZADO, "Rechazado"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guardia = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="accesos_registrados"
    )
    vehiculo = models.ForeignKey(
        Vehiculo, on_delete=models.SET_NULL, null=True, blank=True, related_name="accesos"
    )
    placa_detectada = models.CharField(max_length=20)
    confianza = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES)
    imagen = models.ImageField(upload_to="seguridad/accesos/", null=True, blank=True)
    respuesta_api = models.JSONField(null=True, blank=True)
    comentario = models.TextField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "seguridad_registro_acceso_vehicular"
        ordering = ("-creado_en",)


class CategoriaIncidenteSeguridad(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=80, unique=True)
    descripcion = models.CharField(max_length=160, null=True, blank=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "seguridad_categoria_incidente"
        ordering = ("nombre",)

    def __str__(self):
        return self.nombre


class ReporteIncidenteSeguridad(models.Model):
    ESTADO_PENDIENTE = "pendiente"
    ESTADO_ATENDIDO = "atendido"
    ESTADO_DESCARTADO = "descartado"
    ESTADO_CHOICES = (
        (ESTADO_PENDIENTE, "Pendiente"),
        (ESTADO_ATENDIDO, "Atendido"),
        (ESTADO_DESCARTADO, "Descartado"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    residente = models.ForeignKey(Residente, on_delete=models.CASCADE, related_name="incidentes_reportados")
    categoria = models.ForeignKey(
        CategoriaIncidenteSeguridad,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidentes",
    )
    categoria_otro = models.CharField(max_length=120, blank=True)
    descripcion = models.TextField(blank=True)
    ubicacion = models.CharField(max_length=160)
    es_emergencia = models.BooleanField(default=False)
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default=ESTADO_PENDIENTE)
    guardia_asignado = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidentes_atendidos",
    )
    atendido_en = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "seguridad_reporte_incidente"
        ordering = ("-creado_en",)

    def nombre_categoria(self):
        if self.categoria:
            return self.categoria.nombre
        if self.categoria_otro:
            return self.categoria_otro
        return "Sin categoría"
# =====================
# CU11 - Avisos
# =====================

class Aviso(models.Model):
    ESTADO_BORRADOR = 0
    ESTADO_PUBLICADO = 1
    ESTADO_CHOICES = (
        (ESTADO_BORRADOR, "Borrador"),
        (ESTADO_PUBLICADO, "Publicado"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    autor_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    titulo = models.CharField(max_length=120)
    contenido = models.TextField()
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_publicacion = models.DateTimeField(null=True, blank=True)
    estado = models.SmallIntegerField(
        choices=ESTADO_CHOICES,
        default=ESTADO_BORRADOR,
    )
    visibilidad = models.SmallIntegerField(default=0)  # 0=todos,1=bloque,2=vivienda
    adjunto_url = models.CharField(max_length=200, null=True, blank=True)

    def __str__(self):
        return self.titulo

    @property
    def esta_publicado(self):
        return self.estado == self.ESTADO_PUBLICADO

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

# =====================
# Finanzas - Facturas y Pagos
# =====================

class Factura(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vivienda = models.ForeignKey(Vivienda, on_delete=models.CASCADE)
    periodo = models.CharField(max_length=7)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    tipo = models.CharField(max_length=30, default="expensa")
    estado = models.CharField(max_length=15, default="PENDIENTE")
    fecha_emision = models.DateField(auto_now_add=True)
    fecha_vencimiento = models.DateField(null=True, blank=True)
    fecha_pago = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "factura"
        unique_together = ("vivienda", "periodo", "tipo")


class Pago(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    factura = models.ForeignKey(Factura, on_delete=models.CASCADE, related_name="pagos")
    metodo = models.CharField(max_length=20)
    monto_pagado = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_pago = models.DateTimeField(auto_now_add=True)
    comprobante_url = models.CharField(max_length=200, null=True, blank=True)
    estado = models.CharField(max_length=20, default="PENDIENTE")
    referencia_externa = models.CharField(max_length=100, null=True, blank=True)
    registrado_por = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pagos_registrados",
    )
    comentario = models.TextField(blank=True)

    class Meta:
        db_table = "pago"


class FinanzasCodigoQR(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    imagen = models.FileField(upload_to="finanzas/qr/")
    descripcion = models.CharField(max_length=140, blank=True)
    actualizado_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="qr_actualizados"
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "finanzas_codigo_qr"


class NotificacionDirecta(models.Model):
    ESTADO_ENVIADA = "ENVIADA"
    ESTADO_LEIDA = "LEIDA"
    ESTADO_CHOICES = [
        (ESTADO_ENVIADA, "Enviada"),
        (ESTADO_LEIDA, "Leída"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    residente = models.ForeignKey(Residente, on_delete=models.CASCADE, related_name="notificaciones")
    titulo = models.CharField(max_length=120)
    mensaje = models.TextField()
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default=ESTADO_ENVIADA)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    enviado_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="notificaciones_enviadas"
    )
    factura = models.ForeignKey(
        Factura, on_delete=models.SET_NULL, null=True, blank=True, related_name="notificaciones"
    )
    pago = models.ForeignKey(
        Pago, on_delete=models.SET_NULL, null=True, blank=True, related_name="notificaciones"
    )

    class Meta:
        db_table = "notificacion_directa"
        ordering = ("-creado_en",)

class ExpensaConfig(models.Model):
    PERIODICIDAD_MENSUAL = "MENSUAL"
    PERIODICIDAD_TRIMESTRAL = "TRIMESTRAL"
    PERIODICIDAD_ANUAL = "ANUAL"
    PERIODICIDAD_CHOICES = [
        (PERIODICIDAD_MENSUAL, "Mensual"),
        (PERIODICIDAD_TRIMESTRAL, "Trimestral"),
        (PERIODICIDAD_ANUAL, "Anual"),
    ]

    ESTADO_ACTIVO = "ACTIVO"
    ESTADO_INACTIVO = "INACTIVO"
    ESTADO_CHOICES = [
        (ESTADO_ACTIVO, "Activo"),
        (ESTADO_INACTIVO, "Inactivo"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    condominio = models.ForeignKey(
        Condominio, on_delete=models.CASCADE, related_name="configuraciones_expensa"
    )
    bloque = models.CharField(max_length=20)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    periodicidad = models.CharField(
        max_length=12, choices=PERIODICIDAD_CHOICES, default=PERIODICIDAD_MENSUAL
    )
    estado = models.CharField(
        max_length=10, choices=ESTADO_CHOICES, default=ESTADO_ACTIVO
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "expensa_config"
        unique_together = ("condominio", "bloque")
        ordering = ("bloque",)

    def __str__(self):
        return f"{self.condominio.nombre} - Bloque {self.bloque}"

    @property
    def esta_activa(self):
        return self.estado == self.ESTADO_ACTIVO


class MultaConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=80, unique=True)
    descripcion = models.TextField(blank=True)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "multa_config"
        ordering = ("nombre",)

    def __str__(self):
        return self.nombre


class MultaAplicada(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vivienda = models.ForeignKey(
        Vivienda, on_delete=models.CASCADE, related_name="multas_aplicadas"
    )
    multa_config = models.ForeignKey(
        MultaConfig, on_delete=models.CASCADE, related_name="multas_aplicadas"
    )
    descripcion = models.TextField(blank=True)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_aplicacion = models.DateField(auto_now_add=True)
    factura = models.ForeignKey(
        "Factura", on_delete=models.SET_NULL, null=True, blank=True, related_name="multas"
    )
    periodo_facturado = models.CharField(max_length=7, null=True, blank=True)

    class Meta:
        db_table = "multa_aplicada"
        ordering = ("-fecha_aplicacion",)

    def __str__(self):
        return f"{self.multa_config.nombre} - {self.vivienda.codigo_unidad}"


class FacturaDetalle(models.Model):
    TIPO_EXPENSA = "EXPENSA"
    TIPO_MULTA = "MULTA"
    TIPO_CHOICES = [
        (TIPO_EXPENSA, "Expensa"),
        (TIPO_MULTA, "Multa"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    factura = models.ForeignKey(
        Factura, on_delete=models.CASCADE, related_name="detalles"
    )
    descripcion = models.CharField(max_length=160)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    multa_aplicada = models.ForeignKey(
        MultaAplicada,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="detalles_factura",
    )

    class Meta:
        db_table = "factura_detalle"
        ordering = ("factura", "tipo")

    def __str__(self):
        return f"{self.factura.periodo} - {self.descripcion}"

from django.db import models
from areas.models import AreaComun
from api.models import Usuario

class Mantenimiento(models.Model):
    TIPO_CHOICES = [
        ('preventivo', 'Preventivo'),
        ('correctivo', 'Correctivo'),
    ]
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('en_proceso', 'En proceso'),
        ('finalizado', 'Finalizado'),
        ('cancelado', 'Cancelado'),
    ]

    titulo = models.CharField(max_length=255)
    descripcion = models.TextField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    prioridad = models.CharField(max_length=10, default='media')
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_programada = models.DateTimeField(null=True, blank=True)
    
    imagen = models.ImageField(upload_to='mantenimientos/', null=True, blank=True)
    residente = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="solicitudes"
    )
    responsable = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="mantenimientos"
    )

    area_comun = models.ForeignKey(
        AreaComun, on_delete=models.SET_NULL, null=True, blank=True, related_name="mantenimientos"
    )

    costo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return self.titulo

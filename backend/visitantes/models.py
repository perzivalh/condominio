from django.db import models
from django.contrib.auth.models import User
from api.models import Usuario
from django.utils.timezone import now

class Visitante(models.Model):
    nombre = models.CharField(max_length=100)
    ci = models.CharField(max_length=20, unique=True)  # documento de identidad
    foto = models.ImageField(upload_to='visitantes/fotos/', null=True, blank=True)
    


    def __str__(self):
        return f"{self.nombre} ({self.ci})"

class HistorialVisita(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('autorizado', 'Autorizado'),
        ('denegado', 'Denegado'),
        ('ingresado', 'Ingresado'),
        ('salida', 'Salida'),
    ]

    visitante = models.ForeignKey(Visitante, on_delete=models.CASCADE, related_name='historiales')
    residente = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='visitas')
    motivo = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    autorizado = models.BooleanField(default=False)
    vehiculo = models.CharField(max_length=50, null=True, blank=True)  
    placa = models.CharField(max_length=20, null=True, blank=True)  
    notas = models.TextField(blank=True, null=True, help_text="Notas adicionales sobre el visitante")
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_ingreso = models.DateTimeField(null=True, blank=True)
    fecha_salida = models.DateTimeField(null=True, blank=True)
    foto_ingreso = models.ImageField(upload_to='visitantes/ingresos/', null=True, blank=True)
    foto_salida = models.ImageField(upload_to='visitantes/salida/', null=True, blank=True)

    def __str__(self):
        return f"{self.visitante.nombre} -> {self.residente.nombre} ({self.estado})"

from django.db import models
from django.contrib.auth.models import User
from api.models import Factura ,Usuario ,ResidenteVivienda

#MODELO AREAS COMUNES

class AreaComun(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    capacidad = models.IntegerField(blank=True, null=True)
    reglas = models.TextField(blank=True, null=True)
    costo = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    imagen = models.ImageField(upload_to="areas/", blank=True, null=True)
    
    def __str__(self):
        return self.nombre

#para mas imagenes
class ImagenArea(models.Model):
    area_comun = models.ForeignKey(AreaComun, related_name='imagenes', on_delete=models.CASCADE)
    imagen = models.ImageField(upload_to='areas/')

#MODELO RESERVAS
class Reserva(models.Model):
    ESTADOS = [
        ("pendiente", "Pendiente"),
        ("aprobada", "Aprobada"),
        ("rechazada", "Rechazada"),
        ("pagada", "Pagada"),
    ]

    area_comun = models.ForeignKey(AreaComun, on_delete=models.CASCADE, related_name="reservas")
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="reservas")
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    estado = models.CharField(max_length=10, choices=ESTADOS, default="pendiente")
    factura = models.OneToOneField(Factura, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.area_comun} - {self.usuario} ({self.fecha})"
    



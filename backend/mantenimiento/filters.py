# mantenimiento/filters.py
import django_filters
from .models import Mantenimiento

class MantenimientoFilter(django_filters.FilterSet):
    # 🟢 CAMBIAR a NumberFilter si AreaComun.id es un entero (AutoField)
    area = django_filters.NumberFilter(field_name='area_comun__id') 
    
    # También revisa 'residente' si es un ID entero
    residente = django_filters.NumberFilter(field_name='residente__id')

    class Meta:
        model = Mantenimiento
        fields = ['area', 'estado', 'residente']
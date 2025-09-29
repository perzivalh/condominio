from django.contrib import admin
from .models import AreaComun, ImagenArea  # Importa tu modelo

class ImagenAreaInline(admin.TabularInline):
    model = ImagenArea
    extra = 1  # Cuántas filas extra mostrar


@admin.register(AreaComun)
class AreaComunAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'descripcion', 'imagen')  # Campos que quieres ver
    search_fields = ('nombre',)  # Opcional: para buscar por nombre
    inlines = [ImagenAreaInline]
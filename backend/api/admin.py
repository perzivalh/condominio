from django.contrib import admin
from .models import Rol, Condominio  # 👈 importamos los modelos que queremos ver en el admin

# Registramos en el panel de administración
admin.site.register(Rol)
admin.site.register(Condominio)

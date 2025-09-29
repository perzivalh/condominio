from django.shortcuts import render
from rest_framework import serializers, viewsets, filters
from rest_framework.pagination import PageNumberPagination
from .models import Mantenimiento, Usuario
from .serializers import MantenimientoSerializer
from .filters import MantenimientoFilter
from django_filters.rest_framework import DjangoFilterBackend
# =======================
# Paginación para Mantenimiento
# =======================
class MantenimientoPagination(PageNumberPagination):
    page_size = 5  # elementos por página
    page_size_query_param = 'page_size'  # permite cambiar por query param
    max_page_size = 50

# =======================
# ViewSet para Mantenimiento
# =======================
class MantenimientoViewSet(viewsets.ModelViewSet):
    queryset = Mantenimiento.objects.all()
    serializer_class = MantenimientoSerializer
    pagination_class = MantenimientoPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter] 
    
    # 2. Asigna la clase de filtros que creaste
    filterset_class = MantenimientoFilter 
    search_fields = ['descripcion', 'area__nombre', 'residente__nombres', 'estado']

# =======================
# Serializer para Responsable
# =======================
class ResponsableSerializer(serializers.ModelSerializer):
    # ⚠️ CORRECCIÓN: El campo 'username' está en el modelo User, al que se accede vía 'user'
    username = serializers.CharField(source="user.username", read_only=True) 

    class Meta:
        model = Usuario
        fields = ["id", "username"]

# =======================
# ViewSet solo lectura para Responsables (Mantenimiento)
# =======================
class ResponsableViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Usuario.objects.filter(
        usuariorol__rol__nombre='MAN',  # filtra solo los usuarios con rol de mantenimiento
        usuariorol__estado=1
    ).distinct()
    serializer_class = ResponsableSerializer

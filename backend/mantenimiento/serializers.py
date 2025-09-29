from rest_framework import serializers
from .models import Mantenimiento
from areas.models import AreaComun
from areas.serializers import AreaComunSerializer
from api.models import Usuario
from api.models import ResidenteVivienda

class MantenimientoSerializer(serializers.ModelSerializer):
    area_comun = AreaComunSerializer(read_only=True)
    area_comun_id = serializers.PrimaryKeyRelatedField(
        queryset=AreaComun.objects.all(),
        source='area_comun',
        write_only=True,
        required=False,
        allow_null=True
    )

    imagen = serializers.ImageField(required=False, allow_null=True)
    residente_name = serializers.CharField(source="residente.user.username", read_only=True)
    responsable_name = serializers.CharField(source="responsable.user.username", read_only=True)

    responsable = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.filter(
            usuariorol__rol__nombre='MAN',
            usuariorol__estado=1
        ),
        required=False,
        allow_null=True
    )

    # Serializer interno para residente
    class ResidenteDataSerializer(serializers.Serializer):
        ci = serializers.CharField()
        nombres = serializers.CharField()
        apellidos = serializers.CharField()
        correo = serializers.CharField(allow_blank=True, allow_null=True)
        telefono = serializers.CharField(allow_blank=True, allow_null=True)
        vivienda_actual = serializers.SerializerMethodField()

        def get_vivienda_actual(self, residente):
            # Buscar la vivienda actual (fecha_hasta es null)
            try:
                rv = ResidenteVivienda.objects.get(residente=residente, fecha_hasta__isnull=True)
                vivienda = rv.vivienda
                return {
                    "codigo_unidad": vivienda.codigo_unidad,
                    "bloque": vivienda.bloque,
                    "numero": vivienda.numero
                }
            except ResidenteVivienda.DoesNotExist:
                return None

    residente_data = serializers.SerializerMethodField()

    class Meta:
        model = Mantenimiento
        fields = [
            'id', 'titulo', 'descripcion', 'tipo', 'estado', 'prioridad',
            'fecha_solicitud', 'fecha_programada',
            'residente', 'residente_name', 'residente_data',
            'responsable', 'responsable_name',
            'area_comun', 'area_comun_id',
            'costo', 'imagen',
        ]
        read_only_fields = ['residente', 'residente_name', 'responsable_name', 'fecha_solicitud']

    def get_residente_data(self, obj):
        if obj.residente and hasattr(obj.residente, 'residente'):
            return self.ResidenteDataSerializer(obj.residente.residente).data
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        if 'residente' not in validated_data and user:
            try:
                validated_data['residente'] = user.usuario
            except Usuario.DoesNotExist:
                pass
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'imagen' not in validated_data:
            validated_data['imagen'] = instance.imagen
        return super().update(instance, validated_data)

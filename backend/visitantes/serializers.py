from rest_framework import serializers
from .models import Visitante, HistorialVisita
from api.models import Residente, ResidenteVivienda


class VisitanteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visitante
        fields = '__all__'


class HistorialVisitaSerializer(serializers.ModelSerializer):
    visitante = VisitanteSerializer(read_only=True)
    residente = serializers.StringRelatedField(read_only=True)
    residente_info = serializers.SerializerMethodField()
    fecha_registro = serializers.DateTimeField(format="%d/%m/%Y %H:%M", read_only=True)
    fecha_ingreso = serializers.DateTimeField(format="%d/%m/%Y %H:%M", required=False, allow_null=True)
    fecha_salida = serializers.DateTimeField(format="%d/%m/%Y %H:%M", required=False, allow_null=True)

    fecha_ingreso_iso = serializers.DateTimeField(source='fecha_ingreso', format=None, read_only=True)
    fecha_salida_iso = serializers.DateTimeField(source='fecha_salida', format=None, read_only=True)

    class Meta:
        model = HistorialVisita
        fields = '__all__'
        read_only_fields = ['autorizado', 'estado', 'fecha_registro', 'fecha_ingreso', 'fecha_salida']

    def get_residente_info(self, obj):
        """
        Devuelve información del residente asociada al historial.
        """
        if not obj.residente:
            return None

        try:
            # Obtener la instancia de Residente a partir del usuario relacionado
            residente_obj = Residente.objects.get(usuario=obj.residente)

            # Obtener la vivienda asociada
            try:
                residente_vivienda = ResidenteVivienda.objects.get(residente=residente_obj)
                vivienda_nombre = residente_vivienda.vivienda.codigo_unidad
            except ResidenteVivienda.DoesNotExist:
                vivienda_nombre = None

            return {
                "nombre_completo": f"{residente_obj.nombres} {residente_obj.apellidos}",
                "apartamento": vivienda_nombre,
                "telefono": residente_obj.telefono
            }

        except Residente.DoesNotExist:
            return None

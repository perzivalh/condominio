from rest_framework import serializers
from .models import AreaComun, Reserva, ImagenArea
from django.contrib.auth.models import User
from api.models import Factura , Usuario  

class ImagenAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenArea
        fields = ('id', 'imagen')



class AreaComunSerializer(serializers.ModelSerializer):
    imagenes = ImagenAreaSerializer(many=True, read_only=True)

    class Meta:
        model = AreaComun
        fields = ['id', 'nombre', 'descripcion','capacidad', 'costo', 'imagen', 'imagenes']

class UsuarioSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = Usuario
        fields = ['id', 'username']

class FacturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Factura
        fields = ['id', 'monto', 'tipo', 'estado', 'fecha_pago']

class ReservaSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer(read_only=True)
    factura = FacturaSerializer(read_only=True)  # Mostrar la factura si existe

    # Para enviar solo el ID desde Flutter
    area_comun_id = serializers.PrimaryKeyRelatedField(
        queryset=AreaComun.objects.all(),
        source='area_comun',
        write_only=True
    )

    # Para leer el objeto completo
    area_comun = AreaComunSerializer(read_only=True)

    class Meta:
        model = Reserva
        fields = [
            'id',
            'usuario',
            'area_comun',
            'area_comun_id',
            'fecha',
            'hora_inicio',
            'hora_fin',
            'estado',
            'factura',  # Incluimos la factura
        ]

    def validate(self, data):
        area = data.get('area_comun')
        fecha = data.get('fecha')
        hora_inicio = data.get('hora_inicio')
        hora_fin = data.get('hora_fin')

        if not area or not fecha or not hora_inicio or not hora_fin:
            raise serializers.ValidationError("Faltan campos obligatorios")

        # Validar conflicto solo con reservas aprobadas
        reservas_conflictivas = Reserva.objects.filter(
            area_comun=area,
            fecha=fecha,
            estado='aprobada'
        ).exclude(
            id=self.instance.id if self.instance else None
        ).filter(
            hora_inicio__lt=hora_fin,
            hora_fin__gt=hora_inicio
        )

        if reservas_conflictivas.exists():
            raise serializers.ValidationError("El área ya está reservada en ese horario")

        return data

    def create(self, validated_data):
        # Al crear, el estado siempre será pendiente
        validated_data['estado'] = 'pendiente'
        return super().create(validated_data)

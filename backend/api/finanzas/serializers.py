from rest_framework import serializers

from ..models import Factura, Pago


class FacturaSerializer(serializers.ModelSerializer):
    vivienda_codigo = serializers.CharField(source="vivienda.codigo_unidad", read_only=True)

    class Meta:
        model = Factura
        fields = [
            "id",
            "vivienda",
            "vivienda_codigo",
            "periodo",
            "monto",
            "tipo",
            "estado",
            "fecha_emision",
            "fecha_vencimiento",
            "fecha_pago",
        ]
        read_only_fields = [
            "fecha_emision",
            "fecha_pago",
        ]


class PagoSerializer(serializers.ModelSerializer):
    factura_periodo = serializers.CharField(source="factura.periodo", read_only=True)

    class Meta:
        model = Pago
        fields = [
            "id",
            "factura",
            "factura_periodo",
            "metodo",
            "monto_pagado",
            "fecha_pago",
            "comprobante_url",
            "estado",
            "referencia_externa",
        ]
        read_only_fields = ["fecha_pago"]

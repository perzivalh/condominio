from rest_framework import serializers

from ..models import (
    Condominio,
    ExpensaConfig,
    Factura,
    FacturaDetalle,
    MultaAplicada,
    MultaConfig,
    Pago,
    ResidenteVivienda,
    Vivienda,
)


class ExpensaConfigSerializer(serializers.ModelSerializer):
    condominio_id = serializers.PrimaryKeyRelatedField(
        source="condominio", queryset=Condominio.objects.all()
    )
    condominio_nombre = serializers.CharField(
        source="condominio.nombre", read_only=True
    )
    periodicidad_label = serializers.CharField(
        source="get_periodicidad_display", read_only=True
    )
    estado_label = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = ExpensaConfig
        fields = [
            "id",
            "condominio_id",
            "condominio_nombre",
            "bloque",
            "monto",
            "periodicidad",
            "periodicidad_label",
            "estado",
            "estado_label",
            "creado_en",
            "actualizado_en",
        ]


class MultaConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = MultaConfig
        fields = ["id", "nombre", "descripcion", "monto", "activo", "creado_en", "actualizado_en"]


class MultaAplicadaSerializer(serializers.ModelSerializer):
    vivienda_id = serializers.PrimaryKeyRelatedField(
        source="vivienda", queryset=Vivienda.objects.all(), write_only=True
    )
    multa_config_id = serializers.PrimaryKeyRelatedField(
        source="multa_config", queryset=MultaConfig.objects.all(), write_only=True
    )
    vivienda_codigo = serializers.CharField(
        source="vivienda.codigo_unidad", read_only=True
    )
    vivienda_bloque = serializers.CharField(
        source="vivienda.bloque", read_only=True
    )
    multa_nombre = serializers.CharField(source="multa_config.nombre", read_only=True)
    multa_descripcion = serializers.CharField(
        source="multa_config.descripcion", read_only=True
    )
    factura_id = serializers.UUIDField(source="factura.id", read_only=True)
    monto = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    class Meta:
        model = MultaAplicada
        fields = [
            "id",
            "vivienda_id",
            "vivienda_codigo",
            "vivienda_bloque",
            "multa_config_id",
            "multa_nombre",
            "multa_descripcion",
            "descripcion",
            "monto",
            "fecha_aplicacion",
            "factura_id",
            "periodo_facturado",
        ]
        read_only_fields = ["fecha_aplicacion", "factura_id", "periodo_facturado"]

    def validate(self, attrs):
        multa_config = attrs.get("multa_config") or getattr(self.instance, "multa_config", None)
        if multa_config and not multa_config.activo:
            raise serializers.ValidationError("El tipo de multa seleccionado está inactivo.")
        if "monto" not in attrs or attrs.get("monto") is None:
            if multa_config:
                attrs["monto"] = multa_config.monto
        if "descripcion" not in attrs or not attrs.get("descripcion"):
            if multa_config:
                attrs["descripcion"] = multa_config.descripcion or multa_config.nombre
        return attrs


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


class FacturaDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacturaDetalle
        fields = ["id", "descripcion", "tipo", "monto"]


class FacturaAdminSerializer(serializers.ModelSerializer):
    vivienda_codigo = serializers.CharField(source="vivienda.codigo_unidad", read_only=True)
    vivienda_bloque = serializers.CharField(source="vivienda.bloque", read_only=True)
    condominio_nombre = serializers.CharField(
        source="vivienda.condominio.nombre", read_only=True
    )
    residentes = serializers.SerializerMethodField()

    class Meta:
        model = Factura
        fields = [
            "id",
            "vivienda",
            "vivienda_codigo",
            "vivienda_bloque",
            "condominio_nombre",
            "periodo",
            "monto",
            "tipo",
            "estado",
            "fecha_emision",
            "fecha_vencimiento",
            "fecha_pago",
            "residentes",
        ]

    def get_residentes(self, obj):
        vivienda = getattr(obj, "vivienda", None)
        relaciones = None
        if vivienda is not None:
            relaciones = getattr(vivienda, "_residentes_activos", None)
        if relaciones is None:
            relaciones = (
                ResidenteVivienda.objects.select_related("residente")
                .filter(vivienda=obj.vivienda, fecha_hasta__isnull=True)
                .order_by("-fecha_desde")
            )
        nombres = []
        for relacion in relaciones:
            residente = relacion.residente
            nombres.append(f"{residente.nombres} {residente.apellidos}".strip())
        return nombres


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

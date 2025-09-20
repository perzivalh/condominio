import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_factura_pago"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExpensaConfig",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("bloque", models.CharField(max_length=20)),
                ("monto", models.DecimalField(decimal_places=2, max_digits=10)),
                (
                    "periodicidad",
                    models.CharField(
                        choices=[
                            ("MENSUAL", "Mensual"),
                            ("TRIMESTRAL", "Trimestral"),
                            ("ANUAL", "Anual"),
                        ],
                        default="MENSUAL",
                        max_length=12,
                    ),
                ),
                (
                    "estado",
                    models.CharField(
                        choices=[("ACTIVO", "Activo"), ("INACTIVO", "Inactivo")],
                        default="ACTIVO",
                        max_length=10,
                    ),
                ),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                (
                    "condominio",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="configuraciones_expensa",
                        to="api.condominio",
                    ),
                ),
            ],
            options={
                "db_table": "expensa_config",
                "ordering": ("bloque",),
                "unique_together": {("condominio", "bloque")},
            },
        ),
        migrations.CreateModel(
            name="MultaConfig",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("nombre", models.CharField(max_length=80, unique=True)),
                ("descripcion", models.TextField(blank=True)),
                ("monto", models.DecimalField(decimal_places=2, max_digits=10)),
                ("activo", models.BooleanField(default=True)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "multa_config",
                "ordering": ("nombre",),
            },
        ),
        migrations.CreateModel(
            name="MultaAplicada",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("descripcion", models.TextField(blank=True)),
                ("monto", models.DecimalField(decimal_places=2, max_digits=10)),
                ("fecha_aplicacion", models.DateField(auto_now_add=True)),
                ("periodo_facturado", models.CharField(blank=True, max_length=7, null=True)),
                (
                    "multa_config",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="multas_aplicadas",
                        to="api.multaconfig",
                    ),
                ),
                (
                    "vivienda",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="multas_aplicadas",
                        to="api.vivienda",
                    ),
                ),
                (
                    "factura",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="multas",
                        to="api.factura",
                    ),
                ),
            ],
            options={
                "db_table": "multa_aplicada",
                "ordering": ("-fecha_aplicacion",),
            },
        ),
        migrations.CreateModel(
            name="FacturaDetalle",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                (
                    "descripcion",
                    models.CharField(max_length=160),
                ),
                (
                    "tipo",
                    models.CharField(
                        choices=[("EXPENSA", "Expensa"), ("MULTA", "Multa")],
                        max_length=10,
                    ),
                ),
                ("monto", models.DecimalField(decimal_places=2, max_digits=10)),
                (
                    "factura",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="detalles",
                        to="api.factura",
                    ),
                ),
                (
                    "multa_aplicada",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="detalles_factura",
                        to="api.multaaplicada",
                    ),
                ),
            ],
            options={
                "db_table": "factura_detalle",
                "ordering": ("factura", "tipo"),
            },
        ),
    ]

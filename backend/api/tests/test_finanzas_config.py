from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from ..models import (
    Condominio,
    ExpensaConfig,
    Factura,
    FacturaDetalle,
    MultaAplicada,
    Usuario,
    Vivienda,
)


class FinanzasConfiguracionTests(APITestCase):
    def setUp(self):
        self.auth_user = User.objects.create_user(
            username="admin", email="admin@example.com", password="pass1234"
        )
        self.usuario = Usuario.objects.create(user=self.auth_user)
        self.client.force_authenticate(user=self.auth_user)

        self.condominio = Condominio.objects.create(nombre="Condominio Norte")
        self.vivienda = Vivienda.objects.create(
            condominio=self.condominio,
            codigo_unidad="A01",
            bloque="A",
            numero="01",
        )

    def test_crear_actualizar_eliminar_expensa(self):
        data = {
            "condominio_id": str(self.condominio.id),
            "bloque": "A",
            "monto": "350.00",
            "periodicidad": ExpensaConfig.PERIODICIDAD_MENSUAL,
        }
        response = self.client.post(
            "/api/finanzas/config/expensas/", data=data, format="json"
        )
        self.assertEqual(response.status_code, 201)
        expensa_id = response.data["id"]

        patch_data = {"monto": "375.00", "estado": ExpensaConfig.ESTADO_INACTIVO}
        response = self.client.patch(
            f"/api/finanzas/config/expensas/{expensa_id}/", data=patch_data, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["monto"], "375.00")
        self.assertEqual(response.data["estado"], ExpensaConfig.ESTADO_INACTIVO)

        delete_response = self.client.delete(
            f"/api/finanzas/config/expensas/{expensa_id}/"
        )
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(ExpensaConfig.objects.filter(id=expensa_id).exists())

    def test_aplicar_multa_y_generar_factura(self):
        ExpensaConfig.objects.create(
            condominio=self.condominio,
            bloque="A",
            monto=Decimal("300.00"),
            periodicidad=ExpensaConfig.PERIODICIDAD_MENSUAL,
        )

        response = self.client.post(
            "/api/finanzas/config/multas/catalogo/",
            data={
                "nombre": "Auto mal estacionado",
                "descripcion": "Vehículo bloqueando salida",
                "monto": "150.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        multa_config_id = response.data["id"]

        aplicar_response = self.client.post(
            "/api/finanzas/config/multas/",
            data={
                "vivienda_id": str(self.vivienda.id),
                "multa_config_id": multa_config_id,
            },
            format="json",
        )
        self.assertEqual(aplicar_response.status_code, 201)
        multa_id = aplicar_response.data["id"]

        listado_response = self.client.get("/api/finanzas/config/multas/")
        self.assertEqual(listado_response.status_code, 200)
        self.assertEqual(len(listado_response.data), 1)

        periodo = timezone.localdate().strftime("%Y-%m")
        generar_response = self.client.post(
            "/api/finanzas/admin/generar-facturas/",
            data={"periodo": periodo},
            format="json",
        )
        self.assertEqual(generar_response.status_code, 200)
        self.assertEqual(Factura.objects.filter(vivienda=self.vivienda, periodo=periodo).count(), 1)

        factura = Factura.objects.get(vivienda=self.vivienda, periodo=periodo)
        self.assertEqual(factura.monto, Decimal("450.00"))
        detalles = FacturaDetalle.objects.filter(factura=factura).order_by("tipo")
        self.assertEqual(detalles.count(), 2)

        multa_actualizada = MultaAplicada.objects.get(id=multa_id)
        self.assertEqual(multa_actualizada.factura_id, factura.id)
        self.assertEqual(multa_actualizada.periodo_facturado, periodo)

        # La multa ya facturada no debería aparecer como pendiente
        pendientes = self.client.get("/api/finanzas/config/multas/")
        self.assertEqual(pendientes.status_code, 200)
        self.assertEqual(len(pendientes.data), 0)

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from ..models import (
    Condominio,
    Factura,
    FacturaDetalle,
    MultaAplicada,
    MultaConfig,
    Pago,
    Residente,
    ResidenteVivienda,
    Usuario,
    Vivienda,
)


class FinanzasAdminSummaryTests(APITestCase):
    def setUp(self):
        self.auth_user = User.objects.create_user(
            username="admin", email="admin@example.com", password="pass1234"
        )
        self.usuario = Usuario.objects.create(user=self.auth_user)
        self.client.force_authenticate(user=self.auth_user)

        condominio = Condominio.objects.create(nombre="Condominio Central")
        self.vivienda = Vivienda.objects.create(
            condominio=condominio,
            codigo_unidad="A-101",
            bloque="A",
            numero="101",
        )

        today = timezone.localdate()
        self.current_period = today.strftime("%Y-%m")
        previous_month_date = (today - timedelta(days=30))
        self.previous_period = previous_month_date.strftime("%Y-%m")

        self.factura_mes_pendiente = Factura.objects.create(
            vivienda=self.vivienda,
            periodo=self.current_period,
            monto=Decimal("1500.00"),
            estado="PENDIENTE",
            fecha_vencimiento=today + timedelta(days=5),
        )
        self.factura_mes_pagada = Factura.objects.create(
            vivienda=self.vivienda,
            periodo=self.current_period,
            monto=Decimal("800.00"),
            estado="PAGADO",
            fecha_vencimiento=today,
        )
        self.factura_vencida = Factura.objects.create(
            vivienda=self.vivienda,
            periodo=self.previous_period,
            monto=Decimal("1000.00"),
            estado="PENDIENTE",
            fecha_vencimiento=today - timedelta(days=10),
        )

        Pago.objects.create(
            factura=self.factura_mes_pagada,
            metodo="transferencia",
            monto_pagado=Decimal("800.00"),
            estado="APROBADO",
        )
        pago_prev = Pago.objects.create(
            factura=self.factura_vencida,
            metodo="transferencia",
            monto_pagado=Decimal("400.00"),
            estado="APROBADO",
        )
        Pago.objects.filter(id=pago_prev.id).update(
            fecha_pago=timezone.now() - timedelta(days=30)
        )

    def test_admin_summary_returns_expected_metrics(self):
        response = self.client.get("/api/finanzas/admin/resumen/")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["ingresos_mes"], "2300.00")
        self.assertEqual(data["pagado_mes"], "800.00")
        self.assertEqual(data["pendiente_mes"], "1500.00")
        self.assertEqual(data["morosidad_total"], "1000.00")

        facturas = data.get("facturas", {})
        self.assertEqual(facturas.get("total_emitidas"), 3)
        self.assertEqual(facturas.get("total_pagadas"), 1)
        self.assertAlmostEqual(facturas.get("porcentaje_pagadas"), 33.33)

        ingresos_mensuales = data.get("ingresos_mensuales", [])
        self.assertEqual(len(ingresos_mensuales), 7)

        current_period_entry = ingresos_mensuales[-1]
        self.assertEqual(current_period_entry["periodo"], self.current_period)
        self.assertAlmostEqual(float(current_period_entry["total"]), 800.0)

        prev_period_entry = next(
            (item for item in ingresos_mensuales if item["periodo"] == self.previous_period),
            None,
        )
        self.assertIsNotNone(prev_period_entry)
        self.assertAlmostEqual(float(prev_period_entry["total"]), 400.0)


class FinanzasAdminInvoiceTests(APITestCase):
    def setUp(self):
        self.auth_user = User.objects.create_user(
            username="admin2", email="admin2@example.com", password="pass1234"
        )
        self.usuario = Usuario.objects.create(user=self.auth_user)
        self.client.force_authenticate(user=self.auth_user)

        self.condominio = Condominio.objects.create(nombre="Colinas del Este")
        self.vivienda_a = Vivienda.objects.create(
            condominio=self.condominio,
            codigo_unidad="A01",
            bloque="A",
            numero="01",
        )
        self.vivienda_b = Vivienda.objects.create(
            condominio=self.condominio,
            codigo_unidad="B02",
            bloque="B",
            numero="02",
        )

        self.residente_a = Residente.objects.create(
            ci="123",
            nombres="Juan",
            apellidos="Pérez",
        )
        self.residente_b = Residente.objects.create(
            ci="456",
            nombres="Ana",
            apellidos="Rojas",
        )

        ResidenteVivienda.objects.create(
            residente=self.residente_a,
            vivienda=self.vivienda_a,
            fecha_desde=timezone.localdate(),
        )
        ResidenteVivienda.objects.create(
            residente=self.residente_b,
            vivienda=self.vivienda_b,
            fecha_desde=timezone.localdate(),
        )

        multa_config = MultaConfig.objects.create(
            nombre="Parqueo", descripcion="Mal uso", monto="50.00"
        )
        multa_aplicada = MultaAplicada.objects.create(
            vivienda=self.vivienda_a,
            multa_config=multa_config,
            descripcion="Multa ejemplo",
            monto="50.00",
        )

        today = timezone.localdate()
        self.factura_pendiente = Factura.objects.create(
            vivienda=self.vivienda_a,
            periodo=today.strftime("%Y-%m"),
            monto="200.00",
            estado="PENDIENTE",
            fecha_vencimiento=today + timedelta(days=10),
        )
        FacturaDetalle.objects.create(
            factura=self.factura_pendiente,
            descripcion="Expensa bloque A",
            tipo=FacturaDetalle.TIPO_EXPENSA,
            monto="150.00",
        )
        FacturaDetalle.objects.create(
            factura=self.factura_pendiente,
            descripcion="Multa ejemplo",
            tipo=FacturaDetalle.TIPO_MULTA,
            monto="50.00",
            multa_aplicada=multa_aplicada,
        )

        self.factura_pagada = Factura.objects.create(
            vivienda=self.vivienda_b,
            periodo=today.strftime("%Y-%m"),
            monto="120.00",
            estado="PAGADA",
            fecha_vencimiento=today + timedelta(days=5),
            fecha_pago=today,
        )
        Pago.objects.create(
            factura=self.factura_pagada,
            metodo="TRANSFERENCIA",
            monto_pagado="120.00",
            estado="CONFIRMADO",
        )

    def test_list_facturas_admin_with_filters(self):
        response = self.client.get("/api/finanzas/admin/facturas/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)

        response = self.client.get(
            "/api/finanzas/admin/facturas/",
            {"estado": "pendiente"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], str(self.factura_pendiente.id))
        self.assertIn("Juan Pérez", ", ".join(data[0]["residentes"]))

        response = self.client.get(
            "/api/finanzas/admin/facturas/",
            {"residente": "Ana"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], str(self.factura_pagada.id))

    def test_factura_admin_detalle_and_pdf(self):
        response = self.client.get(
            f"/api/finanzas/admin/facturas/{self.factura_pendiente.id}/"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["factura"]["id"], str(self.factura_pendiente.id))
        self.assertEqual(len(payload["detalles"]), 2)

        pdf_response = self.client.get(
            f"/api/finanzas/admin/facturas/{self.factura_pendiente.id}/pdf/"
        )
        self.assertEqual(pdf_response.status_code, 200)
        self.assertEqual(pdf_response["Content-Type"], "application/pdf")
        self.assertTrue(pdf_response.content.startswith(b"%PDF"))

    def test_registrar_pago_manual(self):
        fecha_pago = (timezone.localdate() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = self.client.post(
            f"/api/finanzas/admin/facturas/{self.factura_pendiente.id}/registrar-pago/",
            {
                "monto_pagado": "200.00",
                "metodo": "efectivo",
                "referencia": "Caja",
                "fecha_pago": fecha_pago,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["factura"]["estado"], "PAGADA")
        self.assertEqual(len(payload["pagos"]), 1)

        factura_actualizada = Factura.objects.get(pk=self.factura_pendiente.pk)
        self.assertEqual(factura_actualizada.estado, "PAGADA")
        self.assertEqual(str(factura_actualizada.fecha_pago), fecha_pago)

        response = self.client.post(
            f"/api/finanzas/admin/facturas/{self.factura_pagada.id}/registrar-pago/",
            {"monto_pagado": "10.00"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

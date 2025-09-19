from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from ..models import Condominio, Factura, Pago, Usuario, Vivienda


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

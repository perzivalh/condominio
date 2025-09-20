from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

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

        residente_user = User.objects.create_user(
            username="residente1", email="residente1@example.com", password="pass1234"
        )
        self.usuario_residente_a = Usuario.objects.create(user=residente_user)
        self.residente_a.usuario = self.usuario_residente_a
        self.residente_a.save()

        self.resident_client = APIClient()
        self.resident_client.force_authenticate(user=residente_user)

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

    def test_residente_puede_descargar_factura_pdf(self):
        response = self.resident_client.get(
            f"/api/finanzas/facturas/{self.factura_pendiente.id}/pdf/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF"))

        otra_factura = self.resident_client.get(
            f"/api/finanzas/facturas/{self.factura_pagada.id}/pdf/"
        )
        self.assertEqual(otra_factura.status_code, 404)

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

    def test_admin_resolver_pago_revision_aprueba(self):
        pago = Pago.objects.create(
            factura=self.factura_pendiente,
            metodo="QR",
            monto_pagado=Decimal("200.00"),
            estado="REVISION",
            registrado_por=self.usuario_residente_a,
        )

        response = self.client.post(
            f"/api/finanzas/admin/facturas/{self.factura_pendiente.id}/pagos/{pago.id}/resolver/",
            {"accion": "aprobar"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.factura_pendiente.refresh_from_db()
        pago.refresh_from_db()
        self.assertEqual(self.factura_pendiente.estado.upper(), "PAGADA")
        self.assertIsNotNone(self.factura_pendiente.fecha_pago)
        self.assertEqual(pago.estado.upper(), "CONFIRMADO")

    def test_admin_resolver_pago_revision_rechaza(self):
        pago = Pago.objects.create(
            factura=self.factura_pendiente,
            metodo="QR",
            monto_pagado=Decimal("200.00"),
            estado="REVISION",
            registrado_por=self.usuario_residente_a,
        )

        response = self.client.post(
            f"/api/finanzas/admin/facturas/{self.factura_pendiente.id}/pagos/{pago.id}/resolver/",
            {"accion": "rechazar", "comentario": "No coincide el monto"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.factura_pendiente.refresh_from_db()
        pago.refresh_from_db()
        self.assertEqual(self.factura_pendiente.estado.upper(), "PENDIENTE")
        self.assertIsNone(self.factura_pendiente.fecha_pago)
        self.assertEqual(pago.estado.upper(), "RECHAZADO")
        self.assertIn("No coincide", pago.comentario)

    def test_admin_puede_cargar_y_reemplazar_qr(self):
        primera_imagen = SimpleUploadedFile(
            "qr1.png", b"fake image data", content_type="image/png"
        )
        response = self.client.post(
            "/api/finanzas/admin/codigo-qr/",
            {"archivo": primera_imagen, "descripcion": "Inicial"},
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("url", data)
        primer_id = data["id"]

        segunda_imagen = SimpleUploadedFile(
            "qr2.png", b"second fake image", content_type="image/png"
        )
        response = self.client.post(
            "/api/finanzas/admin/codigo-qr/",
            {"archivo": segunda_imagen, "descripcion": "Actualizado"},
        )
        self.assertEqual(response.status_code, 201)
        data_reemplazo = response.json()
        self.assertEqual(primer_id, data_reemplazo["id"])
        self.assertIn("Actualizado", data_reemplazo.get("descripcion", ""))

    def test_admin_crea_notificacion_directa(self):
        payload = {
            "residente": str(self.residente_a.id),
            "titulo": "Pago confirmado",
            "mensaje": "Tu pago ha sido registrado",
        }
        response = self.client.post(
            "/api/finanzas/admin/notificaciones/",
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["titulo"], "Pago confirmado")
        self.assertEqual(data["residente"], str(self.residente_a.id))


class FinanzasResidentPaymentTests(APITestCase):
    def setUp(self):
        self.auth_user = User.objects.create_user(
            username="residente_app", email="residente@app.com", password="pass1234"
        )
        self.usuario_residente = Usuario.objects.create(user=self.auth_user)
        self.client.force_authenticate(user=self.auth_user)

        condominio = Condominio.objects.create(nombre="Central Residencial")
        self.vivienda = Vivienda.objects.create(
            condominio=condominio,
            codigo_unidad="C-101",
            bloque="C",
            numero="101",
        )
        self.residente = Residente.objects.create(
            ci="999", nombres="Laura", apellidos="Suarez"
        )
        self.residente.usuario = self.usuario_residente
        self.residente.save()
        ResidenteVivienda.objects.create(
            residente=self.residente,
            vivienda=self.vivienda,
            fecha_desde=timezone.localdate(),
        )

        periodo = timezone.localdate().strftime("%Y-%m")
        self.factura = Factura.objects.create(
            vivienda=self.vivienda,
            periodo=periodo,
            monto=Decimal("180.00"),
            estado="PENDIENTE",
            fecha_vencimiento=timezone.localdate() + timedelta(days=10),
        )

    def test_residente_confirma_pago_crea_revision(self):
        response = self.client.post(
            f"/api/finanzas/facturas/{self.factura.id}/confirmar-pago/",
            {"monto_pagado": "180.00", "comentario": "Pago via QR"},
            format="json",
        )
        self.assertEqual(response.status_code, 202)

        self.factura.refresh_from_db()
        self.assertEqual(self.factura.estado.upper(), "REVISION")
        pago = Pago.objects.get(factura=self.factura)
        self.assertEqual(pago.estado.upper(), "REVISION")
        self.assertEqual(pago.registrado_por, self.usuario_residente)

    def test_residente_recupera_y_lee_notificaciones(self):
        self.client.post(
            f"/api/finanzas/facturas/{self.factura.id}/confirmar-pago/",
            {"monto_pagado": "180.00"},
            format="json",
        )

        response = self.client.get("/api/finanzas/notificaciones/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)
        notificacion_id = data[0]["id"]
        self.assertEqual(data[0]["estado"], "ENVIADA")

        mark_response = self.client.post(
            f"/api/finanzas/notificaciones/{notificacion_id}/leida/"
        )
        self.assertEqual(mark_response.status_code, 204)

        response = self.client.get("/api/finanzas/notificaciones/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data[0]["estado"], "LEIDA")

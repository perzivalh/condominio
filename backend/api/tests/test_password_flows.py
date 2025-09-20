from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient

from api.models import Usuario, TokenRecuperacion


class PasswordFlowsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="residente",
            password="ViejaClave123",
            email="residente@example.com",
        )
        self.usuario = Usuario.objects.create(user=self.user)

    def test_recuperar_password_creates_token(self):
        response = self.client.post(
            "/api/recuperar-password/",
            {"correo": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            TokenRecuperacion.objects.filter(usuario=self.usuario, usado=False).exists()
        )

    def test_reset_password_updates_user_password(self):
        token = TokenRecuperacion.objects.create(
            usuario=self.usuario,
            codigo="TOK12345",
            expiracion=timezone.now() + timedelta(minutes=15),
            usado=False,
        )

        response = self.client.post(
            "/api/reset-password/",
            {
                "correo": self.user.email,
                "token": token.codigo,
                "nueva_password": "NuevaClave456",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NuevaClave456"))
        token.refresh_from_db()
        self.assertTrue(token.usado)

    def test_cambiar_password_requires_current_password(self):
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.post(
            "/api/cambiar-password/",
            {
                "password_actual": "ViejaClave123",
                "nueva_password": "ClaveNueva789",
                "confirmacion": "ClaveNueva789",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("ClaveNueva789"))

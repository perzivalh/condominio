from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from ..models import Aviso, Rol, Usuario, UsuarioRol


class AvisosApiTests(APITestCase):
    def setUp(self):
        self.rol_admin, _ = Rol.objects.get_or_create(nombre="ADM")
        self.rol_res, _ = Rol.objects.get_or_create(nombre="RES")

        self.admin_user = User.objects.create_user(
            username="admin", email="admin@example.com", password="pass1234"
        )
        self.admin_usuario = Usuario.objects.create(user=self.admin_user)
        UsuarioRol.objects.create(usuario=self.admin_usuario, rol=self.rol_admin, estado=1)

        self.client.force_authenticate(user=self.admin_user)

    def test_publicar_aviso_actualiza_estado_y_fecha(self):
        aviso = Aviso.objects.create(
            autor_usuario=self.admin_usuario,
            titulo="Aviso de prueba",
            contenido="Contenido inicial",
        )

        response = self.client.post(f"/api/avisos/{aviso.id}/publicar/")
        self.assertEqual(response.status_code, 200)

        aviso.refresh_from_db()
        self.assertEqual(aviso.estado, Aviso.ESTADO_PUBLICADO)
        self.assertIsNotNone(aviso.fecha_publicacion)
        self.assertGreaterEqual(aviso.fecha_publicacion, aviso.fecha_creacion)

    def test_residente_solo_visualiza_publicados(self):
        Aviso.objects.create(
            autor_usuario=self.admin_usuario,
            titulo="Borrador",
            contenido="Contenido en borrador",
        )
        publicado = Aviso.objects.create(
            autor_usuario=self.admin_usuario,
            titulo="Aviso publicado",
            contenido="Contenido visible",
            estado=Aviso.ESTADO_PUBLICADO,
            fecha_publicacion=timezone.now(),
        )

        residente_user = User.objects.create_user(
            username="residente",
            email="residente@example.com",
            password="pass1234",
        )
        residente_usuario = Usuario.objects.create(user=residente_user)
        UsuarioRol.objects.create(usuario=residente_usuario, rol=self.rol_res, estado=1)

        residente_client = APIClient()
        residente_client.force_authenticate(user=residente_user)

        response = residente_client.get("/api/avisos/")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], str(publicado.id))

    def test_residente_no_puede_publicar(self):
        aviso = Aviso.objects.create(
            autor_usuario=self.admin_usuario,
            titulo="Aviso restringido",
            contenido="Contenido",
        )

        residente_user = User.objects.create_user(
            username="residente2",
            email="residente2@example.com",
            password="pass1234",
        )
        residente_usuario = Usuario.objects.create(user=residente_user)
        UsuarioRol.objects.create(usuario=residente_usuario, rol=self.rol_res, estado=1)

        residente_client = APIClient()
        residente_client.force_authenticate(user=residente_user)

        response = residente_client.post(f"/api/avisos/{aviso.id}/publicar/")
        self.assertEqual(response.status_code, 403)

        aviso.refresh_from_db()
        self.assertEqual(aviso.estado, Aviso.ESTADO_BORRADOR)
        self.assertIsNone(aviso.fecha_publicacion)

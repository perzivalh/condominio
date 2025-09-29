from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Usuario, Rol, UsuarioRol, Condominio, Vivienda, Residente, ResidenteVivienda
from datetime import date

class Command(BaseCommand):
    help = "Seed inicial de usuarios, roles, condominios, viviendas y residentes"

    def handle(self, *args, **kwargs):
        self.stdout.write("⏳ Ejecutando seed...")

        # ---------------- Roles ----------------
        roles = ["ADM", "GUA", "RES", "MAN"]
        rol_objs = {}
        for nombre in roles:
            rol_obj, _ = Rol.objects.get_or_create(nombre=nombre)
            rol_objs[nombre] = rol_obj

        # ---------------- Usuarios ----------------
        usuarios_data = [
            {"username": "admin", "password": "admin123", "roles": ["ADM"]},
            {"username": "guardia1", "password": "guardia123", "roles": ["GUA"]},
            {"username": "residente1", "password": "residente123", "roles": ["RES"]},
            {"username": "manager1", "password": "manager123", "roles": ["MAN"]},
        ]
        usuario_objs = {}

        for udata in usuarios_data:
            user, created = User.objects.get_or_create(username=udata["username"])
            if created:
                user.set_password(udata["password"])
                user.save()
            usuario_obj, _ = Usuario.objects.get_or_create(user=user)
            usuario_objs[udata["username"]] = usuario_obj

            # Asignar roles
            for r in udata["roles"]:
                UsuarioRol.objects.get_or_create(usuario=usuario_obj, rol=rol_objs[r])

        # ---------------- Condominios ----------------
        condominios_data = [
            {"nombre": "Condominio Sol", "direccion": "Av. Principal 123"},
            {"nombre": "Condominio Luna", "direccion": "Calle Secundaria 456"},
        ]
        condominio_objs = {}
        for cdata in condominios_data:
            cobj, _ = Condominio.objects.get_or_create(nombre=cdata["nombre"], direccion=cdata["direccion"])
            condominio_objs[cdata["nombre"]] = cobj

        # ---------------- Viviendas ----------------
        viviendas_data = [
            {"condominio": "Condominio Sol", "codigo_unidad": "S101", "bloque": "A", "numero": "101"},
            {"condominio": "Condominio Sol", "codigo_unidad": "S102", "bloque": "A", "numero": "102"},
            {"condominio": "Condominio Luna", "codigo_unidad": "L201", "bloque": "B", "numero": "201"},
        ]
        vivienda_objs = {}
        for vdata in viviendas_data:
            vobj, _ = Vivienda.objects.get_or_create(
                condominio=condominio_objs[vdata["condominio"]],
                codigo_unidad=vdata["codigo_unidad"],
                bloque=vdata["bloque"],
                numero=vdata["numero"]
            )
            vivienda_objs[vdata["codigo_unidad"]] = vobj

        # ---------------- Residentes ----------------
        residentes_data = [
            {"ci": "12345678", "nombres": "Juan", "apellidos": "Perez", "usuario": "residente1", "vivienda": "S101"},
            {"ci": "87654321", "nombres": "Maria", "apellidos": "Lopez", "usuario": None, "vivienda": "S102"},
        ]
        for rdata in residentes_data:
            residente_obj, _ = Residente.objects.get_or_create(
                ci=rdata["ci"],
                defaults={
                    "nombres": rdata["nombres"],
                    "apellidos": rdata["apellidos"],
                    "usuario": usuario_objs.get(rdata["usuario"]) if rdata["usuario"] else None
                }
            )
            # Relacion residente-vivienda
            ResidenteVivienda.objects.get_or_create(
                residente=residente_obj,
                vivienda=vivienda_objs[rdata["vivienda"]],
                fecha_desde=date.today()
            )

        self.stdout.write(self.style.SUCCESS("✅ Seed ejecutado correctamente"))

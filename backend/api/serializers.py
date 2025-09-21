from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import (
    Rol,
    Usuario,
    UsuarioRol,
    Vivienda,
    Residente,
    Vehiculo,
    Aviso,
    Condominio,
    ResidenteVivienda,
    NotificacionUsuario,
)

# --- Rol ---
class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ["id", "nombre"]

# --- Usuario ---
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Usuario, UsuarioRol, Rol, Residente

class UsuarioSerializer(serializers.ModelSerializer):
    # ---- ENTRADA (write-only) ----
    username = serializers.CharField(write_only=True, required=True)
    password = serializers.CharField(write_only=True, required=True)
    email_in = serializers.EmailField(write_only=True, required=False)  # <- renombrado
    rol_id = serializers.PrimaryKeyRelatedField(
        queryset=Rol.objects.all(), source="rol", write_only=True
    )
    residente_id = serializers.PrimaryKeyRelatedField(
        queryset=Residente.objects.filter(usuario__isnull=True),
        source="residente",
        write_only=True,
        required=False
    )

    # ---- SALIDA (read-only) ----
    roles = serializers.SerializerMethodField(read_only=True)
    residente = serializers.SerializerMethodField(read_only=True)
    email = serializers.SerializerMethodField(read_only=True)
    username_out = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "estado",
            "created_at", "updated_at",

            # entrada
            "username", "password", "email_in", "rol_id", "residente_id",

            # salida
            "username_out", "email", "roles", "residente",
        ]

    # ---------- CREATE ----------
    def create(self, validated_data):
        rol = validated_data.pop("rol")
        residente = validated_data.pop("residente", None)
        username = validated_data.pop("username")
        password = validated_data.pop("password")
        email = validated_data.pop("email_in", None)

        if residente:
            email = residente.correo
        if not email:
            raise serializers.ValidationError({"email": "Debe ingresar un correo válido"})

        user = User.objects.create_user(username=username, password=password, email=email)
        usuario = Usuario.objects.create(user=user, **validated_data)
        UsuarioRol.objects.create(usuario=usuario, rol=rol, estado=1)

        if residente:
            residente.usuario = usuario
            residente.save()

        return usuario

    # ---------- UPDATE ----------
    def update(self, instance, validated_data):
        rol = validated_data.pop("rol", None)
        residente = validated_data.pop("residente", None)
        username = validated_data.pop("username", None)
        password = validated_data.pop("password", None)
        email = validated_data.pop("email_in", None)

        user = instance.user
        if username:
            user.username = username
        if password:
            user.set_password(password)
        if residente:
            email = residente.correo
        if email:
            user.email = email
        user.save()

        usuario = super().update(instance, validated_data)

        if rol:
            UsuarioRol.objects.update_or_create(
                usuario=usuario,
                defaults={"rol": rol, "estado": 1}
            )
        if residente:
            residente.usuario = usuario
            residente.save()
        return usuario

    # ---------- CAMPOS EXTRA ----------
    def get_roles(self, obj):
        return list(
            UsuarioRol.objects.filter(usuario=obj).values_list("rol__nombre", flat=True)
        )

    def get_residente(self, obj):
        if hasattr(obj, "residente") and obj.residente:
            return {
                "id": obj.residente.id,
                "nombres": obj.residente.nombres,
                "apellidos": obj.residente.apellidos,
                "ci": obj.residente.ci,
            }
        return None

    def get_email(self, obj):
        return obj.user.email if getattr(obj, "user", None) else None

    def get_username_out(self, obj):
        return obj.user.username if getattr(obj, "user", None) else None



# --- Vivienda ---
class ViviendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vivienda
        fields = ["id", "condominio", "codigo_unidad", "bloque", "numero", "estado"]

# --- Residente ---

class ResidenteSerializer(serializers.ModelSerializer):
    vivienda_id = serializers.PrimaryKeyRelatedField(
        queryset=Vivienda.objects.all(), source="vivienda", write_only=True, required=False
    )
    vivienda = serializers.SerializerMethodField()

    class Meta:
        model = Residente
        fields = [
            "id", "ci", "nombres", "apellidos",
            "telefono", "correo",
            "estado",
            "vivienda_id", "vivienda"
        ]

    def create(self, validated_data):
        vivienda = validated_data.pop("vivienda", None)
        residente = Residente.objects.create(**validated_data)

        if vivienda:
            ResidenteVivienda.objects.create(
                residente=residente, vivienda=vivienda, fecha_desde=timezone.now().date()
            )
        return residente

    def update(self, instance, validated_data):
        vivienda = validated_data.pop("vivienda", None)
        residente = super().update(instance, validated_data)

        if vivienda:
            ultima_relacion = ResidenteVivienda.objects.filter(
                residente=residente, fecha_hasta__isnull=True
            ).first()

            # 👇 Solo crear si la vivienda es distinta
            if not ultima_relacion or ultima_relacion.vivienda != vivienda:
                if ultima_relacion:
                    ultima_relacion.fecha_hasta = timezone.now().date()
                    ultima_relacion.save()

                ResidenteVivienda.objects.create(
                    residente=residente, vivienda=vivienda, fecha_desde=timezone.now().date()
                )

        return residente

    def get_vivienda(self, obj):
        rv = ResidenteVivienda.objects.filter(
            residente=obj, fecha_hasta__isnull=True
        ).first()
        if rv:
            return {
                "id": rv.vivienda.id,
                "codigo_unidad": rv.vivienda.codigo_unidad,
                "bloque": rv.vivienda.bloque,
                "numero": rv.vivienda.numero,
            }
        return None

# --- Vehiculo ---
class VehiculoSerializer(serializers.ModelSerializer):
    residente = ResidenteSerializer(read_only=True)
    residente_id = serializers.PrimaryKeyRelatedField(
        queryset=Residente.objects.all(), source="residente", write_only=True
    )

    class Meta:
        model = Vehiculo
        fields = ["id", "placa", "marca", "modelo", "color", "estado", "residente", "residente_id"]


# --- Aviso ---
class AvisoSerializer(serializers.ModelSerializer):
    autor_usuario = UsuarioSerializer(read_only=True)

    class Meta:
        model = Aviso
        fields = ["id", "titulo", "contenido", "fecha_publicacion", "estado", "visibilidad", "adjunto_url", "autor_usuario"]


class AvisoUsuarioSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="aviso.id", read_only=True)
    titulo = serializers.CharField(source="aviso.titulo", read_only=True)
    contenido = serializers.CharField(source="aviso.contenido", read_only=True)
    fecha_publicacion = serializers.DateTimeField(source="aviso.fecha_publicacion", read_only=True)
    adjunto_url = serializers.CharField(source="aviso.adjunto_url", read_only=True)
    autor = serializers.SerializerMethodField()
    leido = serializers.SerializerMethodField()

    class Meta:
        model = NotificacionUsuario
        fields = [
            "id",
            "titulo",
            "contenido",
            "fecha_publicacion",
            "adjunto_url",
            "fecha_envio",
            "fecha_lectura",
            "autor",
            "leido",
        ]

    def get_autor(self, obj):
        aviso = getattr(obj, "aviso", None)
        autor_usuario = getattr(aviso, "autor_usuario", None)
        if autor_usuario and getattr(autor_usuario, "user", None):
            full_name = autor_usuario.user.get_full_name().strip()
            if full_name:
                return full_name
            return autor_usuario.user.username
        return None

    def get_leido(self, obj):
        return obj.fecha_lectura is not None

# --- Condominio ---
class CondominioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Condominio
        fields = ["id", "nombre", "direccion"]

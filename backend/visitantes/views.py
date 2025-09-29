from rest_framework import viewsets, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters

from .models import Visitante, HistorialVisita
from .serializers import VisitanteSerializer, HistorialVisitaSerializer
from api.models import Usuario


class HistorialVisitaViewSet(viewsets.ModelViewSet):
    serializer_class = HistorialVisitaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]

    class HistorialVisitaFilter(filters.FilterSet):
        fecha_registro = filters.DateFilter(field_name='fecha_registro', lookup_expr='gte')
        visitante = filters.CharFilter(field_name='visitante__ci', lookup_expr='exact')

        class Meta:
            model = HistorialVisita
            fields = ['estado', 'residente']

    filterset_class = HistorialVisitaFilter

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return HistorialVisita.objects.all().order_by('-fecha_registro')
        try:
            usuario = Usuario.objects.get(user=user)
            return HistorialVisita.objects.filter(residente=usuario).order_by('-fecha_registro')
        except Usuario.DoesNotExist:
            return HistorialVisita.objects.none()

    def perform_create(self, serializer):
        data = self.request.data
        ci = data.get("ci")
        nombre = data.get("nombre")
        motivo = data.get("motivo", "")

        # Validación obligatoria
        if not ci or not nombre:
            raise serializers.ValidationError({"detail": "El CI y el nombre son obligatorios."})

        visitante, created = Visitante.objects.get_or_create(
            ci=ci,
            defaults={"nombre": nombre}
        )

        # Asegurarse de asignar residente
        if isinstance(self.request.user, Usuario):
            residente = self.request.user
        else:
            residente = Usuario.objects.get(user=self.request.user)

        serializer.save(visitante=visitante, residente=residente, motivo=motivo)

    # Acciones para cambiar estado
    @action(detail=True, methods=['post'])
    def autorizar(self, request, pk=None):
        visita = self.get_object()
        visita.estado = 'autorizado'
        visita.autorizado = True
        visita.save()
        return Response({'status': 'Visitante autorizado'})

    @action(detail=True, methods=['post'])
    def denegar(self, request, pk=None):
        visita = self.get_object()
        visita.estado = 'denegado'
        visita.autorizado = False
        visita.save()
        return Response({'status': 'Visitante denegado'})

    @action(detail=True, methods=['post'])
    def ingreso(self, request, pk=None):
        visita = self.get_object()
        visita.estado = 'ingresado'
        visita.fecha_ingreso = now()
        if 'foto_ingreso' in request.FILES:
            visita.foto_ingreso = request.FILES['foto_ingreso']
        visita.save()
        return Response({'status': 'Ingreso registrado'})

    @action(detail=True, methods=['post'])
    def egreso(self, request, pk=None):
        visita = self.get_object()
        visita.estado = 'salida'
        visita.fecha_salida = now()
        if 'foto_salida' in request.FILES:
            visita.foto_salida = request.FILES['foto_salida']
        visita.save()
        return Response({'status': 'Egreso registrado'})

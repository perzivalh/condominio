from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.pagination import PageNumberPagination
from .models import AreaComun, Reserva
from .serializers import AreaComunSerializer, ReservaSerializer
from api.models import Factura, Pago, Usuario, ResidenteVivienda, Residente

# 🔹 Áreas comunes
class AreaComunViewSet(viewsets.ModelViewSet):
    queryset = AreaComun.objects.all()
    serializer_class = AreaComunSerializer
    permission_classes = [permissions.AllowAny]

# 🔹 Paginación para reservas
class ReservaPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50

# 🔹 Función para generar factura
def generar_factura_reserva(reserva):
    if reserva.factura or not reserva.area_comun.costo:
        return None

    # 1. Buscar el Residente vinculado al usuario de la reserva
    residente = Residente.objects.filter(usuario=reserva.usuario).first()

    # 2. Buscar la relación ResidenteVivienda
    residente_vivienda = None
    if residente:
        residente_vivienda = ResidenteVivienda.objects.filter(residente=residente).first()

    # 3. Crear la factura (solo si hay relación con vivienda)
    factura = Factura.objects.create(
        vivienda=residente_vivienda.vivienda if residente_vivienda else None,
        periodo=str(reserva.fecha)[:7],  # yyyy-mm
        monto=reserva.area_comun.costo,
        tipo="reserva",
        estado="PENDIENTE"
    )

    # 4. Asociar la factura a la reserva
    reserva.factura = factura
    reserva.save(update_fields=["factura"])

    return factura

# 🔹 ViewSet de reservas corregido
class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all()
    serializer_class = ReservaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    pagination_class = ReservaPagination
    filterset_fields = ["fecha", "estado", "area_comun"]

    def perform_create(self, serializer):
        # Obtener el objeto Usuario relacionado con request.user
        try:
            usuario_obj = Usuario.objects.get(user=self.request.user)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("El usuario no tiene un perfil Usuario asociado")
        serializer.save(usuario=usuario_obj)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cambiar_estado(self, request, pk=None):
        reserva = self.get_object()
        nuevo_estado = request.data.get('estado')
        if nuevo_estado not in ['aprobada', 'rechazada']:
            return Response({"error": "Estado inválido"}, status=status.HTTP_400_BAD_REQUEST)
        reserva.estado = nuevo_estado
        reserva.save()
        if nuevo_estado == 'aprobada':
            factura = generar_factura_reserva(reserva)
            if factura:
                return Response({"mensaje": "Reserva aprobada y factura generada", "factura_id": str(factura.id)})
        return Response({"mensaje": f"Reserva {nuevo_estado}"})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def registrar_pago(self, request, pk=None):
        reserva = self.get_object()
        if not reserva.factura:
            return Response({"error": "La reserva no tiene factura asociada"}, status=status.HTTP_400_BAD_REQUEST)

        monto = request.data.get('monto')
        metodo = request.data.get('metodo')
        referencia = request.data.get('referencia_externa', '')

        if not monto or not metodo:
            return Response({"error": "Faltan datos de pago"}, status=status.HTTP_400_BAD_REQUEST)

        pago = Pago.objects.create(
            factura=reserva.factura,
            metodo=metodo,
            monto_pagado=monto,
            referencia_externa=referencia,
            registrado_por=Usuario.objects.get(user=request.user)
        )

        if pago.monto_pagado >= reserva.factura.monto:
            reserva.estado = 'pagada'
            reserva.factura.estado = 'PAGADO'
            reserva.factura.fecha_pago = pago.fecha_pago
            reserva.factura.save()
            reserva.save()

        return Response({"mensaje": "Pago registrado", "pago_id": str(pago.id), "estado_reserva": reserva.estado})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def reporte_uso(self, request):
        area_id = request.query_params.get('area_id')
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        reservas = Reserva.objects.all()
        if area_id:
            reservas = reservas.filter(area_comun_id=area_id)
        if fecha_inicio and fecha_fin:
            reservas = reservas.filter(fecha__gte=fecha_inicio, fecha__lte=fecha_fin)

        serializer = ReservaSerializer(reservas, many=True)
        return Response(serializer.data)

    # 🔹 Mis reservas
    @action(detail=False, methods=['get'], url_path='mis_reservas')
    def mis_reservas(self, request):
        try:
            usuario_obj = Usuario.objects.get(user=request.user)
        except Usuario.DoesNotExist:
            return Response({"error": "El usuario no tiene un perfil Usuario asociado"}, status=status.HTTP_400_BAD_REQUEST)

        reservas = Reserva.objects.filter(usuario=usuario_obj).order_by('-fecha', '-hora_inicio')
        serializer = self.get_serializer(reservas, many=True)
        return Response(serializer.data)

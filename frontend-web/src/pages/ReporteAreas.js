// src/pages/ReporteAreas.js
import React, { useState, useEffect, useMemo, useCallback } from "react";
import API from "../api/axiosConfig";
import "./ReporteAreas.css";

import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const useReporteData = (fechaInicio, fechaFin) => {
  const [areas, setAreas] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("access_token");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;

      const [areasRes, reportesRes] = await Promise.all([
        API.get("areas/", { headers }),
        API.get("reservas/reporte_uso/", { headers, params }),
      ]);

      setAreas(areasRes.data);
      setReportes(reportesRes.data);
    } catch (err) {
      console.error("Error al cargar los datos:", err);
      setError("No se pudieron cargar los datos del reporte.");
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dashboardData = useMemo(() => {
    const totalReservas = reportes.length;
    const aprobadas = reportes.filter((r) => r.estado === "aprobada").length;
    const pendientes = reportes.filter((r) => r.estado === "pendiente").length;
    const rechazadas = reportes.filter((r) => r.estado === "rechazada").length;

    const reservasPorArea = areas.map((area) => ({
      nombre: area.nombre,
      total: reportes.filter((r) => r.area_comun?.id === area.id).length,
    }));

    const barData = {
      labels: reservasPorArea.map((a) => a.nombre),
      datasets: [
        {
          label: "Reservas por Área",
          data: reservasPorArea.map((a) => a.total),
          backgroundColor: "rgba(144,202,249,0.6)",
          borderColor: "rgba(144,202,249,1)",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };

    const pieData = {
      labels: ["Aprobadas", "Pendientes", "Rechazadas"],
      datasets: [
        {
          data: [aprobadas, pendientes, rechazadas],
          backgroundColor: ["#a5d6a7", "#bdbdbd", "#ef9a9a"],
          borderWidth: 1,
        },
      ],
    };

    return { totalReservas, aprobadas, pendientes, rechazadas, barData, pieData };
  }, [reportes, areas]);

  return { areas, reportes, loading, error, dashboardData, fetchData };
};

const ReporteAreas = () => {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [filtros, setFiltros] = useState({ estado: "", area: "" });

  const { areas, reportes, loading, error, dashboardData, fetchData } =
    useReporteData(fechaInicio, fechaFin);

  const { totalReservas, aprobadas, pendientes, rechazadas, barData, pieData } =
    dashboardData;

  const handleGenerateReport = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const handleClearFilters = () => {
    setFiltros({ estado: "", area: "" });
    setFechaInicio("");
    setFechaFin("");
  };

  const filteredReportes = useMemo(() => {
    return reportes
      .filter((r) => !filtros.estado || r.estado === filtros.estado)
      .filter((r) => !filtros.area || r.area_comun?.nombre === filtros.area);
  }, [reportes, filtros]);

  return (
    <div className="gestion-wrapper" id="reporte-container">
      <div className="gestion-card">
        <div className="gestion-card-header">
          <div>
            <h1 className="gestion-card-title">Reporte de Áreas Comunes</h1>
            <p className="gestion-card-subtitle">
              Consulta los registros de reservas por área.
            </p>
          </div>
        </div>

        <div className="filters-row">
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
          >
            <option value="">Todos los estados</option>
            <option value="aprobada">Aprobada</option>
            <option value="pendiente">Pendiente</option>
            <option value="rechazada">Rechazada</option>
          </select>
          <select
            value={filtros.area}
            onChange={(e) => setFiltros({ ...filtros, area: e.target.value })}
          >
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.nombre}>
                {a.nombre}
              </option>
            ))}
          </select>
          <button className="btn primary" onClick={handleGenerateReport}>
            Generar
          </button>
          <button className="btn secondary" onClick={handleClearFilters}>
            Limpiar filtros
          </button>
        </div>

        {loading && <div className="loading">Cargando datos... ⏳</div>}
        {error && <div className="error">❌ {error}</div>}

        {!loading && !error && (
          <>
            <div className="metrics-row">
              <div className="metric-card total">Total: {totalReservas}</div>
              <div className="metric-card aprobadas">Aprobadas: {aprobadas}</div>
              <div className="metric-card pendientes">Pendientes: {pendientes}</div>
              <div className="metric-card rechazadas">Rechazadas: {rechazadas}</div>
            </div>

            <div className="table-card">
              <table className="gestion-table">
                <thead>
                  <tr>
                    <th>Área</th>
                    <th>Residente</th>
                    <th>Fecha</th>
                    <th>Hora Inicio</th>
                    <th>Hora Fin</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReportes.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center" }}>
                        No hay registros
                      </td>
                    </tr>
                  ) : (
                    filteredReportes.map((r) => (
                      <tr key={r.id}>
                        <td>{r.area_comun?.nombre}</td>
                        <td>{r.usuario?.username}</td>
                        <td>{r.fecha}</td>
                        <td>{r.hora_inicio}</td>
                        <td>{r.hora_fin}</td>
                        <td className={`estado-badge estado-${r.estado}`}>{r.estado}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="charts-row">
              <div className="chart-card" id="chart-bar">
                <h4>Reservas por Área</h4>
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    indexAxis: "y",
                    scales: {
                      x: { beginAtZero: true },
                      y: { ticks: { font: { size: 12 } } },
                    },
                  }}
                />
              </div>

              <div className="chart-card" id="chart-pie">
                <h4>Estado de Reservas</h4>
                <Doughnut
                  data={pieData}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: "bottom" } },
                    cutout: "40%",
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReporteAreas;

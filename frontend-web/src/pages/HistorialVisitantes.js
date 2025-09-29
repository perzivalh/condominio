import React, { useState, useEffect, useCallback } from "react";
import API from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./GestionCrud.css";

const HistorialVisitantes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const token = localStorage.getItem("access");

  const loadHistorial = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await API.get("historial-visitas/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataArray = Array.isArray(res.data.results)
        ? res.data.results
        : res.data;
      setHistorial(dataArray);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el historial de visitas.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  
  const filteredHistorial = historial.filter(
    (h) =>
      h.visitante?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      h.residente?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredHistorial.length / itemsPerPage);
  const paginatedHistorial = filteredHistorial.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  
  const calcularTiempoEstancia = (ingreso, salida) => {
    if (!ingreso || !salida) return "-";
    const start = new Date(ingreso);
    const end = new Date(salida);
    if (isNaN(start) || isNaN(end)) return "-";

    const diff = Math.abs(end - start) / 1000; // segundos
    const horas = Math.floor(diff / 3600);
    const minutos = Math.floor((diff % 3600) / 60);
    const segundos = Math.floor(diff % 60);

    return `${horas}h ${minutos}m ${segundos}s`;
  };

  return (
    <div className="gestion-wrapper">
      <div className="gestion-card">
        <div className="gestion-card-header">
          <h1 className="gestion-card-title">Historial de Visitantes</h1>
          <p className="gestion-card-subtitle">
            Aquí puedes ver todos los registros de visitantes.
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "10px",
            }}
          >
            <input
              type="text"
              placeholder="Buscar por visitante o residente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            <button
              className="gbutton gbutton--primary"
              onClick={() => navigate(-1)}
            >
              Volver
            </button>
          </div>
        </div>

        {error && <div className="gestion-error">{error}</div>}

        <div className="gestion-table-container">
          {loading ? (
            <div className="gestion-empty">Cargando historial...</div>
          ) : filteredHistorial.length === 0 ? (
            <div className="gestion-empty">No hay registros</div>
          ) : (
            <>
              <table className="gestion-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Fecha / Hora</th>
                    <th>Visitante</th>
                    <th>Residente</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistorial.map((h) => (
                    <React.Fragment key={h.id}>
                      <tr
                        className="row-main"
                        onClick={() =>
                          setExpandedRow(expandedRow === h.id ? null : h.id)
                        }
                      >
                        <td>
                          <span
                            className={`expand-icon ${
                              expandedRow === h.id ? "expanded" : ""
                            }`}
                          >
                            ▶
                          </span>
                        </td>
                        <td>{h.fecha_registro || "-"}</td>
                        <td>{h.visitante?.nombre || "-"}</td>
                        <td>{h.residente || "-"}</td>
                        <td>{h.estado}</td>
                      </tr>

                      {expandedRow === h.id && (
                        <tr className="row-details">
                          <td colSpan="5">
                            <div className="details-container">
                              {/* 📌 Detalle de la visita */}
                              <div className="details-section">
                                <h4 className="details-title">
                                  Detalle de la Visita
                                </h4>
                                <p>
                                  <strong>Motivo:</strong> {h.motivo || "-"}
                                </p>
                                <p>
                                  <strong>Tiempo de estancia:</strong>{" "}
                                  {calcularTiempoEstancia(
                                    h.fecha_ingreso_iso,
                                    h.fecha_salida_iso
                                  )}
                                </p>
                                <p>
                                  <strong>Notas:</strong> {h.notas || "-"}
                                </p>
                                {h.foto_ingreso && (
                                  <img
                                    src={h.foto_ingreso}
                                    alt="Ingreso"
                                    className="detail-image"
                                  />
                                )}
                                {h.foto_salida && (
                                  <img
                                    src={h.foto_salida}
                                    alt="Salida"
                                    className="detail-image"
                                  />
                                )}
                              </div>

                              {/* 👤 Información del visitante */}
                              <div className="details-section">
                                <h4 className="details-title">
                                  Información del Visitante
                                </h4>
                                <p>
                                  <strong>Nombre:</strong>{" "}
                                  {h.visitante?.nombre || "-"}
                                </p>
                                <p>
                                  <strong>CI:</strong> {h.visitante?.ci || "-"}
                                </p>
                                {h.vehiculo && (
                                  <p>
                                    <strong>Vehículo:</strong> {h.vehiculo}
                                  </p>
                                )}
                                {h.placa && (
                                  <p>
                                    <strong>Placa:</strong> {h.placa}
                                  </p>
                                )}
                              </div>

                              {/* 🏠 Información del residente */}
                              <div className="details-section">
                                <h4 className="details-title">
                                  Información del Residente
                                </h4>
                                <p>
                                  <strong>Nombre:</strong> {h.residente || "-"}
                                </p>
                                {h.residente_info?.apartamento && (
                                  <p>
                                    <strong>Vivienda:</strong>{" "}
                                    {h.residente_info.apartamento}
                                  </p>
                                )}
                                {h.residente_info?.telefono && (
                                  <p>
                                    <strong>Teléfono:</strong>{" "}
                                    {h.residente_info.telefono}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* 📌 Paginación */}
              <div className="pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Anterior
                </button>
                <span>
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistorialVisitantes;

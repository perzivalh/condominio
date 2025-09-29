// src/pages/Visitantes.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import Webcam from "react-webcam";
import "./GestionCrud.css";

const Visitantes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = Array.isArray(user?.roles) && user.roles.includes("ADM");

  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroFecha, setFiltroFecha] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [mensaje, setMensaje] = useState(null);
  const [capturaData, setCapturaData] = useState(null);
  const webcamRef = useRef(null);

  const token = localStorage.getItem("access");

  const loadHistorial = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);
    setError("");
    try {
      let url = `historial-visitas/?page=${pagina}`;
      if (filtroEstado) url += `&estado=${filtroEstado}`;
      if (filtroFecha) url += `&fecha_registro__gte=${filtroFecha}`;

      const res = await API.get(url, { headers });
      const dataArray = Array.isArray(res.data.results)
        ? res.data.results
        : res.data || [];
      setHistorial(dataArray);

      const total = res.data.count || dataArray.length || 1;
      setTotalPaginas(Math.ceil(total / 5));
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el historial de visitas.");
    } finally {
      setLoading(false);
    }
  }, [pagina, filtroEstado, filtroFecha, token]);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  const mostrarMensaje = (msg, tipo = "success") => {
    setMensaje({ msg, tipo });
    setTimeout(() => setMensaje(null), 3000);
  };

  const handleFiltroChange = (estado) => {
    setFiltroEstado(estado);
    setPagina(1);
  };

  const handleFechaChange = (e) => {
    setFiltroFecha(e.target.value);
    setPagina(1);
  };

  const handleAccion = async (id, accion) => {
    if (!canManage) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await API.post(`historial-visitas/${id}/${accion}/`, {}, { headers });
      mostrarMensaje(`Visitante ${accion} con éxito`);
      loadHistorial();
    } catch (err) {
      console.error(err);
      mostrarMensaje("Error al realizar la acción", "error");
    }
  };

  const iniciarCaptura = (id, tipo, historial) => {
    setCapturaData({ id, tipo, historial });
  };

  const tomarFoto = async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    const blob = await (await fetch(imageSrc)).blob();
    const formData = new FormData();
    const fotoKey =
      capturaData.tipo === "ingreso" ? "foto_ingreso" : "foto_salida";
    formData.append(fotoKey, blob, "foto.jpg");

    try {
      await API.post(
        `historial-visitas/${capturaData.id}/${capturaData.tipo}/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      mostrarMensaje(`${capturaData.tipo} registrado con éxito`);
      setCapturaData(null);
      loadHistorial();
    } catch (err) {
      console.error(err);
      mostrarMensaje("Error al subir foto", "error");
    }
  };

  const getEstadoClass = (estado) => {
    switch (estado) {
      case "pendiente":
        return "status-badge status-badge-pending";
      case "autorizado":
        return "status-badge status-badge-authorized";
      case "ingresado":
        return "status-badge status-badge-entered";
      case "salida":
        return "status-badge status-badge-exited";
      case "denegado":
        return "status-badge status-badge-denied";
      default:
        return "";
    }
  };

  return (
    <div className="gestion-wrapper">
      <div className="gestion-card">
        <div className="gestion-card-header">
          <h1 className="gestion-card-title">Acceso de las visitas</h1>
          <p className="gestion-card-subtitle">
            Administra el ingreso y salida de visitantes.
          </p>

          <button
            className="gbutton gbutton--primary"
            onClick={() =>
              navigate("/dashboard/visitas-accesos/historial-visitantes")
            }
            style={{ marginBottom: "12px" }}
          >
            Ir al Historial de Visitas
          </button>

          <div className="gestion-filter-buttons">
            <input
              type="date"
              className="gbutton gbutton--ghost"
              value={filtroFecha}
              onChange={handleFechaChange}
            />
            <button
              className={`gbutton ${
                !filtroEstado ? "gbutton--primary" : "gbutton--ghost"
              }`}
              onClick={() => handleFiltroChange("")}
            >
              Todos
            </button>
            <button
              className={`gbutton ${
                filtroEstado === "pendiente" ? "gbutton--primary" : "gbutton--ghost"
              }`}
              onClick={() => handleFiltroChange("pendiente")}
            >
              Pendientes
            </button>
            <button
              className={`gbutton ${
                filtroEstado === "autorizado" ? "gbutton--primary" : "gbutton--ghost"
              }`}
              onClick={() => handleFiltroChange("autorizado")}
            >
              Autorizados
            </button>
            <button
              className={`gbutton ${
                filtroEstado === "ingresado" ? "gbutton--primary" : "gbutton--ghost"
              }`}
              onClick={() => handleFiltroChange("ingresado")}
            >
              Ingresados
            </button>
          </div>
        </div>

        {mensaje && (
          <div
            className={`gestion-message ${
              mensaje.tipo === "error" ? "error" : "success"
            }`}
          >
            {mensaje.msg}
          </div>
        )}

        {error && <div className="gestion-error">{error}</div>}

        <div className="gestion-table-container">
          {loading ? (
            <div className="gestion-empty">Cargando historial...</div>
          ) : historial.length === 0 ? (
            <div className="gestion-empty">No hay visitas para mostrar.</div>
          ) : (
            <table className="gestion-table">
              <thead>
                <tr>
                  <th>Visitante</th>
                  <th>CI</th>
                  <th>Residente</th>
                  <th>Estado</th>
                  <th>Registro</th>
                  <th>Ingreso</th>
                  <th>Salida</th>
                  {canManage && <th className="gestion-col-actions">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id}>
                    <td>{h.visitante?.nombre}</td>
                    <td>{h.visitante?.ci}</td>
                    <td>{h.residente}</td>
                    <td>
                      <span className={getEstadoClass(h.estado)}>{h.estado}</span>
                    </td>
                    <td>{h.fecha_registro}</td>
                    <td>{h.fecha_ingreso || "-"}</td>
                    <td>{h.fecha_salida || "-"}</td>
                    {canManage && (
                      <td>
                        <div className="gestion-row-actions">
                          {h.estado === "pendiente" && (
                            <>
                              <button
                                className="gbutton gbutton--primary"
                                onClick={() => handleAccion(h.id, "autorizar")}
                              >
                                <i className="fas fa-check"></i> Autorizar
                              </button>
                              <button
                                className="gbutton gbutton--danger"
                                onClick={() => handleAccion(h.id, "denegar")}
                              >
                                <i className="fas fa-times"></i> Denegar
                              </button>
                            </>
                          )}
                          {h.estado === "autorizado" && (
                            <button
                              className="gbutton gbutton--primary"
                              onClick={() => iniciarCaptura(h.id, "ingreso", h)}
                            >
                              <i className="fas fa-arrow-right"></i> Ingreso
                            </button>
                          )}
                          {h.estado === "ingresado" && (
                            <button
                              className="gbutton gbutton--primary"
                              onClick={() => iniciarCaptura(h.id, "egreso", h)}
                            >
                              <i className="fas fa-arrow-left"></i> Salida
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="gestion-pagination">
          <button
            className="gbutton gbutton--ghost"
            disabled={pagina === 1}
            onClick={() => setPagina(pagina - 1)}
          >
            Anterior
          </button>
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <button
            className="gbutton gbutton--ghost"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina(pagina + 1)}
          >
            Siguiente
          </button>
        </div>

        {capturaData && (
          <div className="gestion-modal-overlay">
            <div className="gestion-modal-content">
              <h3>
                Registro de {capturaData.tipo === "ingreso" ? "Ingreso" : "Salida"}
              </h3>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await tomarFoto();
                }}
              >
                <div className="gestion-form-info">
                  <p>
                    <strong>Nombre:</strong> {capturaData.historial?.visitante?.nombre}
                  </p>
                  <p>
                    <strong>CI:</strong> {capturaData.historial?.visitante?.ci}
                  </p>
                </div>

                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width={480}
                  height={360}
                  className="gestion-webcam"
                />

                <div className="gestion-form-actions">
                  <button
                    type="submit"
                    className="gbutton gbutton--primary"
                    style={{ marginRight: "10px" }}
                  >
                    <i className="fas fa-camera"></i> Tomar Foto
                  </button>
                  <button
                    type="button"
                    className="gbutton gbutton--ghost"
                    onClick={() => setCapturaData(null)}
                  >
                    <i className="fas fa-times"></i> Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Visitantes;

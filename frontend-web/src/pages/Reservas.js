import React, { useState, useEffect, useCallback, useMemo } from "react";
import API from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import "./GestionCrud.css";
import { useParams } from "react-router-dom";

function Reservas() {
  const { areaId } = useParams(); 
  const { user } = useAuth();
  const canManage = Array.isArray(user?.roles) && user.roles.includes("ADM");

  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const token = localStorage.getItem("access");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  
  const loadReservas = useCallback(async (page = pagina) => {
    setLoading(true);
    setError("");
    try {
      let url = `reservas/?area=${areaId}&page=${page}`;
      if (filtroFecha) url += `&fecha=${filtroFecha}`;
      if (filtroEstado) url += `&estado=${filtroEstado}`;

      const res = await API.get(url, { headers });
      setReservas(res.data.results);
      setTotalPaginas(Math.ceil(res.data.count / 5)); 
      setPagina(page);
    } catch (err) {
      console.error("Error al cargar reservas", err);
      setError("No se pudieron cargar las reservas. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [areaId, filtroFecha, filtroEstado, pagina]);

  useEffect(() => {
    loadReservas();
  }, [loadReservas]);

  const handleCambioEstado = async (id, estado) => {
    if (!canManage) return;
    try {
      const res = await API.post(`reservas/${id}/cambiar_estado/`, { estado }, { headers });
      alert(res.data.mensaje || "Estado actualizado correctamente");
      loadReservas();
    } catch (err) {
      console.error(err);
      alert("Error al actualizar estado");
    }
  };

  const handleEliminar = async (id) => {
    if (!canManage) return;
    if (!window.confirm("¿Seguro que deseas eliminar esta reserva?")) return;
    try {
      await API.delete(`reservas/${id}/`, { headers });
      alert("Reserva eliminada correctamente");
      loadReservas();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar reserva");
    }
  };

  const filteredReservas = useMemo(() => {
    return reservas.filter(r => {
      return (
        (!filtroFecha || r.fecha === filtroFecha) &&
        (!filtroEstado || r.estado === filtroEstado)
      );
    });
  }, [reservas, filtroFecha, filtroEstado]);

  return (
    <div className="gestion-wrapper">
      <div className="gestion-card">
        <div className="gestion-card-header">
          <div>
            <h1 className="gestion-card-title">Reservas del Área</h1>
            <p className="gestion-card-subtitle">
              Gestiona las reservas de esta área.
            </p>
          </div>
          <div className="gestion-header-actions">
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="gestion-search-input"
            />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="gestion-search-input"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="aprobada">Aprobada</option>
              <option value="rechazada">Rechazada</option>
            </select>
            {(filtroFecha || filtroEstado) && (
              <button
                className="gbutton gbutton--ghost"
                onClick={() => { setFiltroFecha(""); setFiltroEstado(""); }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {!canManage && (
          <div className="gestion-readonly-banner">
            El rol actual solo permite consultar las reservas.
          </div>
        )}

        {error && <div className="gestion-error">{error}</div>}

        <div className="gestion-table-container">
          {loading ? (
            <div className="gestion-empty">Cargando reservas...</div>
          ) : reservas.length === 0 ? (
            <div className="gestion-empty">No hay reservas registradas.</div>
          ) : filteredReservas.length === 0 ? (
            <div className="gestion-empty">
              No se encontraron reservas para los filtros actuales.
            </div>
          ) : (
            <table className="gestion-table">
              <thead>
                <tr>
                  <th>Residente</th>
                  <th>Área</th>
                  <th>Fecha</th>
                  <th>Hora Inicio</th>
                  <th>Hora Fin</th>
                  <th>Estado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredReservas.map((r) => (
                  <tr key={r.id}>
                    <td>{r.usuario?.username || "Desconocido"}</td>
                    <td>{r.area_comun?.nombre} (ID: {r.area_comun?.id})</td>
                    <td>{r.fecha}</td>
                    <td>{r.hora_inicio}</td>
                    <td>{r.hora_fin}</td>
                    <td>{r.estado}</td>
                    {canManage && (
                      <td>
                        <div className="gestion-row-actions">
                          {r.estado === "pendiente" && (
                            <>
                              <button
                                className="gbutton gbutton--primary"
                                onClick={() => handleCambioEstado(r.id, "aprobada")}
                              >
                                Aprobar
                              </button>
                              <button
                                className="gbutton gbutton--danger"
                                onClick={() => handleCambioEstado(r.id, "rechazada")}
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                          <button
                            className="gbutton gbutton--danger"
                            onClick={() => handleEliminar(r.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        <div className="gestion-pagination">
          <button
            className="gbutton gbutton--ghost"
            disabled={pagina === 1}
            onClick={() => loadReservas(pagina - 1)}
          >
            Anterior
          </button>
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <button
            className="gbutton gbutton--ghost"
            disabled={pagina === totalPaginas}
            onClick={() => loadReservas(pagina + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

export default Reservas;
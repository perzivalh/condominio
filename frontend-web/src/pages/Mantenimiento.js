// src/pages/Mantenimiento.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import API from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import CrudModal from "../components/CrudModal";
import "./GestionCrud.css";

const initialForm = {
  titulo: "",
  descripcion: "",
  tipo: "preventivo",
  prioridad: "media",
  fecha_programada: "",
  costo: "",
  area_comun_id: "",
  responsable: "",
  estado: "pendiente",
  imagen: null, 
};

function Mantenimiento() {
  const { user } = useAuth();

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const canManage = roles.includes("ADM");
  const isResponsible = roles.includes("MAN");
  const isResidente = roles.includes("RES");

  const [mantenimientos, setMantenimientos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);

  const token = localStorage.getItem("access");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const loadMantenimientos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let url = "mantenimientos/";
      if (filtroArea) url += `?area=${filtroArea}`;
      if (filtroEstado) url += filtroArea ? `&estado=${filtroEstado}` : `?estado=${filtroEstado}`;

      const res = await API.get(url, { headers });
      const dataArray = Array.isArray(res.data.results) ? res.data.results : res.data;
      setMantenimientos(dataArray);
    } catch (err) {
      console.error(err);
      setError("Error al cargar los mantenimientos. Verifique los filtros.");
    } finally {
      setLoading(false);
    }
  }, [filtroArea, filtroEstado, headers]);

  const loadData = useCallback(async () => {
    await loadMantenimientos();
    try {
      const resAreas = await API.get("areas/", { headers });
      setAreas(resAreas.data);
    } catch (err) {
      console.error("Error cargando áreas:", err);
    }
    if (canManage || isResponsible) {
      try {
        const resPersonal = await API.get("responsables/", { headers });
        setPersonal(resPersonal.data.results || resPersonal.data);
      } catch (err) {
        console.error("Error cargando personal:", err);
      }
    }
  }, [loadMantenimientos, headers, canManage, isResponsible]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canOpenEditModal = useCallback(
    (item) => {
      if (canManage) return true;
      if (isResidente && item.residente?.id === user?.id && item.estado === "pendiente") return true;
      return false;
    },
    [canManage, isResidente, user?.id]
  );

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    setFormData(
      item
        ? {
            ...item,
            fecha_programada: item.fecha_programada ? item.fecha_programada.split("T")[0] : "",
            area_comun_id: item.area_comun?.id || "",
            responsable: item.responsable?.id || "",
            costo: item.costo || "",
            imagen: null,
          }
        : initialForm
    );
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingItem(null);
    setFormData(initialForm);
    setModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "imagen") {
      setFormData((prev) => ({ ...prev, [name]: files[0] || null }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let payload = {
      ...formData,
      costo: formData.costo ? parseFloat(formData.costo) : null,
      fecha_programada: formData.fecha_programada || null,
      area_comun_id: formData.area_comun_id || null,
      responsable: formData.responsable || null,
    };

    
    if (!formData.imagen) {
      delete payload.imagen;
    }

    try {
      if (editingItem) {
        await API.put(`mantenimientos/${editingItem.id}/`, payload, { headers });
      } else {
        await API.post("mantenimientos/", payload, { headers });
      }
      loadMantenimientos();
      handleCloseModal();
    } catch (err) {
      console.error("Error al guardar mantenimiento:", err.response?.data || err);
      alert(`Error al guardar mantenimiento: ${JSON.stringify(err.response?.data)}`);
    }
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    if (!window.confirm("¿Eliminar este mantenimiento?")) return;
    try {
      await API.delete(`mantenimientos/${id}/`, { headers });
      loadMantenimientos();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar mantenimiento.");
    }
  };

  
  const handleEstadoChange = async (id, nuevoEstado) => {
    try {
      await API.patch(`mantenimientos/${id}/`, { estado: nuevoEstado }, { headers });
      setMantenimientos((prev) =>
        prev.map((m) => (m.id === id ? { ...m, estado: nuevoEstado } : m))
      );
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      alert("No se pudo actualizar el estado.");
    }
  };

  const estadoColors = {
    pendiente: "#FFA500",
    en_proceso: "#1E90FF",
    finalizado: "#28A745",
    cancelado: "#DC3545",
  };

  return (
    <div className="gestion-wrapper">
      <div className="gestion-card">
        <div className="gestion-card-header">
          <h1 className="gestion-card-title">Mantenimientos</h1>
          <p className="gestion-card-subtitle">Gestiona los mantenimientos del condominio.</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
            <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} className="gestion-search-input">
              <option value="">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="gestion-search-input">
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="finalizado">Finalizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <button className="gbutton gbutton--primary" onClick={() => handleOpenModal()}>
              + Nuevo
            </button>
          </div>
        </div>

        {error && <div className="gestion-error">{error}</div>}

        <div className="gestion-table-container">
          {loading ? (
            <div className="gestion-empty">Cargando mantenimientos...</div>
          ) : mantenimientos.length === 0 ? (
            <div className="gestion-empty">No hay mantenimientos registrados.</div>
          ) : (
            <table className="gestion-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Prioridad</th>
                  <th>Fecha Solicitud</th>
                  <th>Fecha Programada</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mantenimientos.map((m) => (
                  <React.Fragment key={m.id}>
                    <tr
                      className="row-main"
                      onClick={() => setExpandedRow(expandedRow === m.id ? null : m.id)}
                    >
                      <td>
                        <span
                          className={`expand-icon ${expandedRow === m.id ? "expanded" : ""}`}
                        >
                          ▶
                        </span>
                      </td>
                      <td>{m.titulo}</td>
                      <td>{m.tipo}</td>
                      <td>{m.prioridad}</td>
                      <td>{m.fecha_solicitud ? m.fecha_solicitud.split("T")[0] : "-"}</td>
                      <td>{m.fecha_programada ? m.fecha_programada.split("T")[0] : "-"}</td>
                      <td>{m.responsable_name || "-"}</td>
                      <td>
                        {isResponsible ? (
                          <select
                            value={m.estado}
                            onChange={(e) => handleEstadoChange(m.id, e.target.value)}
                            className="gestion-select"
                            style={{
                              backgroundColor: estadoColors[m.estado],
                              color: "#fff",
                              fontWeight: "bold",
                              borderRadius: "4px",
                              padding: "2px 5px"
                            }}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_proceso">En proceso</option>
                            <option value="finalizado">Finalizado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        ) : (
                          <span
                            className="estado-badge"
                            style={{ backgroundColor: estadoColors[m.estado] }}
                          >
                            {m.estado.replace("_", " ")}
                          </span>
                        )}
                      </td>
                      <td>
                        {canOpenEditModal(m) && (
                          <button
                            className="gbutton gbutton--ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(m);
                            }}
                          >
                            Editar
                          </button>
                        )}
                        {canManage && (
                          <button
                            className="gbutton gbutton--danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(m.id);
                            }}
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>

                    {expandedRow === m.id && (
                      <tr className="row-details">
                        <td colSpan="9">
                          <div className="details-container">

                            {/* Contenedor de detalles del mantenimiento */}
                            <div className="mantenimiento-info" style={{ marginBottom: "15px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
                              <h4>Detalles del Mantenimiento</h4>
                              <p><strong>Descripción:</strong> {m.descripcion || "-"}</p>
                              <p><strong>Área:</strong> {m.area_comun?.nombre || "-"}</p>
                              <p><strong>Responsable:</strong> {m.responsable_name || "-"}</p>
                              <p><strong>Fecha programada:</strong> {m.fecha_programada ? m.fecha_programada.split("T")[0] : "-"}</p>
                              <p><strong>Costo:</strong> {m.costo ? `Bs. ${m.costo}` : "-"}</p>
                            </div>

                            {/* Contenedor de información del residente y vivienda */}
                            <div className="residente-info" style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
                              <h4>Información del Residente</h4>
                              {m.residente_data ? (
                                <>
                                  <p><strong>Residente:</strong> {m.residente_data.nombres} {m.residente_data.apellidos}</p>
                                  <p><strong>CI:</strong> {m.residente_data.ci}</p>
                                  <p><strong>Correo:</strong> {m.residente_data.correo || "-"}</p>
                                  <p><strong>Teléfono:</strong> {m.residente_data.telefono || "-"}</p>
                                  {m.residente_data.vivienda_actual ? (
                                    <p>
                                      <strong>Vivienda:</strong> {m.residente_data.vivienda_actual.codigo_unidad} - {m.residente_data.vivienda_actual.bloque || "-"} {m.residente_data.vivienda_actual.numero || ""}
                                    </p>
                                  ) : (
                                    <p><strong>Vivienda:</strong> -</p>
                                  )}
                                </>
                              ) : (
                                <p><strong>Residente:</strong> -</p>
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
          )}
        </div>
      </div>

      <CrudModal
        open={modalOpen}
        title={editingItem ? "Editar Mantenimiento" : "Nuevo Mantenimiento"}
        onClose={handleCloseModal}
      >
        <form onSubmit={handleSubmit} className="gestion-form">
          <label className="gestion-form-label">
            Título
            <input
              type="text"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              className="gestion-input"
              required
            />
          </label>

          <label className="gestion-form-label">
            Descripción
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              className="gestion-textarea"
            />
          </label>

          <label className="gestion-form-label">
            Área
            <select
              name="area_comun_id"
              value={formData.area_comun_id || ""}
              onChange={handleChange}
              className="gestion-select"
            >
              <option value="">Ninguna</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="gestion-form-label">
            Responsable
            <select
              name="responsable"
              value={formData.responsable || ""}
              onChange={handleChange}
              className="gestion-select"
            >
              <option value="">Ninguno</option>
              {personal.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.username}
                </option>
              ))}
            </select>
          </label>

          <label className="gestion-form-label">
            Tipo
            <select
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              className="gestion-select"
            >
              <option value="preventivo">Preventivo</option>
              <option value="correctivo">Correctivo</option>
            </select>
          </label>

          <label className="gestion-form-label">
            Prioridad
            <select
              name="prioridad"
              value={formData.prioridad}
              onChange={handleChange}
              className="gestion-select"
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </label>

          <label className="gestion-form-label">
            Fecha programada
            <input
              type="date"
              name="fecha_programada"
              value={formData.fecha_programada || ""}
              onChange={handleChange}
              className="gestion-input"
            />
          </label>

          <label className="gestion-form-label">
            Costo
            <input
              type="number"
              step="0.01"
              name="costo"
              value={formData.costo || ""}
              onChange={handleChange}
              className="gestion-input"
            />
          </label>

          <div className="crud-modal__footer">
            <button
              type="button"
              className="gbutton gbutton--ghost"
              onClick={handleCloseModal}
            >
              Cancelar
            </button>
            <button type="submit" className="gbutton gbutton--primary">
              {editingItem ? "Guardar cambios" : "Crear mantenimiento"}
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
}

export default Mantenimiento;

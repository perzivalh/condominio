import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import CrudModal from "../components/CrudModal";
import "./GestionCrud.css";

const initialForm = { nombre: "", descripcion: "", capacidad: "", costo: "" };

function AreasComunes() {
  const { user } = useAuth();
  const canManage = Array.isArray(user?.roles) && user.roles.includes("ADM");
  const navigate = useNavigate();

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState({ open: false, mode: "create" });
  const [formData, setFormData] = useState(initialForm);
  const [activeId, setActiveId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("access");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("areas/", { headers });
      setAreas(res.data);
    } catch (err) {
      console.error("Error al cargar áreas", err);
      setError("No se pudieron cargar las áreas. Inténtalo nuevamente más tarde.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    if (!canManage) return;
    setFormData(initialForm);
    setActiveId(null);
    setModalState({ open: true, mode: "create" });
  };

  const openEditModal = (area) => {
    if (!canManage) return;
    setActiveId(area.id);
    setFormData({
      nombre: area.nombre || "",
      descripcion: area.descripcion || "",
      capacidad: area.capacidad || "",
      costo: area.costo || "",
    });
    setModalState({ open: true, mode: "edit" });
  };

  const closeModal = () => {
    setModalState({ open: false, mode: "create" });
    setFormData(initialForm);
    setActiveId(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManage || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        capacidad: formData.capacidad ? Number(formData.capacidad) : null,
        costo: formData.costo ? parseFloat(formData.costo) : null,
      };

      if (modalState.mode === "create") {
        await API.post("areas/", payload, { headers });
      } else if (activeId) {
        await API.put(`areas/${activeId}/`, payload, { headers });
      }

      closeModal();
      await loadData();
    } catch (err) {
      console.error("Error al guardar el área", err);
      alert("No se pudo guardar el área. Por favor, inténtalo nuevamente.");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    if (!window.confirm("¿Deseas eliminar esta área?")) return;
    try {
      await API.delete(`areas/${id}/`, { headers });
      await loadData();
    } catch (err) {
      console.error("Error al eliminar el área", err);
      alert("No se pudo eliminar el área. Intenta nuevamente.");
    }
  };

  const filteredAreas = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return areas;
    return areas.filter((a) =>
      a.nombre.toLowerCase().includes(normalized) ||
      (a.descripcion && a.descripcion.toLowerCase().includes(normalized))
    );
  }, [areas, searchTerm]);

  return (
    <div className="gestion-wrapper">
      <div className="gestion-card">
        {/* Botón de volver al menú de áreas */}
        <div style={{ marginBottom: "20px" }}>
          <button
            className="gbutton gbutton--ghost"
            onClick={() => navigate("/dashboard/areas")}
          >
            ← Volver a selección de áreas
          </button>
        </div>

        <div className="gestion-card-header">
          <div>
            <h1 className="gestion-card-title">Áreas Comunes</h1>
            <p className="gestion-card-subtitle">
              Mantén actualizada la información de las áreas comunes del condominio.
            </p>
          </div>
          <div className="gestion-header-actions">
            <input
              className="gestion-search-input"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o descripción"
            />
            {canManage && (
              <button className="gestion-add-button" onClick={openCreateModal}>
                + Nueva área
              </button>
            )}
          </div>
        </div>

        {!canManage && (
          <div className="gestion-readonly-banner">
            El rol actual solo permite consultar la información de áreas.
          </div>
        )}

        {error && <div className="gestion-error">{error}</div>}

        <div className="gestion-table-container">
          {loading ? (
            <div className="gestion-empty">Cargando áreas...</div>
          ) : areas.length === 0 ? (
            <div className="gestion-empty">No hay áreas registradas.</div>
          ) : filteredAreas.length === 0 ? (
            <div className="gestion-empty">
              No se encontraron áreas para la búsqueda actual.
            </div>
          ) : (
            <table className="gestion-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Capacidad</th>
                  <th>Costo</th>
                  {canManage && <th className="gestion-col-actions">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredAreas.map((area) => (
                  <tr key={area.id}>
                    <td>{area.nombre}</td>
                    <td>{area.descripcion || "-"}</td>
                    <td>{area.capacidad || "-"}</td>
                    <td>{area.costo || "-"}</td>
                    {canManage && (
                      <td>
                        <div className="gestion-row-actions">
                          <button
                            type="button"
                            className="gbutton gbutton--ghost"
                            onClick={() => openEditModal(area)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="gbutton gbutton--danger"
                            onClick={() => handleDelete(area.id)}
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
      </div>

      <CrudModal
        open={modalState.open}
        title={modalState.mode === "create" ? "Registrar Área" : "Editar Área"}
        onClose={closeModal}
      >
        <form className="gestion-form" onSubmit={handleSubmit}>
          <div className="gestion-form-grid">
            <label className="gestion-form-label">
              Nombre
              <input
                className="gestion-input"
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                required
              />
            </label>
            <label className="gestion-form-label">
              Capacidad
              <input
                className="gestion-input"
                type="number"
                value={formData.capacidad}
                onChange={(e) => setFormData((prev) => ({ ...prev, capacidad: e.target.value }))}
              />
            </label>
            <label className="gestion-form-label">
              Costo
              <input
                className="gestion-input"
                type="number"
                step="0.01"
                value={formData.costo}
                onChange={(e) => setFormData((prev) => ({ ...prev, costo: e.target.value }))}
              />
            </label>
            <label className="gestion-form-label">
              Descripción
              <input
                className="gestion-input"
                type="text"
                value={formData.descripcion}
                onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
              />
            </label>
          </div>

          <div className="crud-modal__footer">
            <button type="button" className="gbutton gbutton--ghost" onClick={closeModal}>
              Cancelar
            </button>
            <button type="submit" className="gbutton gbutton--primary" disabled={isSubmitting}>
              {isSubmitting
                ? "Guardando..."
                : modalState.mode === "create"
                ? "Crear área"
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
}

export default AreasComunes;

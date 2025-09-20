import React, { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import CrudModal from "../components/CrudModal";
import "./GestionCrud.css";

const initialForm = {
  titulo: "",
  contenido: "",
};

function Avisos() {
  const { user } = useAuth();
  const roles = useMemo(() => (Array.isArray(user?.roles) ? user.roles : []), [user]);
  const canManage = roles.includes("ADM");

  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState({ open: false, mode: "create" });
  const [formData, setFormData] = useState(initialForm);
  const [activeId, setActiveId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAvisos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("avisos/");
      setAvisos(res.data);
    } catch (err) {
      console.error("Error al cargar avisos", err);
      setError("No se pudieron cargar los avisos. Intenta nuevamente más tarde.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvisos();
  }, [loadAvisos]);

  const openCreateModal = () => {
    if (!canManage) return;
    setFormData(initialForm);
    setActiveId(null);
    setModalState({ open: true, mode: "create" });
  };

  const openEditModal = (aviso) => {
    if (!canManage) return;
    setActiveId(aviso.id);
    setFormData({
      titulo: aviso.titulo || "",
      contenido: aviso.contenido || "",
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
        titulo: formData.titulo.trim(),
        contenido: formData.contenido.trim(),
        estado: 1,
        visibilidad: 0,
      };

      if (modalState.mode === "create") {
        await API.post("avisos/", payload);
      } else if (activeId) {
        await API.put(`avisos/${activeId}/`, payload);
      }
      closeModal();
      await loadAvisos();
    } catch (err) {
      console.error("Error al guardar el aviso", err);
      alert("No se pudo guardar el aviso. Por favor, inténtalo nuevamente.");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    const confirmed = window.confirm("¿Deseas eliminar este aviso?");
    if (!confirmed) return;
    try {
      await API.delete(`avisos/${id}/`);
      await loadAvisos();
    } catch (err) {
      console.error("Error al eliminar el aviso", err);
      alert("No se pudo eliminar el aviso. Intenta nuevamente.");
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    try {
      const date = new Date(fecha);
      return date.toLocaleString();
    } catch (err) {
      return fecha;
    }
  };

  return (
    <div className="gestion-wrapper">
      <div className="gestion-card">
        <div className="gestion-card-header">
          <div>
            <h1 className="gestion-card-title">Avisos</h1>
            <p className="gestion-card-subtitle">
              Publica y administra los comunicados para los residentes.
            </p>
          </div>
          {canManage && (
            <button className="gestion-add-button" onClick={openCreateModal}>
              + Nuevo aviso
            </button>
          )}
        </div>

        {!canManage && (
          <div className="gestion-readonly-banner">
            El rol actual solo permite consultar los avisos publicados.
          </div>
        )}

        {error && <div className="gestion-error">{error}</div>}

        <div className="gestion-table-container">
          {loading ? (
            <div className="gestion-empty">Cargando avisos...</div>
          ) : avisos.length === 0 ? (
            <div className="gestion-empty">No hay avisos registrados.</div>
          ) : (
            <table className="gestion-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Contenido</th>
                  <th>Fecha de publicación</th>
                  {canManage && <th className="gestion-col-actions">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {avisos.map((aviso) => (
                  <tr key={aviso.id}>
                    <td>{aviso.titulo}</td>
                    <td className="gestion-table-text">{aviso.contenido}</td>
                    <td>{formatFecha(aviso.fecha_publicacion)}</td>
                    {canManage && (
                      <td>
                        <div className="gestion-row-actions">
                          <button
                            type="button"
                            className="gbutton gbutton--ghost"
                            onClick={() => openEditModal(aviso)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="gbutton gbutton--danger"
                            onClick={() => handleDelete(aviso.id)}
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
        title={modalState.mode === "create" ? "Crear aviso" : "Editar aviso"}
        onClose={closeModal}
      >
        <form className="gestion-form" onSubmit={handleSubmit}>
          <label className="gestion-form-label">
            Título
            <input
              className="gestion-input"
              type="text"
              value={formData.titulo}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, titulo: event.target.value }))
              }
              required
            />
          </label>

          <label className="gestion-form-label">
            Contenido
            <textarea
              className="gestion-textarea"
              value={formData.contenido}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, contenido: event.target.value }))
              }
              rows={6}
              required
            />
          </label>

          <div className="crud-modal__footer">
            <button
              type="button"
              className="gbutton gbutton--ghost"
              onClick={closeModal}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="gbutton gbutton--primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Guardando..."
                : modalState.mode === "create"
                ? "Crear aviso"
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
}

export default Avisos;

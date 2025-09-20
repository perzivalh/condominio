import React, { useCallback, useEffect, useState } from "react";
import API from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import CrudModal from "../components/CrudModal";
import "./GestionCrud.css";

const initialForm = {
  ci: "",
  nombres: "",
  apellidos: "",
  telefono: "",
  correo: "",
  viviendaId: "",
};

function Residentes() {
  const { user } = useAuth();
  const canManage = Array.isArray(user?.roles) && user.roles.includes("ADM");

  const [residentes, setResidentes] = useState([]);
  const [viviendas, setViviendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState({ open: false, mode: "create" });
  const [formData, setFormData] = useState(initialForm);
  const [activeId, setActiveId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [residentesRes, viviendasRes] = await Promise.all([
        API.get("residentes/"),
        API.get("viviendas/"),
      ]);
      setResidentes(residentesRes.data);
      setViviendas(viviendasRes.data);
    } catch (err) {
      console.error("Error al cargar residentes", err);
      setError("No se pudieron cargar los residentes. Inténtalo nuevamente más tarde.");
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

  const openEditModal = (residente) => {
    if (!canManage) return;
    setActiveId(residente.id);
    setFormData({
      ci: residente.ci || "",
      nombres: residente.nombres || "",
      apellidos: residente.apellidos || "",
      telefono: residente.telefono || "",
      correo: residente.correo || "",
      viviendaId: residente.vivienda ? String(residente.vivienda.id) : "",
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
        ci: formData.ci.trim(),
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        telefono: formData.telefono.trim(),
        correo: formData.correo.trim(),
        estado: 1,
        vivienda_id: formData.viviendaId ? Number(formData.viviendaId) : null,
      };

      if (modalState.mode === "create") {
        await API.post("residentes/", payload);
      } else if (activeId) {
        await API.put(`residentes/${activeId}/`, payload);
      }
      closeModal();
      await loadData();
    } catch (err) {
      console.error("Error al guardar el residente", err);
      alert("No se pudo guardar el residente. Por favor, inténtalo nuevamente.");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    const confirmed = window.confirm("¿Deseas eliminar este residente?");
    if (!confirmed) return;
    try {
      await API.delete(`residentes/${id}/`);
      await loadData();
    } catch (err) {
      console.error("Error al eliminar el residente", err);
      alert("No se pudo eliminar el residente. Intenta nuevamente.");
    }
  };

  return (
    <div className="gestion-wrapper">
      <div className="gestion-card">
        <div className="gestion-card-header">
          <div>
            <h1 className="gestion-card-title">Residentes</h1>
            <p className="gestion-card-subtitle">
              Mantén actualizada la información de los residentes del condominio.
            </p>
          </div>
          {canManage && (
            <button className="gestion-add-button" onClick={openCreateModal}>
              + Nuevo residente
            </button>
          )}
        </div>

        {!canManage && (
          <div className="gestion-readonly-banner">
            El rol actual solo permite consultar la información de residentes.
          </div>
        )}

        {error && <div className="gestion-error">{error}</div>}

        <div className="gestion-table-container">
          {loading ? (
            <div className="gestion-empty">Cargando residentes...</div>
          ) : residentes.length === 0 ? (
            <div className="gestion-empty">No hay residentes registrados.</div>
          ) : (
            <table className="gestion-table">
              <thead>
                <tr>
                  <th>Residente</th>
                  <th>CI</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Vivienda asignada</th>
                  {canManage && <th className="gestion-col-actions">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {residentes.map((residente) => (
                  <tr key={residente.id}>
                    <td>{`${residente.nombres} ${residente.apellidos}`}</td>
                    <td>{residente.ci}</td>
                    <td>{residente.telefono || "-"}</td>
                    <td>{residente.correo || "-"}</td>
                    <td>
                      {residente.vivienda
                        ? `${residente.vivienda.codigo_unidad} (${residente.vivienda.bloque || "-"} - ${
                            residente.vivienda.numero || "-"
                          })`
                        : "Sin asignar"}
                    </td>
                    {canManage && (
                      <td>
                        <div className="gestion-row-actions">
                          <button
                            type="button"
                            className="gbutton gbutton--ghost"
                            onClick={() => openEditModal(residente)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="gbutton gbutton--danger"
                            onClick={() => handleDelete(residente.id)}
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
        title={modalState.mode === "create" ? "Registrar residente" : "Editar residente"}
        onClose={closeModal}
      >
        <form className="gestion-form" onSubmit={handleSubmit}>
          <div className="gestion-form-grid">
            <label className="gestion-form-label">
              CI
              <input
                className="gestion-input"
                type="text"
                value={formData.ci}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, ci: event.target.value }))
                }
                required
              />
            </label>
            <label className="gestion-form-label">
              Teléfono
              <input
                className="gestion-input"
                type="text"
                value={formData.telefono}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, telefono: event.target.value }))
                }
              />
            </label>
          </div>

          <label className="gestion-form-label">
            Nombres
            <input
              className="gestion-input"
              type="text"
              value={formData.nombres}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, nombres: event.target.value }))
              }
              required
            />
          </label>

          <label className="gestion-form-label">
            Apellidos
            <input
              className="gestion-input"
              type="text"
              value={formData.apellidos}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, apellidos: event.target.value }))
              }
              required
            />
          </label>

          <label className="gestion-form-label">
            Correo electrónico
            <input
              className="gestion-input"
              type="email"
              value={formData.correo}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, correo: event.target.value }))
              }
            />
          </label>

          <label className="gestion-form-label">
            Vivienda asignada (opcional)
            <select
              className="gestion-select"
              value={formData.viviendaId}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, viviendaId: event.target.value }))
              }
            >
              <option value="">Sin asignar</option>
              {viviendas.map((vivienda) => (
                <option key={vivienda.id} value={vivienda.id}>
                  {vivienda.codigo_unidad}
                </option>
              ))}
            </select>
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
                ? "Crear residente"
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
}

export default Residentes;

import React, { useCallback, useEffect, useState } from "react";
import API from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import CrudModal from "../components/CrudModal";
import "./GestionCrud.css";

const initialForm = {
  residenteId: "",
  placa: "",
  marca: "",
  modelo: "",
  color: "",
};

function Vehiculos() {
  const { user } = useAuth();
  const canManage = Array.isArray(user?.roles) && user.roles.includes("ADM");

  const [vehiculos, setVehiculos] = useState([]);
  const [residentes, setResidentes] = useState([]);
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
      const [vehiculosRes, residentesRes] = await Promise.all([
        API.get("vehiculos/"),
        API.get("residentes/"),
      ]);
      setVehiculos(vehiculosRes.data);
      setResidentes(residentesRes.data);
    } catch (err) {
      console.error("Error al cargar vehículos", err);
      setError("No se pudieron cargar los vehículos. Inténtalo nuevamente más tarde.");
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

  const openEditModal = (vehiculo) => {
    if (!canManage) return;
    setActiveId(vehiculo.id);
    setFormData({
      residenteId: vehiculo.residente ? String(vehiculo.residente.id) : "",
      placa: vehiculo.placa || "",
      marca: vehiculo.marca || "",
      modelo: vehiculo.modelo || "",
      color: vehiculo.color || "",
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
        placa: formData.placa.trim(),
        marca: formData.marca.trim(),
        modelo: formData.modelo.trim(),
        color: formData.color.trim(),
        estado: 1,
        residente_id: Number(formData.residenteId),
      };

      if (modalState.mode === "create") {
        await API.post("vehiculos/", payload);
      } else if (activeId) {
        await API.put(`vehiculos/${activeId}/`, payload);
      }
      closeModal();
      await loadData();
    } catch (err) {
      console.error("Error al guardar el vehículo", err);
      alert("No se pudo guardar el vehículo. Por favor, inténtalo nuevamente.");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    const confirmed = window.confirm("¿Deseas eliminar este vehículo?");
    if (!confirmed) return;
    try {
      await API.delete(`vehiculos/${id}/`);
      await loadData();
    } catch (err) {
      console.error("Error al eliminar el vehículo", err);
      alert("No se pudo eliminar el vehículo. Intenta nuevamente.");
    }
  };

  return (
    <div className="gestion-wrapper">
      <div className="gestion-card">
        <div className="gestion-card-header">
          <div>
            <h1 className="gestion-card-title">Vehículos</h1>
            <p className="gestion-card-subtitle">
              Controla los vehículos asociados a los residentes del condominio.
            </p>
          </div>
          {canManage && (
            <button className="gestion-add-button" onClick={openCreateModal}>
              + Nuevo vehículo
            </button>
          )}
        </div>

        {!canManage && (
          <div className="gestion-readonly-banner">
            El rol actual solo permite consultar la información de vehículos.
          </div>
        )}

        {error && <div className="gestion-error">{error}</div>}

        <div className="gestion-table-container">
          {loading ? (
            <div className="gestion-empty">Cargando vehículos...</div>
          ) : vehiculos.length === 0 ? (
            <div className="gestion-empty">No hay vehículos registrados.</div>
          ) : (
            <table className="gestion-table">
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Color</th>
                  <th>Residente</th>
                  {canManage && <th className="gestion-col-actions">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {vehiculos.map((vehiculo) => (
                  <tr key={vehiculo.id}>
                    <td>{vehiculo.placa}</td>
                    <td>{vehiculo.marca || "-"}</td>
                    <td>{vehiculo.modelo || "-"}</td>
                    <td>{vehiculo.color || "-"}</td>
                    <td>
                      {vehiculo.residente
                        ? `${vehiculo.residente.nombres} ${vehiculo.residente.apellidos}`
                        : "Sin asignar"}
                    </td>
                    {canManage && (
                      <td>
                        <div className="gestion-row-actions">
                          <button
                            type="button"
                            className="gbutton gbutton--ghost"
                            onClick={() => openEditModal(vehiculo)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="gbutton gbutton--danger"
                            onClick={() => handleDelete(vehiculo.id)}
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
        title={modalState.mode === "create" ? "Registrar vehículo" : "Editar vehículo"}
        onClose={closeModal}
      >
        <form className="gestion-form" onSubmit={handleSubmit}>
          <label className="gestion-form-label">
            Residente
            <select
              className="gestion-select"
              value={formData.residenteId}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, residenteId: event.target.value }))
              }
              required
            >
              <option value="">Selecciona un residente</option>
              {residentes.map((residente) => (
                <option key={residente.id} value={residente.id}>
                  {residente.nombres} {residente.apellidos}
                </option>
              ))}
            </select>
          </label>

          <div className="gestion-form-grid">
            <label className="gestion-form-label">
              Placa
              <input
                className="gestion-input"
                type="text"
                value={formData.placa}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, placa: event.target.value }))
                }
                required
              />
            </label>
            <label className="gestion-form-label">
              Marca
              <input
                className="gestion-input"
                type="text"
                value={formData.marca}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, marca: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="gestion-form-grid">
            <label className="gestion-form-label">
              Modelo
              <input
                className="gestion-input"
                type="text"
                value={formData.modelo}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, modelo: event.target.value }))
                }
              />
            </label>
            <label className="gestion-form-label">
              Color
              <input
                className="gestion-input"
                type="text"
                value={formData.color}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, color: event.target.value }))
                }
              />
            </label>
          </div>

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
                ? "Crear vehículo"
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
}

export default Vehiculos;

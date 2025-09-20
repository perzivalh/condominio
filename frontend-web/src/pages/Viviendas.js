import React, { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import CrudModal from "../components/CrudModal";
import "./GestionCrud.css";

const initialFormState = {
  condominioId: "",
  codigo: "",
  bloque: "",
  numero: "",
};

function Viviendas() {
  const { user } = useAuth();
  const canManage = Array.isArray(user?.roles) && user.roles.includes("ADM");

  const [viviendas, setViviendas] = useState([]);
  const [condominios, setCondominios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState({ open: false, mode: "create" });
  const [formData, setFormData] = useState(initialFormState);
  const [activeId, setActiveId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [viviendasRes, condominiosRes] = await Promise.all([
        API.get("viviendas/"),
        API.get("condominios/"),
      ]);
      setViviendas(viviendasRes.data);
      setCondominios(condominiosRes.data);
    } catch (err) {
      console.error("Error al cargar viviendas", err);
      setError("No se pudieron cargar las viviendas. Intenta nuevamente más tarde.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const condominioNombrePorId = useMemo(() => {
    const map = new Map();
    condominios.forEach((c) => {
      map.set(c.id, c.nombre);
    });
    return map;
  }, [condominios]);

  const filteredViviendas = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return viviendas;
    }
    return viviendas.filter((vivienda) =>
      (vivienda.codigo_unidad || "").toLowerCase().includes(normalized)
    );
  }, [searchTerm, viviendas]);

  const openCreateModal = () => {
    if (!canManage) return;
    setModalState({ open: true, mode: "create" });
    setFormData(initialFormState);
    setActiveId(null);
  };

  const openEditModal = (vivienda) => {
    if (!canManage) return;
    setActiveId(vivienda.id);
    setFormData({
      condominioId: vivienda.condominio ? String(vivienda.condominio) : "",
      codigo: vivienda.codigo_unidad || "",
      bloque: vivienda.bloque || "",
      numero: vivienda.numero || "",
    });
    setModalState({ open: true, mode: "edit" });
  };

  const closeModal = () => {
    setModalState({ open: false, mode: "create" });
    setFormData(initialFormState);
    setActiveId(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManage || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        codigo_unidad: formData.codigo.trim(),
        bloque: formData.bloque.trim(),
        numero: formData.numero.trim(),
        estado: 1,
        condominio: Number(formData.condominioId),
      };

      if (modalState.mode === "create") {
        await API.post("viviendas/", payload);
      } else if (activeId) {
        await API.put(`viviendas/${activeId}/`, payload);
      }
      closeModal();
      await loadData();
    } catch (err) {
      console.error("Error al guardar la vivienda", err);
      alert("Ocurrió un error al guardar la vivienda. Por favor, inténtalo de nuevo.");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    const confirmar = window.confirm("¿Deseas eliminar esta vivienda?");
    if (!confirmar) return;
    try {
      await API.delete(`viviendas/${id}/`);
      await loadData();
    } catch (err) {
      console.error("Error al eliminar la vivienda", err);
      alert("No se pudo eliminar la vivienda. Intenta nuevamente.");
    }
  };

  return (
    <div className="gestion-wrapper">
      <div className="gestion-card">
        <div className="gestion-card-header">
          <div>
            <h1 className="gestion-card-title">Viviendas</h1>
            <p className="gestion-card-subtitle">
              Administra las viviendas registradas dentro del condominio.
            </p>
          </div>
          <div className="gestion-header-actions">
            <input
              className="gestion-search-input"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por código"
              aria-label="Buscar vivienda por código"
            />
            {canManage && (
              <button className="gestion-add-button" onClick={openCreateModal}>
                + Nueva vivienda
              </button>
            )}
          </div>
        </div>

        {!canManage && (
          <div className="gestion-readonly-banner">
            El rol actual solo permite visualizar la información de viviendas.
          </div>
        )}

        {error && <div className="gestion-error">{error}</div>}

        <div className="gestion-table-container">
          {loading ? (
            <div className="gestion-empty">Cargando viviendas...</div>
          ) : viviendas.length === 0 ? (
            <div className="gestion-empty">No hay viviendas registradas.</div>
          ) : filteredViviendas.length === 0 ? (
            <div className="gestion-empty">
              No se encontraron viviendas para la búsqueda actual.
            </div>
          ) : (
            <table className="gestion-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Bloque</th>
                  <th>Número</th>
                  <th>Condominio</th>
                  {canManage && <th className="gestion-col-actions">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredViviendas.map((vivienda) => (
                  <tr key={vivienda.id}>
                    <td>{vivienda.codigo_unidad}</td>
                    <td>{vivienda.bloque || "-"}</td>
                    <td>{vivienda.numero || "-"}</td>
                    <td>{condominioNombrePorId.get(vivienda.condominio) || "Sin asignar"}</td>
                    {canManage && (
                      <td>
                        <div className="gestion-row-actions">
                          <button
                            type="button"
                            className="gbutton gbutton--ghost"
                            onClick={() => openEditModal(vivienda)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="gbutton gbutton--danger"
                            onClick={() => handleDelete(vivienda.id)}
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
        title={modalState.mode === "create" ? "Registrar vivienda" : "Editar vivienda"}
        onClose={closeModal}
      >
        <form className="gestion-form" onSubmit={handleSubmit}>
          <label className="gestion-form-label">
            Condominio
            <select
              className="gestion-select"
              value={formData.condominioId}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, condominioId: event.target.value }))
              }
              required
            >
              <option value="">Selecciona un condominio</option>
              {condominios.map((condominio) => (
                <option key={condominio.id} value={condominio.id}>
                  {condominio.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="gestion-form-label">
            Código de vivienda
            <input
              className="gestion-input"
              type="text"
              value={formData.codigo}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, codigo: event.target.value }))
              }
              required
            />
          </label>

          <div className="gestion-form-grid">
            <label className="gestion-form-label">
              Bloque
              <input
                className="gestion-input"
                type="text"
                value={formData.bloque}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, bloque: event.target.value }))
                }
              />
            </label>

            <label className="gestion-form-label">
              Número
              <input
                className="gestion-input"
                type="text"
                value={formData.numero}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, numero: event.target.value }))
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
                ? "Crear vivienda"
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
}

export default Viviendas;

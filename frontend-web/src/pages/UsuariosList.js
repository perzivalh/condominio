import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axiosConfig";
import CrudModal from "../components/CrudModal";
import { useAuth } from "../context/AuthContext";
import "./GestionCrud.css";

const roleConfig = {
  adm: {
    code: "ADM",
    title: "Administradores",
    subtitle: "Controla las cuentas con acceso completo al panel y a todas las funciones.",
    createLabel: "+ Nuevo administrador",
    modalTitle: "Registrar administrador",
    requiresEmail: true,
    requiresResidente: false,
  },
  man: {
    code: "MAN",
    title: "Mantenimiento",
    subtitle: "Gestiona usuarios encargados de incidencias y trabajos técnicos.",
    createLabel: "+ Nuevo usuario de mantenimiento",
    modalTitle: "Registrar usuario de mantenimiento",
    requiresEmail: true,
    requiresResidente: false,
  },
  gua: {
    code: "GUA",
    title: "Guardias",
    subtitle: "Organiza el equipo de seguridad responsable del control de accesos.",
    createLabel: "+ Nuevo guardia",
    modalTitle: "Registrar guardia",
    requiresEmail: true,
    requiresResidente: false,
  },
  res: {
    code: "RES",
    title: "Residentes",
    subtitle: "Asigna accesos digitales a los habitantes del condominio.",
    createLabel: "+ Registrar residente",
    modalTitle: "Registrar residente",
    requiresEmail: false,
    requiresResidente: true,
  },
};

const initialFormState = {
  username: "",
  password: "",
  email: "",
  residenteId: "",
};

export default function UsuariosList() {
  const { rol } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = Array.isArray(user?.roles) && user.roles.includes("ADM");

  const config = roleConfig[rol];

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleId, setRoleId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [residentesDisponibles, setResidentesDisponibles] = useState([]);

  const loadRoleId = useCallback(async () => {
    if (!config) {
      setRoleId(null);
      return;
    }
    try {
      const response = await API.get("roles/");
      const lista = Array.isArray(response.data) ? response.data : [];
      const rolEncontrado = lista.find(
        (item) => item.nombre?.trim() === config.code
      );
      setRoleId(rolEncontrado ? rolEncontrado.id : null);
    } catch (err) {
      console.error("Error al cargar roles", err);
      setRoleId(null);
    }
  }, [config]);

  const loadUsuarios = useCallback(async () => {
    if (!config) {
      setUsuarios([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await API.get("usuarios/");
      const lista = Array.isArray(response.data) ? response.data : [];
      const filtrados = lista.filter((usuario) =>
        Array.isArray(usuario.roles) && usuario.roles.includes(config.code)
      );
      setUsuarios(filtrados);
    } catch (err) {
      console.error("Error al cargar usuarios", err);
      setError(
        "No se pudieron cargar los usuarios. Intenta nuevamente más tarde."
      );
    } finally {
      setLoading(false);
    }
  }, [config]);

  const loadResidentes = useCallback(async () => {
    if (!config || !config.requiresResidente) {
      setResidentesDisponibles([]);
      return;
    }
    try {
      const response = await API.get("residentes/?solo_disponibles=1");
      setResidentesDisponibles(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      console.error("Error al cargar residentes disponibles", err);
      setResidentesDisponibles([]);
    }
  }, [config]);

  useEffect(() => {
    setSearchTerm("");
    setFormData(initialFormState);
    setFormError("");
    loadRoleId();
    loadUsuarios();
    loadResidentes();
  }, [loadRoleId, loadUsuarios, loadResidentes]);

  const filteredUsuarios = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return usuarios;
    }
    return usuarios.filter((usuario) => {
      const username = (
        usuario.username_out || usuario.username || ""
      ).toLowerCase();
      const email = (usuario.email || "").toLowerCase();
      const residenteNombre = (usuario.residente
        ? `${usuario.residente.nombres || ""} ${
            usuario.residente.apellidos || ""
          }`
        : ""
      )
        .trim()
        .toLowerCase();
      return (
        username.includes(normalized) ||
        email.includes(normalized) ||
        residenteNombre.includes(normalized)
      );
    });
  }, [searchTerm, usuarios]);

  const openModal = () => {
    if (!canManage) return;
    setFormData(initialFormState);
    setFormError("");
    setModalOpen(true);
    if (config?.requiresResidente) {
      loadResidentes();
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData(initialFormState);
    setFormError("");
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    const confirmado = window.confirm(
      "¿Seguro que deseas eliminar este usuario?"
    );
    if (!confirmado) return;
    try {
      await API.delete(`usuarios/${id}/`);
      await loadUsuarios();
      if (config?.requiresResidente) {
        await loadResidentes();
      }
    } catch (err) {
      console.error("Error al eliminar usuario", err);
      alert("No se pudo eliminar el usuario. Intenta nuevamente.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManage || isSubmitting) return;

    if (!roleId) {
      setFormError(
        "No se pudo determinar el rol a asignar. Recarga la página e inténtalo de nuevo."
      );
      return;
    }

    if (!formData.username.trim() || !formData.password.trim()) {
      setFormError("Completa los campos obligatorios del formulario.");
      return;
    }

    if (config?.requiresEmail && !formData.email.trim()) {
      setFormError("Ingresa un correo electrónico válido.");
      return;
    }

    if (config?.requiresResidente && !formData.residenteId) {
      setFormError("Selecciona el residente al que deseas asignar la cuenta.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    const payload = {
      username: formData.username.trim(),
      password: formData.password,
      rol_id: roleId,
      estado: 1,
    };

    if (config?.requiresResidente) {
      payload.residente_id = formData.residenteId || null;
    } else {
      payload.email_in = formData.email.trim();
    }

    try {
      await API.post("usuarios/", payload);
      closeModal();
      await loadUsuarios();
      if (config?.requiresResidente) {
        await loadResidentes();
      }
    } catch (err) {
      console.error("Error al crear usuario", err);
      const data = err.response?.data;
      if (typeof data === "string") {
        setFormError(data);
      } else if (data && typeof data === "object") {
        const firstKey = Object.keys(data)[0];
        const message = Array.isArray(data[firstKey])
          ? data[firstKey][0]
          : data[firstKey];
        setFormError(message || "No se pudo guardar el usuario.");
      } else {
        setFormError("No se pudo guardar el usuario. Intenta nuevamente.");
      }
      setIsSubmitting(false);
    }
  };

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  if (!config) {
    return (
      <div className="gestion-wrapper">
        <div className="gestion-card">
          <button
            type="button"
            className="gestion-back-button"
            onClick={() => navigate("/dashboard/usuarios")}
          >
            ← Volver al menú de usuarios
          </button>
          <h1 className="gestion-card-title">Grupo de usuarios no encontrado</h1>
          <p className="gestion-card-subtitle">
            El grupo que intentas administrar no existe. Regresa al menú y elige
            una opción válida.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="gestion-wrapper">
      <div className="gestion-card">
        <div className="gestion-card-header">
          <div>
            <button
              type="button"
              className="gestion-back-button"
              onClick={() => navigate("/dashboard/usuarios")}
            >
              ← Volver al menú
            </button>
            <h1 className="gestion-card-title">{config.title}</h1>
            <div className="usuarios-table-meta">
              <span className="usuarios-badge">{config.code}</span>
              <p className="usuarios-table-subtitle">{config.subtitle}</p>
              <span>Total registrados: {usuarios.length}</span>
            </div>
          </div>

          <div className="gestion-header-actions">
            <input
              type="search"
              className="gestion-search-input"
              placeholder="Buscar por usuario"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Buscar usuario por nombre o correo"
            />
            {canManage && (
              <button
                type="button"
                className="gestion-add-button"
                onClick={openModal}
              >
                {config.createLabel}
              </button>
            )}
          </div>
        </div>

        {error && <div className="gestion-error">{error}</div>}

        <div className="gestion-table-container">
          {loading ? (
            <div className="gestion-empty">Cargando usuarios...</div>
          ) : usuarios.length === 0 ? (
            <div className="gestion-empty">
              Todavía no se registraron usuarios en este grupo.
              {canManage && (
                <div className="usuarios-empty-helper">
                  Usa el botón "{config.createLabel.replace(/^\+\s*/, "")}" para crear el
                  primero.
                </div>
              )}
            </div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="gestion-empty">
              No se encontraron usuarios que coincidan con la búsqueda.
            </div>
          ) : (
            <table className="gestion-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  {config.requiresResidente && <th>Residente asignado</th>}
                  {canManage && <th className="gestion-col-actions">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>
                      <div className="usuarios-table-meta">
                        <span>{usuario.username_out || usuario.username || "—"}</span>
                        <span className="usuarios-table-role">ID #{usuario.id}</span>
                      </div>
                    </td>
                    <td>{usuario.email || "—"}</td>
                    {config.requiresResidente && (
                      <td>
                        {usuario.residente
                          ? `${usuario.residente.nombres || ""} ${
                              usuario.residente.apellidos || ""
                            }`.trim() || "Sin datos"
                          : "Sin asignar"}
                      </td>
                    )}
                    {canManage && (
                      <td>
                        <div className="gestion-row-actions">
                          <button
                            type="button"
                            className="gbutton gbutton--danger"
                            onClick={() => handleDelete(usuario.id)}
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
        open={modalOpen}
        title={config.modalTitle}
        onClose={closeModal}
      >
        <form className="gestion-form" onSubmit={handleSubmit}>
          <div className="gestion-form-grid">
            <label className="gestion-form-label">
              Usuario
              <input
                className="gestion-input"
                type="text"
                value={formData.username}
                onChange={handleChange("username")}
                required
              />
            </label>
            <label className="gestion-form-label">
              Contraseña
              <input
                className="gestion-input"
                type="password"
                value={formData.password}
                onChange={handleChange("password")}
                required
              />
            </label>
            {config.requiresEmail && (
              <label className="gestion-form-label">
                Correo electrónico
                <input
                  className="gestion-input"
                  type="email"
                  value={formData.email}
                  onChange={handleChange("email")}
                  required
                />
              </label>
            )}
            {config.requiresResidente && (
              <label className="gestion-form-label">
                Residente asignado
                <select
                  className="gestion-select"
                  value={formData.residenteId}
                  onChange={handleChange("residenteId")}
                  required
                >
                  <option value="">Selecciona un residente</option>
                  {residentesDisponibles.map((residente) => (
                    <option key={residente.id} value={residente.id}>
                      {residente.nombres} {residente.apellidos} — CI {residente.ci}
                    </option>
                  ))}
                </select>
                {residentesDisponibles.length === 0 && (
                  <span className="gestion-form-helper">
                    No hay residentes disponibles sin usuario asignado.
                  </span>
                )}
              </label>
            )}
          </div>

          {formError && <div className="gestion-error">{formError}</div>}

          <div className="crud-modal__footer">
            <button
              type="button"
              className="gbutton gbutton--ghost"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="gbutton gbutton--primary"
              disabled={
                isSubmitting ||
                (config.requiresResidente && residentesDisponibles.length === 0)
              }
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
}

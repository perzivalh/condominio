import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import API from "../api/axiosConfig";

import "./Finanzas.css";

const TABS = [
  { id: "panel", label: "Panel" },
  { id: "configuracion", label: "Configuración" },
  { id: "facturas", label: "Facturas" },
];

const CONFIG_TABS = [
  { id: "expensas", label: "Expensas" },
  { id: "multas", label: "Multas" },
];

const INITIAL_FACTURA_FILTERS = {
  search: "",
  periodo: "",
  vivienda: "",
  residente: "",
  estado: "",
};

const FACTURA_ESTADO_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "REVISION", label: "En revisión" },
  { value: "PAGADA", label: "Pagada" },
  { value: "PAGADO", label: "Pagado" },
  { value: "CANCELADA", label: "Cancelada" },
];

const PERIODICIDAD_OPTIONS = [
  { value: "MENSUAL", label: "Mensual" },
  { value: "TRIMESTRAL", label: "Trimestral" },
  { value: "ANUAL", label: "Anual" },
];

const ESTADO_OPTIONS = [
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
];

const Modal = ({ title, onClose, children }) => (
  <div className="finanzas-modal-backdrop" role="dialog" aria-modal="true">
    <div className="finanzas-modal">
      <header className="finanzas-modal-header">
        <h3>{title}</h3>
        <button
          type="button"
          className="finanzas-modal-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
      </header>
      <div className="finanzas-modal-content">{children}</div>
    </div>
  </div>
);

const ExpensaForm = ({ condominios, initialData, onSubmit, onCancel }) => {
  const [formValues, setFormValues] = useState(() => ({
    id: initialData?.id || "",
    condominioId:
      initialData?.condominioId ||
      initialData?.condominio_id ||
      (condominios?.[0]?.id ?? ""),
    bloque: initialData?.bloque || "",
    monto: initialData?.monto || "",
    periodicidad:
      initialData?.periodicidad || PERIODICIDAD_OPTIONS[0].value,
    estado: initialData?.estado || ESTADO_OPTIONS[0].value,
  }));

  useEffect(() => {
    setFormValues({
      id: initialData?.id || "",
      condominioId:
        initialData?.condominioId ||
        initialData?.condominio_id ||
        (condominios?.[0]?.id ?? ""),
      bloque: initialData?.bloque || "",
      monto: initialData?.monto || "",
      periodicidad:
        initialData?.periodicidad || PERIODICIDAD_OPTIONS[0].value,
      estado: initialData?.estado || ESTADO_OPTIONS[0].value,
    });
  }, [initialData, condominios]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...formValues,
      condominioId:
        formValues.condominioId || (condominios?.[0]?.id ?? ""),
    });
  };

  const disableSubmit =
    !formValues.condominioId || !formValues.bloque || !formValues.monto;

  return (
    <form className="finanzas-form" onSubmit={handleSubmit}>
      <label className="finanzas-field">
        <span>Condominio</span>
        <select
          name="condominioId"
          value={formValues.condominioId}
          onChange={handleChange}
        >
          <option value="" disabled>
            Selecciona un condominio
          </option>
          {condominios.map((condo) => (
            <option key={condo.id} value={condo.id}>
              {condo.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="finanzas-field">
        <span>Bloque</span>
        <input
          type="text"
          name="bloque"
          value={formValues.bloque}
          onChange={handleChange}
          placeholder="Ej. A"
        />
      </label>

      <label className="finanzas-field">
        <span>Monto</span>
        <input
          type="number"
          name="monto"
          min="0"
          step="0.01"
          value={formValues.monto}
          onChange={handleChange}
          placeholder="0.00"
        />
      </label>

      <label className="finanzas-field">
        <span>Periodicidad</span>
        <select
          name="periodicidad"
          value={formValues.periodicidad}
          onChange={handleChange}
        >
          {PERIODICIDAD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="finanzas-field">
        <span>Estado</span>
        <select
          name="estado"
          value={formValues.estado}
          onChange={handleChange}
        >
          {ESTADO_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="finanzas-modal-actions">
        <button
          type="button"
          className="finanzas-button secondary"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="finanzas-button primary"
          disabled={disableSubmit}
        >
          Guardar
        </button>
      </div>
    </form>
  );
};

const MultaTipoForm = ({ initialData, onSubmit, onCancel }) => {
  const [formValues, setFormValues] = useState({
    nombre: initialData?.nombre || "",
    descripcion: initialData?.descripcion || "",
    monto: initialData?.monto || "",
  });

  useEffect(() => {
    setFormValues({
      nombre: initialData?.nombre || "",
      descripcion: initialData?.descripcion || "",
      monto: initialData?.monto || "",
    });
  }, [initialData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formValues);
  };

  const disableSubmit = !formValues.nombre || !formValues.monto;

  return (
    <form className="finanzas-form" onSubmit={handleSubmit}>
      <label className="finanzas-field">
        <span>Nombre</span>
        <input
          type="text"
          name="nombre"
          value={formValues.nombre}
          onChange={handleChange}
          placeholder="Tipo de multa"
        />
      </label>

      <label className="finanzas-field">
        <span>Descripción</span>
        <textarea
          name="descripcion"
          value={formValues.descripcion}
          onChange={handleChange}
          rows={3}
        />
      </label>

      <label className="finanzas-field">
        <span>Monto</span>
        <input
          type="number"
          name="monto"
          min="0"
          step="0.01"
          value={formValues.monto}
          onChange={handleChange}
          placeholder="0.00"
        />
      </label>

      <div className="finanzas-modal-actions">
        <button
          type="button"
          className="finanzas-button secondary"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="finanzas-button primary"
          disabled={disableSubmit}
        >
          Guardar
        </button>
      </div>
    </form>
  );
};

const MultaForm = ({
  viviendas,
  multaTipos,
  initialData,
  onSubmit,
  onCancel,
  onAddTipo,
}) => {
  const activeTipos = useMemo(
    () => multaTipos.filter((tipo) => tipo.activo !== false),
    [multaTipos]
  );

  const [formValues, setFormValues] = useState(() => ({
    viviendaId: initialData?.viviendaId || viviendas?.[0]?.id || "",
    multaConfigId:
      initialData?.multaConfigId || activeTipos?.[0]?.id || "",
    descripcion: initialData?.descripcion || "",
    monto:
      initialData?.monto ||
      (activeTipos?.[0]?.monto !== undefined
        ? String(activeTipos?.[0]?.monto)
        : ""),
  }));

  useEffect(() => {
    setFormValues({
      viviendaId: initialData?.viviendaId || viviendas?.[0]?.id || "",
      multaConfigId:
        initialData?.multaConfigId || activeTipos?.[0]?.id || "",
      descripcion: initialData?.descripcion || "",
      monto:
        initialData?.monto ||
        (activeTipos?.[0]?.monto !== undefined
          ? String(activeTipos?.[0]?.monto)
          : ""),
    });
  }, [initialData, viviendas, activeTipos]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleTipoChange = (event) => {
    const { value } = event.target;
    if (value === "__add__") {
      onAddTipo({ ...formValues });
      return;
    }

    const selected = activeTipos.find((tipo) => tipo.id === value);
    setFormValues((prev) => ({
      ...prev,
      multaConfigId: value,
      monto:
        selected?.monto !== undefined ? String(selected.monto) : prev.monto,
      descripcion:
        prev.descripcion ||
        selected?.descripcion ||
        selected?.nombre ||
        "",
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formValues);
  };

  const disableSubmit =
    !formValues.viviendaId || !formValues.multaConfigId || !formValues.monto;

  const noData = viviendas.length === 0 || activeTipos.length === 0;

  return (
    <form className="finanzas-form" onSubmit={handleSubmit}>
      {noData && (
        <p className="finanzas-form-hint">
          Debes tener viviendas y tipos de multa activos para asignar una
          sanción.
        </p>
      )}

      <label className="finanzas-field">
        <span>Vivienda</span>
        <select
          name="viviendaId"
          value={formValues.viviendaId}
          onChange={handleChange}
          disabled={viviendas.length === 0}
        >
          <option value="" disabled>
            Selecciona una vivienda
          </option>
          {viviendas.map((home) => (
            <option key={home.id} value={home.id}>
              {home.codigo_unidad} {home.bloque ? `- Bloque ${home.bloque}` : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="finanzas-field">
        <span>Tipo de multa</span>
        <select
          name="multaConfigId"
          value={formValues.multaConfigId}
          onChange={handleTipoChange}
          disabled={activeTipos.length === 0}
        >
          <option value="" disabled>
            Selecciona un tipo de multa
          </option>
          {activeTipos.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </option>
          ))}
          <option value="__add__">Añadir tipo de multa…</option>
        </select>
      </label>

      <label className="finanzas-field">
        <span>Descripción</span>
        <textarea
          name="descripcion"
          value={formValues.descripcion}
          onChange={handleChange}
          rows={3}
        />
      </label>

      <label className="finanzas-field">
        <span>Monto</span>
        <input
          type="number"
          name="monto"
          min="0"
          step="0.01"
          value={formValues.monto}
          onChange={handleChange}
          placeholder="0.00"
        />
      </label>

      <div className="finanzas-modal-actions">
        <button
          type="button"
          className="finanzas-button secondary"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="finanzas-button primary"
          disabled={disableSubmit || noData}
        >
          Guardar
        </button>
      </div>
    </form>
  );
};

const clampPercentage = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
};

const FacturaDetalleView = ({
  factura,
  detalles,
  pagos,
  onDownload,
  formatCurrency,
  formatDate,
  onApprovePago,
  onRejectPago,
  resolvingPagoId,
}) => {
  if (!factura) {
    return (
      <div className="factura-detalle-empty">
        <p>No se encontró información de la factura.</p>
      </div>
    );
  }

  const residentesLabel =
    Array.isArray(factura.residentes) && factura.residentes.length
      ? factura.residentes.join(", ")
      : "-";

  return (
    <div className="factura-detalle">
      <div className="factura-detalle-header">
        <div className="factura-detalle-summary">
          <div>
            <span className="factura-detalle-label">Periodo</span>
            <span className="factura-detalle-value">{factura.periodo}</span>
          </div>
          <div>
            <span className="factura-detalle-label">Vivienda</span>
            <span className="factura-detalle-value">
              {factura.vivienda_codigo || factura.vivienda}
            </span>
          </div>
          <div>
            <span className="factura-detalle-label">Bloque</span>
            <span className="factura-detalle-value">
              {factura.vivienda_bloque || "-"}
            </span>
          </div>
          <div>
            <span className="factura-detalle-label">Residentes</span>
            <span className="factura-detalle-value">{residentesLabel}</span>
          </div>
          <div>
            <span className="factura-detalle-label">Estado</span>
            <span className="factura-detalle-pill">{factura.estado}</span>
          </div>
          <div>
            <span className="factura-detalle-label">Monto total</span>
            <span className="factura-detalle-value">
              {formatCurrency(factura.monto)}
            </span>
          </div>
          <div>
            <span className="factura-detalle-label">Emisión</span>
            <span className="factura-detalle-value">
              {formatDate(factura.fecha_emision)}
            </span>
          </div>
          <div>
            <span className="factura-detalle-label">Vencimiento</span>
            <span className="factura-detalle-value">
              {formatDate(factura.fecha_vencimiento)}
            </span>
          </div>
          <div>
            <span className="factura-detalle-label">Pago</span>
            <span className="factura-detalle-value">
              {formatDate(factura.fecha_pago)}
            </span>
          </div>
        </div>
        <div className="factura-detalle-actions">
          <button
            type="button"
            className="finanzas-button primary"
            onClick={onDownload}
          >
            Descargar PDF
          </button>
        </div>
      </div>

      <div className="factura-detalle-section">
        <h4>Conceptos</h4>
        {Array.isArray(detalles) && detalles.length ? (
          <table className="factura-detalle-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Tipo</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((detalle) => (
                <tr key={detalle.id}>
                  <td>{detalle.descripcion}</td>
                  <td>{detalle.tipo}</td>
                  <td>{formatCurrency(detalle.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="factura-detalle-empty">No hay conceptos registrados.</p>
        )}
      </div>

      <div className="factura-detalle-section">
        <h4>Pagos registrados</h4>
        {Array.isArray(pagos) && pagos.length ? (
          <table className="factura-detalle-table">
            <thead>
              <tr>
                <th>Método</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Registrado por</th>
                <th>Referencia</th>
                <th>Nota</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago) => {
                const estadoPago = (pago.estado || "").toString();
                const estadoUpper = estadoPago.toUpperCase();
                const isRevision = estadoUpper === "REVISION";
                return (
                  <tr key={pago.id}>
                    <td>{pago.metodo}</td>
                    <td>{formatCurrency(pago.monto_pagado)}</td>
                    <td>
                      <span
                        className={`factura-detalle-pill status-${estadoUpper.toLowerCase()}`}
                      >
                        {estadoPago || "-"}
                      </span>
                    </td>
                    <td>{pago.registrado_por || "-"}</td>
                    <td>{pago.referencia_externa || "-"}</td>
                    <td>{pago.comentario || "-"}</td>
                    <td>{formatDate(pago.fecha_pago)}</td>
                    <td>
                      {isRevision && onApprovePago && onRejectPago ? (
                        <div className="factura-detalle-actions-inline">
                          <button
                            type="button"
                            className="finanzas-button ghost"
                            onClick={() => onApprovePago(factura, pago)}
                            disabled={resolvingPagoId === pago.id}
                          >
                            {resolvingPagoId === pago.id
                              ? "Procesando..."
                              : "Aceptar"}
                          </button>
                          <button
                            type="button"
                            className="finanzas-button danger"
                            onClick={() => onRejectPago(factura, pago)}
                            disabled={resolvingPagoId === pago.id}
                          >
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <span className="factura-detalle-muted">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="factura-detalle-empty">
            No se registran pagos asociados a esta factura.
          </p>
        )}
      </div>
    </div>
  );
};

const PagoManualForm = ({ factura, onSubmit, onCancel, loading }) => {
  const [formValues, setFormValues] = useState(() => ({
    monto_pagado: factura?.monto ? String(factura.monto) : "",
    metodo: "EFECTIVO",
    referencia: "",
    fecha_pago: "",
  }));

  const periodoLabel = factura?.periodo || "seleccionado";

  useEffect(() => {
    setFormValues({
      monto_pagado: factura?.monto ? String(factura.monto) : "",
      metodo: "EFECTIVO",
      referencia: "",
      fecha_pago: "",
    });
  }, [factura]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formValues);
  };

  const disableSubmit = !formValues.monto_pagado || Number(formValues.monto_pagado) <= 0;

  return (
    <form className="finanzas-form" onSubmit={handleSubmit}>
      <p className="pago-manual-resumen">
        Registrar pago manual para la factura del periodo <strong>{periodoLabel}</strong>.
      </p>

      <label className="finanzas-field">
        <span>Monto pagado</span>
        <input
          type="number"
          name="monto_pagado"
          min="0"
          step="0.01"
          value={formValues.monto_pagado}
          onChange={handleChange}
        />
      </label>

      <label className="finanzas-field">
        <span>Método</span>
        <select name="metodo" value={formValues.metodo} onChange={handleChange}>
          <option value="EFECTIVO">Efectivo</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="DEPOSITO">Depósito</option>
          <option value="OTRO">Otro</option>
        </select>
      </label>

      <label className="finanzas-field">
        <span>Fecha de pago</span>
        <input
          type="date"
          name="fecha_pago"
          value={formValues.fecha_pago}
          onChange={handleChange}
        />
      </label>

      <label className="finanzas-field">
        <span>Referencia u observaciones</span>
        <input
          type="text"
          name="referencia"
          value={formValues.referencia}
          onChange={handleChange}
          placeholder="Caja, recibo interno, etc."
        />
      </label>

      <div className="finanzas-modal-actions">
        <button
          type="button"
          className="finanzas-button secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="finanzas-button primary"
          disabled={disableSubmit || loading}
        >
          {loading ? "Guardando..." : "Registrar pago"}
        </button>
      </div>
    </form>
  );
};

const PagoRevisionRechazoForm = ({ onSubmit, onCancel, loading }) => {
  const [comentario, setComentario] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!comentario.trim()) {
      setLocalError("Describe el motivo del rechazo para notificar al residente.");
      return;
    }
    setLocalError("");
    onSubmit(comentario.trim());
  };

  return (
    <form className="finanzas-form" onSubmit={handleSubmit}>
      <label className="finanzas-field">
        <span>Motivo del rechazo</span>
        <textarea
          name="comentario"
          rows={4}
          value={comentario}
          onChange={(event) => setComentario(event.target.value)}
          placeholder="Detalla el motivo para que el residente pueda corregirlo"
        />
      </label>
      {(localError) && <p className="finanzas-error">{localError}</p>}
      <div className="finanzas-modal-actions">
        <button
          type="button"
          className="finanzas-button secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="finanzas-button danger"
          disabled={loading}
        >
          {loading ? "Procesando..." : "Rechazar pago"}
        </button>
      </div>
    </form>
  );
};

const QrConfigForm = ({ current, loading, error, onSubmit, onDelete, onCancel }) => {
  const [descripcion, setDescripcion] = useState(current?.descripcion || "");
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(current?.url || "");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setDescripcion(current?.descripcion || "");
    setArchivo(null);
    setPreview(current?.url || "");
    setLocalError("");
  }, [current?.id]);

  useEffect(() => () => {
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
  }, [preview]);

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    setArchivo(file || null);
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    } else {
      setPreview(current?.url || "");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!archivo && !current?.id) {
      setLocalError("Selecciona una imagen con el código QR.");
      return;
    }
    setLocalError("");
    const formData = new FormData();
    if (archivo) {
      formData.append("archivo", archivo);
    }
    formData.append("descripcion", descripcion || "");
    onSubmit(formData);
  };

  return (
    <form className="finanzas-form" onSubmit={handleSubmit}>
      <div className="qr-config-preview">
        {preview ? (
          <img src={preview} alt="Código QR del condominio" />
        ) : (
          <div className="qr-config-placeholder">No hay QR configurado</div>
        )}
      </div>

      <label className="finanzas-field">
        <span>Descripción opcional</span>
        <input
          type="text"
          name="descripcion"
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          placeholder="Cuenta destino, vigencia, etc."
        />
      </label>

      <label className="finanzas-field">
        <span>Imagen del QR</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={loading}
        />
      </label>

      {(localError || error) && (
        <p className="finanzas-error">{localError || error}</p>
      )}

      <div className="finanzas-modal-actions">
        <button
          type="button"
          className="finanzas-button secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </button>
        {current?.id && (
          <button
            type="button"
            className="finanzas-button ghost"
            onClick={onDelete}
            disabled={loading}
          >
            Eliminar QR
          </button>
        )}
        <button
          type="submit"
          className="finanzas-button primary"
          disabled={loading}
        >
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
};

function Finanzas() {
  const [activeTab, setActiveTab] = useState("panel");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [configTab, setConfigTab] = useState("expensas");
  const [expensas, setExpensas] = useState([]);
  const [multas, setMultas] = useState([]);
  const [multaTipos, setMultaTipos] = useState([]);
  const [viviendas, setViviendas] = useState([]);
  const [condominios, setCondominios] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState("");
  const [configMessage, setConfigMessage] = useState("");
  const [modalState, setModalState] = useState({ type: null, data: null });
  const [facturas, setFacturas] = useState([]);
  const [facturasLoading, setFacturasLoading] = useState(false);
  const [facturasError, setFacturasError] = useState("");
  const [facturasMessage, setFacturasMessage] = useState("");
  const [showFacturaFilters, setShowFacturaFilters] = useState(false);
  const [facturasFilters, setFacturasFilters] = useState(() => ({
    ...INITIAL_FACTURA_FILTERS,
  }));
  const facturasFiltersRef = useRef({ ...INITIAL_FACTURA_FILTERS });
  const [actionLoading, setActionLoading] = useState(false);
  const [resolvingPagoId, setResolvingPagoId] = useState(null);
  const [qrConfig, setQrConfig] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrSaving, setQrSaving] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrMessage, setQrMessage] = useState("");

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-BO", {
        style: "currency",
        currency: "BOB",
        minimumFractionDigits: 2,
      }),
    []
  );

  const shortNumberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-BO", {
        maximumFractionDigits: 0,
      }),
    []
  );

  const formatCurrency = useCallback(
    (value) => {
      const numericValue = Number(value ?? 0);
      if (Number.isNaN(numericValue)) {
        return currencyFormatter.format(0);
      }
      return currencyFormatter.format(numericValue);
    },
    [currencyFormatter]
  );

  const formatShortCurrency = useCallback(
    (value) => {
      const numericValue = Number(value ?? 0);
      if (Number.isNaN(numericValue) || numericValue === 0) {
        return "Bs 0";
      }
      return `Bs ${shortNumberFormatter.format(numericValue)}`;
    },
    [shortNumberFormatter]
  );

  const formatDate = useCallback((value) => {
    if (!value) {
      return "-";
    }

    try {
      const dateValue = new Date(value);
      if (Number.isNaN(dateValue.getTime())) {
        return value;
      }
      return dateValue.toLocaleDateString("es-BO");
    } catch (err) {
      return value;
    }
  }, []);

  const isFacturaPagada = useCallback((estado) => {
    if (!estado) {
      return false;
    }
    const normalized = String(estado).toUpperCase();
    return ["PAGADA", "PAGADO", "CANCELADA", "CANCELADO"].includes(normalized);
  }, []);

  const getErrorMessage = useCallback((err, fallbackMessage) => {
    if (err?.response?.data) {
      const data = err.response.data;
      if (typeof data.detail === "string") return data.detail;
      if (typeof data.error === "string") return data.error;
      const firstValue = Array.isArray(data)
        ? data[0]
        : Object.values(data)[0];
      if (Array.isArray(firstValue)) {
        return firstValue[0];
      }
      if (typeof firstValue === "string") {
        return firstValue;
      }
    }
    if (err?.message) {
      return err.message;
    }
    return fallbackMessage;
  }, []);

  const loadFacturas = useCallback(
    async (filtersOverride = null) => {
      const activeFilters = filtersOverride || facturasFiltersRef.current;
      setFacturasLoading(true);
      setFacturasError("");

      try {
        const params = {};
        Object.entries(activeFilters || {}).forEach(([key, value]) => {
          if (value) {
            params[key] = value;
          }
        });

        const response = await API.get("finanzas/admin/facturas/", { params });
        setFacturas(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setFacturasError(
          getErrorMessage(err, "No se pudo cargar el historial de facturas.")
        );
      } finally {
        setFacturasLoading(false);
      }
    },
    [getErrorMessage]
  );

  const loadQrConfig = useCallback(async () => {
    setQrLoading(true);
    setQrError("");
    try {
      const response = await API.get("finanzas/admin/codigo-qr/");
      setQrConfig(response.data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setQrConfig(null);
      } else {
        setQrError(getErrorMessage(err, "No se pudo obtener el archivo QR actual."));
      }
    } finally {
      setQrLoading(false);
    }
  }, [getErrorMessage]);

  const handleOpenModal = useCallback((type, data = null) => {
    setModalState({ type, data });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({ type: null, data: null });
  }, []);

  const resolvePago = useCallback(
    async (facturaId, pagoId, accion, comentario = "") => {
      if (!facturaId || !pagoId) {
        return null;
      }
      setResolvingPagoId(pagoId);
      setFacturasError("");
      try {
        const payload = { accion };
        if (comentario) {
          payload.comentario = comentario;
        }
        const response = await API.post(
          `finanzas/admin/facturas/${facturaId}/pagos/${pagoId}/resolver/`,
          payload
        );
        return response.data;
      } catch (err) {
        setFacturasError(
          getErrorMessage(err, "No se pudo actualizar el estado del pago.")
        );
        throw err;
      } finally {
        setResolvingPagoId(null);
      }
    },
    [getErrorMessage]
  );

  const handleApprovePago = useCallback(
    async (factura, pago) => {
      if (!factura?.id || !pago?.id) {
        return;
      }
      try {
        const data = await resolvePago(factura.id, pago.id, "aprobar");
        setModalState((prev) => {
          if (prev.type !== "factura-detalle") {
            return prev;
          }
          const detallesPrevios = prev.data?.detalles || [];
          return {
            type: "factura-detalle",
            data: {
              ...data,
              detalles: data.detalles || detallesPrevios,
            },
          };
        });
        setFacturasMessage("Pago confirmado correctamente.");
        await Promise.all([loadSummary(), loadFacturas()]);
      } catch (err) {
        // el error ya se maneja en resolvePago
      }
    },
    [loadFacturas, loadSummary, resolvePago]
  );

  const handleRejectPago = useCallback(
    (factura, pago) => {
      if (!factura?.id || !pago?.id) {
        return;
      }
      setModalState({
        type: "pago-rechazo",
        data: {
          facturaId: factura.id,
          pago,
          original:
            modalState.type === "factura-detalle" ? modalState.data : null,
        },
      });
    },
    [modalState]
  );

  const handleCancelRechazo = useCallback(() => {
    const original = modalState.data?.original;
    if (original) {
      setModalState({ type: "factura-detalle", data: original });
    } else {
      handleCloseModal();
    }
  }, [handleCloseModal, modalState.data]);

  const handleSubmitRechazo = useCallback(
    async (comentario) => {
      const facturaId = modalState.data?.facturaId;
      const pago = modalState.data?.pago;
      const original = modalState.data?.original;
      if (!facturaId || !pago?.id) {
        return;
      }
      try {
        const data = await resolvePago(facturaId, pago.id, "rechazar", comentario);
        const detallesPrevios = original?.detalles || [];
        setModalState({
          type: "factura-detalle",
          data: {
            ...data,
            detalles: data.detalles || detallesPrevios,
          },
        });
        setFacturasMessage("Pago devuelto al residente para revisión.");
        await Promise.all([loadFacturas(), loadSummary()]);
      } catch (err) {
        // el error ya se manejó en resolvePago
      }
    },
    [loadFacturas, loadSummary, modalState.data, resolvePago]
  );

  const handleSaveQr = useCallback(
    async (formData) => {
      if (!(formData instanceof FormData)) {
        return;
      }
      try {
        setQrSaving(true);
        setQrError("");
        const response = await API.post("finanzas/admin/codigo-qr/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setQrConfig(response.data);
        setQrMessage("El código QR se actualizó correctamente.");
        handleCloseModal();
      } catch (err) {
        setQrError(
          getErrorMessage(err, "No se pudo actualizar el código QR del condominio.")
        );
      } finally {
        setQrSaving(false);
      }
    },
    [getErrorMessage, handleCloseModal]
  );

  const handleDeleteQr = useCallback(async () => {
    const confirmed = window.confirm(
      "¿Eliminar el código QR actual? Los residentes dejarán de verlo."
    );
    if (!confirmed) {
      return;
    }
    try {
      setQrSaving(true);
      setQrError("");
      await API.delete("finanzas/admin/codigo-qr/");
      setQrConfig(null);
      setQrMessage("El código QR se eliminó correctamente.");
      handleCloseModal();
    } catch (err) {
      setQrError(
        getErrorMessage(err, "No se pudo eliminar el código QR configurado.")
      );
    } finally {
      setQrSaving(false);
    }
  }, [getErrorMessage, handleCloseModal]);

  const handleFacturasFilterChange = useCallback((field, value) => {
    setFacturasFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleApplyFacturasFilters = useCallback(
    (event) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }
      loadFacturas(facturasFilters);
    },
    [facturasFilters, loadFacturas]
  );

  const handleResetFacturasFilters = useCallback(() => {
    const resetValues = { ...INITIAL_FACTURA_FILTERS };
    setFacturasFilters(resetValues);
    loadFacturas(resetValues);
  }, [loadFacturas]);

  const handleToggleFacturaFilters = useCallback(() => {
    setShowFacturaFilters((prev) => !prev);
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.get("finanzas/admin/resumen/");
      setSummary(response.data);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        "No se pudo cargar el resumen financiero.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfigData = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) {
        setConfigLoading(true);
      }
      setConfigError("");
      try {
        const [
          expensasResponse,
          multasResponse,
          tiposResponse,
          viviendasResponse,
          condominiosResponse,
        ] = await Promise.all([
          API.get("finanzas/config/expensas/"),
          API.get("finanzas/config/multas/"),
          API.get("finanzas/config/multas/catalogo/"),
          API.get("viviendas/"),
          API.get("condominios/"),
        ]);

        setExpensas(
          Array.isArray(expensasResponse.data) ? expensasResponse.data : []
        );
        setMultas(Array.isArray(multasResponse.data) ? multasResponse.data : []);
        setMultaTipos(
          Array.isArray(tiposResponse.data) ? tiposResponse.data : []
        );
        setViviendas(
          Array.isArray(viviendasResponse.data) ? viviendasResponse.data : []
        );
        setCondominios(
          Array.isArray(condominiosResponse.data)
            ? condominiosResponse.data
            : []
        );
      } catch (err) {
        setConfigError(
          getErrorMessage(
            err,
            "No se pudo cargar la configuración financiera."
          )
        );
      } finally {
        setConfigLoading(false);
      }
    },
    [getErrorMessage]
  );

  const handleViewFactura = useCallback(
    async (facturaId) => {
      if (!facturaId) {
        return;
      }
      try {
        setFacturasError("");
        const response = await API.get(`finanzas/admin/facturas/${facturaId}/`);
        handleOpenModal("factura-detalle", response.data);
      } catch (err) {
        setFacturasError(
          getErrorMessage(
            err,
            "No se pudo obtener el detalle de la factura seleccionada."
          )
        );
      }
    },
    [getErrorMessage, handleOpenModal]
  );

  const handleDownloadFactura = useCallback(
    async (factura) => {
      if (!factura?.id) {
        return;
      }
      try {
        const response = await API.get(
          `finanzas/admin/facturas/${factura.id}/pdf/`,
          { responseType: "blob" }
        );
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        const viviendaCode = (factura.vivienda_codigo || factura.vivienda || "factura")
          .toString()
          .replace(/\s+/g, "-");
        const periodo = (factura.periodo || "detalle").toString().replace(/\s+/g, "-");
        link.href = url;
        link.download = `${viviendaCode}-${periodo}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        setFacturasError(
          getErrorMessage(err, "No se pudo descargar la factura en PDF.")
        );
      }
    },
    [getErrorMessage]
  );

  const handleOpenPagoManual = useCallback(
    (factura) => {
      if (!factura) {
        return;
      }
      handleOpenModal("factura-pago", { factura });
    },
    [handleOpenModal]
  );

  const handleSubmitPagoManual = useCallback(
    async (values) => {
      const facturaActual = modalState?.data?.factura;
      if (!facturaActual?.id) {
        return;
      }

      try {
        setActionLoading(true);
        setFacturasError("");
        await API.post(
          `finanzas/admin/facturas/${facturaActual.id}/registrar-pago/`,
          values
        );
        setFacturasMessage("Pago manual registrado correctamente.");
        handleCloseModal();
        await Promise.all([
          loadSummary(),
          loadFacturas(),
          loadConfigData(false),
        ]);
      } catch (err) {
        setFacturasError(
          getErrorMessage(err, "No se pudo registrar el pago manual.")
        );
      } finally {
        setActionLoading(false);
      }
    },
    [
      getErrorMessage,
      handleCloseModal,
      loadConfigData,
      loadFacturas,
      loadSummary,
      modalState,
    ]
  );

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (activeTab === "configuracion") {
      loadConfigData();
    }
  }, [activeTab, loadConfigData]);

  useEffect(() => {
    if (!configMessage) {
      return undefined;
    }
    const timeout = setTimeout(() => setConfigMessage(""), 4000);
    return () => clearTimeout(timeout);
  }, [configMessage]);

  useEffect(() => {
    facturasFiltersRef.current = facturasFilters;
  }, [facturasFilters]);

  useEffect(() => {
    if (!facturasMessage) {
      return undefined;
    }
    const timeout = setTimeout(() => setFacturasMessage(""), 4000);
    return () => clearTimeout(timeout);
  }, [facturasMessage]);

  useEffect(() => {
    if (!qrMessage) {
      return undefined;
    }
    const timeout = setTimeout(() => setQrMessage(""), 4000);
    return () => clearTimeout(timeout);
  }, [qrMessage]);

  useEffect(() => {
    if (activeTab === "facturas") {
      loadFacturas();
      loadQrConfig();
    }
  }, [activeTab, loadFacturas, loadQrConfig]);

  const metrics = useMemo(() => {
    const parseNumber = (value) => {
      const parsed = Number(value ?? 0);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const ingresosMensuales = Array.isArray(summary?.ingresos_mensuales)
      ? summary.ingresos_mensuales.map((item) => ({
          ...item,
          totalNumber: parseNumber(item.total),
        }))
      : [];

    const maxMonthlyTotal = ingresosMensuales.reduce(
      (max, item) => Math.max(max, item.totalNumber),
      0
    );

    return {
      ingresosMes: parseNumber(summary?.ingresos_mes),
      pagadoMes: parseNumber(summary?.pagado_mes),
      pendienteMes: parseNumber(summary?.pendiente_mes),
      morosidadTotal: parseNumber(summary?.morosidad_total),
      ingresosMensuales,
      ingresosMaximo: maxMonthlyTotal > 0 ? maxMonthlyTotal : 1,
      facturasTotales: summary?.facturas?.total_emitidas || 0,
      facturasPagadas: summary?.facturas?.total_pagadas || 0,
      porcentajeFacturas: clampPercentage(
        parseNumber(summary?.facturas?.porcentaje_pagadas)
      ),
    };
  }, [summary]);

  const handleSaveExpensa = useCallback(
    async (formValues) => {
      try {
        setConfigError("");
        const payload = {
          condominio_id: formValues.condominioId,
          bloque: formValues.bloque,
          monto: formValues.monto,
          periodicidad: formValues.periodicidad,
          estado: formValues.estado,
        };

        if (formValues.id) {
          await API.patch(
            `finanzas/config/expensas/${formValues.id}/`,
            payload
          );
          setConfigMessage("Expensa actualizada correctamente.");
        } else {
          await API.post("finanzas/config/expensas/", payload);
          setConfigMessage("Expensa creada correctamente.");
        }

        handleCloseModal();
        await loadConfigData(false);
      } catch (err) {
        setConfigError(
          getErrorMessage(err, "No se pudo guardar la configuración de expensa.")
        );
      }
    },
    [getErrorMessage, handleCloseModal, loadConfigData]
  );

  const handleDeleteExpensa = useCallback(
    async (expensaId) => {
      if (!expensaId) return;
      const confirmed = window.confirm(
        "¿Eliminar la configuración de expensa seleccionada?"
      );
      if (!confirmed) {
        return;
      }
      try {
        setConfigError("");
        await API.delete(`finanzas/config/expensas/${expensaId}/`);
        setConfigMessage("Expensa eliminada correctamente.");
        await loadConfigData(false);
      } catch (err) {
        setConfigError(
          getErrorMessage(err, "No se pudo eliminar la configuración de expensa.")
        );
      }
    },
    [getErrorMessage, loadConfigData]
  );

  const handleSaveMultaTipo = useCallback(
    async (formValues) => {
      try {
        setConfigError("");
        const response = await API.post(
          "finanzas/config/multas/catalogo/",
          {
            nombre: formValues.nombre,
            descripcion: formValues.descripcion,
            monto: formValues.monto,
            activo: true,
          }
        );

        setConfigMessage("Tipo de multa creado correctamente.");
        const { returnTo, draft } = modalState.data || {};
        handleCloseModal();
        await loadConfigData(false);

        if (returnTo) {
          const reopenData = {
            ...(draft || {}),
            multaConfigId: response?.data?.id || draft?.multaConfigId || "",
          };
          handleOpenModal(returnTo, reopenData);
        }
      } catch (err) {
        setConfigError(
          getErrorMessage(err, "No se pudo crear el tipo de multa.")
        );
      }
    },
    [getErrorMessage, handleCloseModal, handleOpenModal, loadConfigData, modalState.data]
  );

  const handleSaveMulta = useCallback(
    async (formValues) => {
      try {
        setConfigError("");
        const payload = {
          vivienda_id: formValues.viviendaId,
          multa_config_id: formValues.multaConfigId,
          descripcion: formValues.descripcion,
          monto: formValues.monto,
        };

        await API.post("finanzas/config/multas/", payload);
        setConfigMessage("Multa asignada correctamente.");
        handleCloseModal();
        await loadConfigData(false);
      } catch (err) {
        setConfigError(
          getErrorMessage(err, "No se pudo asignar la multa a la vivienda.")
        );
      }
    },
    [getErrorMessage, handleCloseModal, loadConfigData]
  );

  const handleDeleteMulta = useCallback(
    async (multaId) => {
      if (!multaId) return;
      const confirmed = window.confirm(
        "¿Eliminar la multa asignada a la vivienda?"
      );
      if (!confirmed) {
        return;
      }

      try {
        setConfigError("");
        await API.delete(`finanzas/config/multas/${multaId}/`);
        setConfigMessage("Multa eliminada correctamente.");
        await loadConfigData(false);
      } catch (err) {
        setConfigError(
          getErrorMessage(err, "No se pudo eliminar la multa asignada.")
        );
      }
    },
    [getErrorMessage, loadConfigData]
  );

  const handleGenerateInvoices = useCallback(async () => {
    try {
      setFacturasError("");
      const response = await API.post("finanzas/admin/generar-facturas/", {});
      const { periodo, creadas, actualizadas } = response?.data || {};
      setFacturasMessage(
        `Facturas generadas para ${periodo || "el periodo seleccionado"}. ` +
          `${creadas || 0} creadas, ${actualizadas || 0} actualizadas.`
      );
      await Promise.all([
        loadSummary(),
        loadConfigData(false),
        loadFacturas(),
      ]);
    } catch (err) {
      setFacturasError(
        getErrorMessage(err, "No se pudieron generar las facturas.")
      );
    }
  }, [getErrorMessage, loadConfigData, loadFacturas, loadSummary]);

  const renderPanel = () => {
    if (loading) {
      return (
        <div className="finanzas-loading">
          <p>Cargando resumen financiero...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="finanzas-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={loadSummary} className="finanzas-retry">
            Reintentar
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="finanzas-metrics">
          <div className="finanzas-card">
            <span className="finanzas-metric-title">Ingresos del mes</span>
            <span className="finanzas-amount">
              {formatCurrency(metrics.ingresosMes)}
            </span>
            <span className="finanzas-metric-subtitle">
              Periodo actual estimado
            </span>
          </div>

          <div className="finanzas-card">
            <span className="finanzas-metric-title">Pagado del mes</span>
            <span className="finanzas-amount">
              {formatCurrency(metrics.pagadoMes)}
            </span>
            <span className="finanzas-metric-subtitle">
              Pendiente: {formatCurrency(metrics.pendienteMes)}
            </span>
          </div>

          <div className="finanzas-card">
            <span className="finanzas-metric-title">Morosidad total</span>
            <span className="finanzas-amount">
              {formatCurrency(metrics.morosidadTotal)}
            </span>
            <span className="finanzas-metric-subtitle">
              Facturas vencidas sin pagar
            </span>
          </div>
        </div>

        <div className="finanzas-bottom">
          <div className="finanzas-card finanzas-chart">
            <div className="finanzas-card-header">
              <span className="finanzas-metric-title">Ingresos por mes</span>
              <span className="finanzas-metric-subtitle">
                Pagos confirmados por periodo
              </span>
            </div>
            <div className="finanzas-chart-content" role="img" aria-label="Ingresos por mes">
              {metrics.ingresosMensuales.map((item) => {
                const percentage =
                  metrics.ingresosMaximo === 0
                    ? 0
                    : Math.round((item.totalNumber / metrics.ingresosMaximo) * 100);
                const barHeight = Math.max(percentage, item.totalNumber > 0 ? 8 : 2);

                return (
                  <div className="finanzas-bar-column" key={item.periodo}>
                    <span className="finanzas-bar-value">
                      {formatShortCurrency(item.totalNumber)}
                    </span>
                    <div
                      className="finanzas-bar"
                      style={{ height: `${barHeight}%` }}
                      aria-hidden="true"
                    />
                    <span className="finanzas-bar-label">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="finanzas-card finanzas-progress">
            <span className="finanzas-metric-title">Facturas pagadas total</span>
            <div
              className="finanzas-progress-circle"
              style={{
                background: `conic-gradient(#5ad06b ${
                  metrics.porcentajeFacturas * 3.6
                }deg, #d3dae6 0deg)`,
              }}
              role="img"
              aria-label={`Facturas pagadas ${metrics.porcentajeFacturas}%`}
            >
              <span className="finanzas-progress-value">
                {metrics.porcentajeFacturas.toFixed(0)}%
              </span>
            </div>
            <div className="finanzas-progress-details">
              <span>
                {metrics.facturasPagadas} de {metrics.facturasTotales} facturas
                pagadas
              </span>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderExpensasTable = () => {
    if (!expensas.length) {
      return (
        <div className="finanzas-config-empty">
          <p>No hay expensas configuradas por bloque.</p>
        </div>
      );
    }

    return (
      <div className="finanzas-table-wrapper">
        <table className="finanzas-table">
          <thead>
            <tr>
              <th>Bloque</th>
              <th>Monto</th>
              <th>Periodicidad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expensas.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="finanzas-table-main">{item.bloque || "-"}</div>
                  <div className="finanzas-table-sub">{item.condominio_nombre}</div>
                </td>
                <td>{formatCurrency(item.monto)}</td>
                <td>{item.periodicidad_label || item.periodicidad}</td>
                <td>
                  <span
                    className={`finanzas-pill ${
                      item.estado === "ACTIVO" ? "success" : "warning"
                    }`}
                  >
                    {item.estado_label || item.estado}
                  </span>
                </td>
                <td className="finanzas-table-actions">
                  <button
                    type="button"
                    className="finanzas-button ghost"
                    onClick={() =>
                      handleOpenModal("expensa-edit", {
                        id: item.id,
                        condominioId:
                          item.condominio_id ||
                          item.condominioId ||
                          condominios?.[0]?.id ||
                          "",
                        bloque: item.bloque,
                        monto: item.monto,
                        periodicidad: item.periodicidad,
                        estado: item.estado,
                      })
                    }
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="finanzas-button danger"
                    onClick={() => handleDeleteExpensa(item.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMultasTable = () => {
    if (!multas.length) {
      return (
        <div className="finanzas-config-empty">
          <p>No hay multas pendientes aplicadas a viviendas.</p>
        </div>
      );
    }

    return (
      <div className="finanzas-table-wrapper">
        <table className="finanzas-table">
          <thead>
            <tr>
              <th>Vivienda</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {multas.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="finanzas-table-main">{item.vivienda_codigo}</div>
                  <div className="finanzas-table-sub">
                    {item.vivienda_bloque ? `Bloque ${item.vivienda_bloque}` : ""}
                  </div>
                </td>
                <td>{item.multa_nombre}</td>
                <td>
                  <button
                    type="button"
                    className="finanzas-link-button"
                    onClick={() =>
                      handleOpenModal("multa-view", {
                        titulo: item.multa_nombre,
                        descripcion: item.descripcion,
                      })
                    }
                  >
                    Ver detalle
                  </button>
                </td>
                <td>{formatCurrency(item.monto)}</td>
                <td className="finanzas-table-actions">
                  <button
                    type="button"
                    className="finanzas-button danger"
                    onClick={() => handleDeleteMulta(item.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderConfiguracion = () => {
    return (
      <div className="finanzas-configuracion">
        <div
          className="finanzas-subtabs"
          role="tablist"
          aria-label="Configuración de finanzas"
        >
          {CONFIG_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={configTab === tab.id}
              className={`finanzas-subtab ${configTab === tab.id ? "active" : ""}`}
              onClick={() => setConfigTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(configError || configMessage) && (
          <div className="finanzas-config-feedback">
            {configError && <p className="error">{configError}</p>}
            {configMessage && <p className="success">{configMessage}</p>}
          </div>
        )}

        <div className="finanzas-config-actions">
          {configTab === "expensas" ? (
            <button
              type="button"
              className="finanzas-button accent"
              onClick={() =>
                handleOpenModal("expensa-create", {
                  condominioId: condominios?.[0]?.id || "",
                  periodicidad: PERIODICIDAD_OPTIONS[0].value,
                  estado: ESTADO_OPTIONS[0].value,
                })
              }
            >
              + Crear expensa
            </button>
          ) : (
            <div className="finanzas-config-action-group">
              <button
                type="button"
                className="finanzas-button accent"
                onClick={() =>
                  handleOpenModal("multa-create", {
                    viviendaId: viviendas?.[0]?.id || "",
                    multaConfigId: multaTipos?.[0]?.id || "",
                  })
                }
              >
                + Crear multa
              </button>
              <button
                type="button"
                className="finanzas-button ghost"
                onClick={() => handleOpenModal("multa-tipo")}
              >
                + Tipo de multa
              </button>
            </div>
          )}
        </div>

        {configLoading ? (
          <div className="finanzas-config-loader">
            <p>Cargando configuración...</p>
          </div>
        ) : configTab === "expensas" ? (
          renderExpensasTable()
        ) : (
          renderMultasTable()
        )}
      </div>
    );
  };

  const renderFacturas = () => {
    return (
      <div className="finanzas-facturas">
        <div className="finanzas-facturas-actions">
          <button
            type="button"
            className="finanzas-button primary"
            onClick={handleGenerateInvoices}
          >
            Generar facturas
          </button>
          <button
            type="button"
            className="finanzas-button secondary"
            onClick={() => {
              loadQrConfig();
              handleOpenModal("qr-config");
            }}
          >
            Archivo QR
          </button>

          <form
            className="finanzas-facturas-search"
            onSubmit={handleApplyFacturasFilters}
          >
            <input
              type="text"
              placeholder="Buscar por periodo, vivienda o residente"
              aria-label="Buscar facturas"
              value={facturasFilters.search}
              onChange={(event) =>
                handleFacturasFilterChange("search", event.target.value)
              }
            />
            <button
              type="submit"
              className="finanzas-icon-button"
              aria-label="Buscar facturas"
            >
              <span className="icon icon-search" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`finanzas-icon-button ${
                showFacturaFilters ? "active" : ""
              }`}
              onClick={handleToggleFacturaFilters}
              aria-label={
                showFacturaFilters
                  ? "Ocultar filtros de facturas"
                  : "Mostrar filtros de facturas"
              }
              aria-expanded={showFacturaFilters}
            >
              <span className="icon icon-filter" aria-hidden="true" />
            </button>
          </form>
        </div>

        {showFacturaFilters && (
          <div className="finanzas-filters-panel">
            <div className="finanzas-filters-grid">
              <label className="finanzas-field">
                <span>Periodo</span>
                <input
                  type="text"
                  name="periodo"
                  placeholder="2025-09"
                  value={facturasFilters.periodo}
                  onChange={(event) =>
                    handleFacturasFilterChange("periodo", event.target.value)
                  }
                />
              </label>
              <label className="finanzas-field">
                <span>Vivienda</span>
                <input
                  type="text"
                  name="vivienda"
                  placeholder="A01"
                  value={facturasFilters.vivienda}
                  onChange={(event) =>
                    handleFacturasFilterChange("vivienda", event.target.value)
                  }
                />
              </label>
              <label className="finanzas-field">
                <span>Residente</span>
                <input
                  type="text"
                  name="residente"
                  placeholder="Juan"
                  value={facturasFilters.residente}
                  onChange={(event) =>
                    handleFacturasFilterChange("residente", event.target.value)
                  }
                />
              </label>
              <label className="finanzas-field">
                <span>Estado</span>
                <select
                  name="estado"
                  value={facturasFilters.estado}
                  onChange={(event) =>
                    handleFacturasFilterChange("estado", event.target.value)
                  }
                >
                  {FACTURA_ESTADO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="finanzas-filters-actions">
              <button
                type="button"
                className="finanzas-button secondary"
                onClick={handleResetFacturasFilters}
              >
                Limpiar
              </button>
              <button
                type="button"
                className="finanzas-button primary"
                onClick={() => handleApplyFacturasFilters()}
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        )}

        {(facturasError || facturasMessage || qrError || qrMessage) && (
          <div className="finanzas-facturas-feedback">
            {facturasError && <p className="error">{facturasError}</p>}
            {facturasMessage && <p className="success">{facturasMessage}</p>}
            {qrError && <p className="error">{qrError}</p>}
            {qrMessage && <p className="success">{qrMessage}</p>}
          </div>
        )}

        {facturasLoading ? (
          <div className="finanzas-config-loader">
            <p>Cargando facturas...</p>
          </div>
        ) : facturas.length === 0 ? (
          <div className="finanzas-config-empty">
            <p>No se encontraron facturas emitidas.</p>
          </div>
        ) : (
          <div className="finanzas-table-wrapper">
            <table className="finanzas-table">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Vivienda</th>
                  <th>Residentes</th>
                  <th>Monto total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((factura) => {
                  const estado = factura.estado || "";
                  const estadoUpper = estado.toUpperCase();
                  const estadoClass = isFacturaPagada(estado)
                    ? "success"
                    : estadoUpper === "PENDIENTE"
                    ? "warning"
                    : estadoUpper === "REVISION"
                    ? "review"
                    : "info";
                  const residentesLabel =
                    Array.isArray(factura.residentes) && factura.residentes.length
                      ? factura.residentes.join(", ")
                      : "-";

                  return (
                    <tr key={factura.id}>
                      <td>{factura.periodo}</td>
                      <td>
                        <div className="finanzas-table-main">
                          {factura.vivienda_codigo || factura.vivienda}
                        </div>
                        <div className="finanzas-table-sub">
                          {factura.vivienda_bloque
                            ? `Bloque ${factura.vivienda_bloque}`
                            : ""}
                        </div>
                      </td>
                      <td>{residentesLabel}</td>
                      <td>{formatCurrency(factura.monto)}</td>
                      <td>
                        <span className={`finanzas-pill ${estadoClass}`}>
                          {estado}
                        </span>
                      </td>
                      <td className="finanzas-table-actions">
                        <button
                          type="button"
                          className="finanzas-button ghost"
                          onClick={() => handleViewFactura(factura.id)}
                        >
                          Detalle
                        </button>
                        <button
                          type="button"
                          className="finanzas-button accent"
                          onClick={() => handleOpenPagoManual(factura)}
                          disabled={
                            isFacturaPagada(estado) || estadoUpper === "REVISION"
                          }
                          title={
                            isFacturaPagada(estado)
                              ? "La factura ya está pagada"
                              : estadoUpper === "REVISION"
                              ? "La factura tiene un pago en revisión"
                              : "Registrar pago manual"
                          }
                        >
                          Pagar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderModal = () => {
    if (!modalState.type) {
      return null;
    }

    if (modalState.type === "expensa-create" || modalState.type === "expensa-edit") {
      return (
        <Modal
          title={modalState.type === "expensa-edit" ? "Editar expensa" : "Nueva expensa"}
          onClose={handleCloseModal}
        >
          <ExpensaForm
            condominios={condominios}
            initialData={modalState.data}
            onSubmit={handleSaveExpensa}
            onCancel={handleCloseModal}
          />
        </Modal>
      );
    }

    if (modalState.type === "multa-tipo") {
      const handleCancelTipo = () => {
        const { returnTo, draft } = modalState.data || {};
        handleCloseModal();
        if (returnTo) {
          handleOpenModal(returnTo, draft || {});
        }
      };

      return (
        <Modal title="Nuevo tipo de multa" onClose={handleCloseModal}>
          <MultaTipoForm
            initialData={modalState.data}
            onSubmit={handleSaveMultaTipo}
            onCancel={handleCancelTipo}
          />
        </Modal>
      );
    }

    if (modalState.type === "multa-create") {
      return (
        <Modal title="Asignar multa" onClose={handleCloseModal}>
          <MultaForm
            viviendas={viviendas}
            multaTipos={multaTipos}
            initialData={modalState.data}
            onSubmit={handleSaveMulta}
            onCancel={handleCloseModal}
            onAddTipo={(draft) =>
              handleOpenModal("multa-tipo", {
                returnTo: "multa-create",
                draft,
              })
            }
          />
        </Modal>
      );
    }

    if (modalState.type === "multa-view") {
      return (
        <Modal title={modalState.data?.titulo || "Detalle de multa"} onClose={handleCloseModal}>
          <div className="finanzas-modal-text">
            <p>{modalState.data?.descripcion || "Sin descripción disponible."}</p>
          </div>
        </Modal>
      );
    }

    if (modalState.type === "factura-detalle") {
      const detalleData = modalState.data || {};
      const titulo = detalleData?.factura?.periodo
        ? `Factura ${detalleData.factura.periodo}`
        : "Detalle de factura";
      const detalles = detalleData.detalles || [];

      return (
        <Modal title={titulo} onClose={handleCloseModal}>
          <FacturaDetalleView
            factura={detalleData.factura}
            detalles={detalles}
            pagos={detalleData.pagos}
            onDownload={() => handleDownloadFactura(detalleData.factura)}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onApprovePago={handleApprovePago}
            onRejectPago={handleRejectPago}
            resolvingPagoId={resolvingPagoId}
          />
        </Modal>
      );
    }

    if (modalState.type === "factura-pago") {
      const factura = modalState.data?.factura;
      const titulo = factura?.periodo
        ? `Registrar pago - ${factura.periodo}`
        : "Registrar pago manual";

      return (
        <Modal title={titulo} onClose={handleCloseModal}>
          <PagoManualForm
            factura={factura}
            onSubmit={handleSubmitPagoManual}
            onCancel={handleCloseModal}
            loading={actionLoading}
          />
        </Modal>
      );
    }

    if (modalState.type === "pago-rechazo") {
      const pago = modalState.data?.pago;
      const loading = pago?.id && resolvingPagoId === pago.id;
      return (
        <Modal title="Rechazar pago" onClose={handleCancelRechazo}>
          <PagoRevisionRechazoForm
            onSubmit={handleSubmitRechazo}
            onCancel={handleCancelRechazo}
            loading={loading}
          />
        </Modal>
      );
    }

    if (modalState.type === "qr-config") {
      return (
        <Modal title="Configuración de pago QR" onClose={handleCloseModal}>
          <QrConfigForm
            current={qrConfig}
            loading={qrSaving}
            error={qrError}
            onSubmit={handleSaveQr}
            onDelete={qrConfig ? handleDeleteQr : undefined}
            onCancel={handleCloseModal}
          />
        </Modal>
      );
    }

    return null;
  };

  return (
    <section className="finanzas-container">
      <header className="finanzas-header">
        <h1>Finanzas</h1>
        <p>Control centralizado de los ingresos y pagos del condominio.</p>
      </header>

      <div className="finanzas-tabs" role="tablist" aria-label="Modulos de finanzas">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`finanzas-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="finanzas-content" role="tabpanel">
        {activeTab === "panel"
          ? renderPanel()
          : activeTab === "configuracion"
          ? renderConfiguracion()
          : renderFacturas()}
      </div>

      {renderModal()}
    </section>
  );
}

export default Finanzas;

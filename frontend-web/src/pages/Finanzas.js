import React, {
  useCallback,
  useEffect,
  useMemo,
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

  const handleOpenModal = useCallback((type, data = null) => {
    setModalState({ type, data });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({ type: null, data: null });
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
      setConfigError("");
      const response = await API.post("finanzas/admin/generar-facturas/", {});
      const { periodo, creadas, actualizadas } = response?.data || {};
      setConfigMessage(
        `Facturas generadas para ${periodo || "el periodo seleccionado"}. ` +
          `${creadas || 0} creadas, ${actualizadas || 0} actualizadas.`
      );
      await Promise.all([loadSummary(), loadConfigData(false)]);
    } catch (err) {
      setConfigError(
        getErrorMessage(err, "No se pudieron generar las facturas.")
      );
    }
  }, [getErrorMessage, loadConfigData, loadSummary]);

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
          <button
            type="button"
            className="finanzas-button primary"
            onClick={handleGenerateInvoices}
          >
            Generar facturas
          </button>

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

    return null;
  };

  const renderPlaceholder = (label) => (
    <div className="finanzas-placeholder">
      <h3>{label}</h3>
      <p>
        Estamos preparando las herramientas para gestionar este módulo. Mientras
        tanto puedes revisar el panel principal.
      </p>
    </div>
  );

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
          : renderPlaceholder("Facturas")}
      </div>

      {renderModal()}
    </section>
  );
}

export default Finanzas;

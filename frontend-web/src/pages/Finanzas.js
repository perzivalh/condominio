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

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

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
          : renderPlaceholder(
              activeTab === "configuracion" ? "Configuración" : "Facturas"
            )}
      </div>
    </section>
  );
}

export default Finanzas;

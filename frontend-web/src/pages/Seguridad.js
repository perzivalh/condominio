import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  downloadSecuritySummaryPdf,
  fetchAccessHistory,
  fetchIncidents,
  fetchSecuritySummary,
  identifyVehicle,
} from "../api/security";
import "./Seguridad.css";

const DEFAULT_SUMMARY_PERIOD = "monthly";

const normalizeStatus = (estado) => {
  if (!estado) return "";
  const value = estado.toString().toLowerCase();
  if (value.includes("aprob")) return "aprobado";
  if (value.includes("rech")) return "rechazado";
  return value;
};

const formatRelativeTime = (isoString) => {
  if (!isoString) return "";
  const target = new Date(isoString);
  const now = new Date();
  const diffMs = now - target;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Hace instantes";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} d`;
  const months = Math.floor(days / 30);
  return `Hace ${months} mes${months > 1 ? "es" : ""}`;
};

const formatDateTime = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString();
};

function Seguridad() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [captureLoading, setCaptureLoading] = useState(false);
  const [accessHistory, setAccessHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentsRefreshing, setIncidentsRefreshing] = useState(false);
  const silentRefreshRef = useRef(false);
  const [identifyError, setIdentifyError] = useState("");
  const [identifySuccess, setIdentifySuccess] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryPeriod, setSummaryPeriod] = useState(DEFAULT_SUMMARY_PERIOD);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    let activeStream;
    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("La cámara no es compatible con este navegador.");
        return;
      }
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
      } catch (error) {
        setCameraError(
          "No se pudo acceder a la cámara. Verifique los permisos del navegador."
        );
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchAccessHistory(10);
      setAccessHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      setIdentifyError(
        "No se pudo cargar el historial de accesos. Intente nuevamente."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadIncidents = useCallback(
    async ({ initial = false, silent = false } = {}) => {
      if (initial) {
        if (incidentsLoading) {
          return;
        }
        setIncidentsLoading(true);
      } else if (silent) {
        if (silentRefreshRef.current) {
          return;
        }
        silentRefreshRef.current = true;
      } else {
        if (incidentsRefreshing || incidentsLoading) {
          return;
        }
        setIncidentsRefreshing(true);
      }

      try {
        const data = await fetchIncidents({ limit: 6 });
        setIncidents((prev) => {
          const next = Array.isArray(data) ? data : [];
          if (prev.length !== next.length) {
            return next;
          }
          const prevSerialized = JSON.stringify(prev);
          const nextSerialized = JSON.stringify(next);
          return prevSerialized === nextSerialized ? prev : next;
        });
      } catch (error) {
        if (initial) {
          setIncidents([]);
        }
      } finally {
        if (initial) {
          setIncidentsLoading(false);
        } else if (silent) {
          silentRefreshRef.current = false;
        } else {
          setIncidentsRefreshing(false);
        }
      }
    },
    [incidentsLoading, incidentsRefreshing]
  );

  useEffect(() => {
    loadHistory();
    loadIncidents({ initial: true });
  }, [loadHistory, loadIncidents]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadIncidents({ silent: true });
    }, 15000);
    return () => clearInterval(interval);
  }, [loadIncidents]);

  useEffect(() => {
    if (!summaryOpen) {
      return;
    }

    const loadSummary = async () => {
      setSummaryLoading(true);
      setSummaryError("");
      try {
        const data = await fetchSecuritySummary(summaryPeriod);
        setSummaryData(data);
      } catch (error) {
        setSummaryError(
          error?.response?.data?.detail || "No se pudo cargar el resumen."
        );
      } finally {
        setSummaryLoading(false);
      }
    };

    loadSummary();
  }, [summaryOpen, summaryPeriod]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      setIdentifyError("La cámara está inicializando. Intente nuevamente en unos segundos.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCaptureLoading(true);
    setIdentifyError("");
    try {
      const payload = await identifyVehicle(dataUrl);
      if (payload?.registro) {
        setIdentifySuccess({ ...payload.registro, coincide: payload.coincide });
      } else {
        setIdentifySuccess(null);
      }
      if (Array.isArray(payload?.historial)) {
        setAccessHistory(payload.historial);
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setIdentifyError(detail || "No se pudo procesar la captura. Intente nuevamente.");
      setIdentifySuccess(null);
    } finally {
      setCaptureLoading(false);
    }
  };

  const handleRetry = () => {
    setIdentifySuccess(null);
    setIdentifyError("");
  };

  const handleDownloadPdf = async () => {
    try {
      const blobData = await downloadSecuritySummaryPdf(summaryPeriod);
      const blob = new Blob([blobData], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const suffix = summaryPeriod === "total" ? "historico" : summaryPeriod;
      link.href = url;
      link.download = `reporte-seguridad-${suffix}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setSummaryError(
        error?.response?.data?.detail || "No se pudo descargar el reporte en PDF."
      );
    }
  };

  return (
    <div className="security-page">
      <header className="security-header">
        <div>
          <h1>Seguridad</h1>
          <p>Control en tiempo real de accesos vehiculares y alertas de residentes.</p>
        </div>
        <button className="summary-button" onClick={() => setSummaryOpen(true)}>
          Reportes
        </button>
      </header>

      <div className="security-layout">
        <section className="security-card vehicle-card">
          <div className="card-header">
            <h2>Identificar Vehículo</h2>
            <button className="pill-button" onClick={handleRetry} disabled={!identifySuccess && !identifyError}>
              Reintentar
            </button>
          </div>
          <div className="camera-shell">
            {cameraError ? (
              <div className="camera-error">{cameraError}</div>
            ) : (
              <video ref={videoRef} autoPlay muted playsInline className="camera-feed" />
            )}
            <canvas ref={canvasRef} className="camera-canvas" aria-hidden="true" />
          </div>
          <button className="primary-button" onClick={handleCapture} disabled={captureLoading || !!cameraError}>
            {captureLoading ? "Procesando..." : "Capturar"}
          </button>
          {identifyError && <p className="feedback error">{identifyError}</p>}
          {identifySuccess && (() => {
            const status = normalizeStatus(identifySuccess.estado);
            const approved = status === "aprobado";
            return (
              <div className={`identify-result ${approved ? "approved" : "rejected"}`}>
              <div>
                <span className="plate-label">Placa detectada</span>
                <p className="plate-value">{identifySuccess.placa_detectada}</p>
              </div>
              <div className="result-badge">
                {identifySuccess?.estado_display || (approved ? "Aprobado" : "Rechazado")}
              </div>
            </div>
            );
          })()}
          <div className="history-section">
            <div className="section-title">
              <h3>Historial de accesos</h3>
              {historyLoading && <span className="loading-text">Actualizando...</span>}
            </div>
            {accessHistory.length === 0 && !historyLoading ? (
              <p className="empty-state">Sin registros recientes.</p>
            ) : (
              <ul className="history-list">
                {accessHistory.map((item) => {
                  const status = normalizeStatus(item.estado);
                  return (
                    <li key={item.id} className={`history-item ${status}`}>
                      <div className="history-main">
                        <strong>{item.placa_detectada}</strong>
                        <span className="history-status">{item.estado_display || status}</span>
                      </div>
                      <div className="history-meta">
                        <span>{formatDateTime(item.creado_en)}</span>
                        {item?.residente?.vivienda && <span>{item.residente.vivienda}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="security-card incidents-card">
          <div className="card-header">
            <h2>Alertas por Incidentes</h2>
            <button
              className="pill-button"
              onClick={() => loadIncidents()}
              disabled={incidentsLoading || incidentsRefreshing}
            >
              {incidentsRefreshing ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
          {incidentsLoading ? (
            <p className="loading-text">Cargando reportes...</p>
          ) : incidents.length === 0 ? (
            <p className="empty-state">No hay incidentes recientes.</p>
          ) : (
            <ul className="incident-list">
              {incidents.map((incident) => {
                const relativeTime =
                  incident.tiempo_transcurrido || formatRelativeTime(incident.creado_en);
                return (
                <li key={incident.id} className={incident.es_emergencia ? "incident emergency" : "incident"}>
                  <div className="incident-title">
                    <span className="category">{incident.categoria_nombre}</span>
                    <span className="time-chip">{relativeTime}</span>
                  </div>
                  <p className="incident-desc">{incident.descripcion || "Sin descripción"}</p>
                  <div className="incident-footer">
                    <span>{incident?.residente?.codigo_vivienda || "Sin vivienda"}</span>
                    <span>{incident?.residente?.nombres}</span>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
          <div className="incidents-footer">
            <p>Los residentes pueden reportar novedades desde la app móvil.</p>
          </div>
        </section>
      </div>

      {summaryOpen && (
        <div className="summary-modal" role="dialog" aria-modal="true">
          <div className="summary-content">
            <div className="summary-header">
              <div>
                <h3>Reporte de Seguridad</h3>
                <p>Totales de accesos e incidentes por periodo.</p>
              </div>
              <button className="pill-button" onClick={() => setSummaryOpen(false)}>
                Cerrar
              </button>
            </div>

            <div className="summary-controls">
              <label htmlFor="summary-period">Periodo</label>
              <select
                id="summary-period"
                value={summaryPeriod}
                onChange={(event) => setSummaryPeriod(event.target.value)}
              >
                <option value="daily">Últimas 24 horas</option>
                <option value="monthly">Últimos 30 días</option>
                <option value="total">Histórico</option>
              </select>
            </div>

            {summaryLoading ? (
              <p className="loading-text">Generando resumen...</p>
            ) : summaryError ? (
              <p className="feedback error">{summaryError}</p>
            ) : summaryData ? (
              <div className="summary-body">
                <div className="summary-grid">
                  <div className="summary-tile">
                    <span>Total accesos</span>
                    <strong>{summaryData?.accesos?.total ?? 0}</strong>
                  </div>
                  <div className="summary-tile">
                    <span>Aprobados</span>
                    <strong>{summaryData?.accesos?.aprobados ?? 0}</strong>
                  </div>
                  <div className="summary-tile">
                    <span>Rechazados</span>
                    <strong>{summaryData?.accesos?.rechazados ?? 0}</strong>
                  </div>
                  <div className="summary-tile">
                    <span>Incidentes</span>
                    <strong>{summaryData?.incidentes?.total ?? 0}</strong>
                  </div>
                  <div className="summary-tile">
                    <span>Pendientes</span>
                    <strong>{summaryData?.incidentes?.pendientes ?? 0}</strong>
                  </div>
                  <div className="summary-tile">
                    <span>Emergencias</span>
                    <strong>{summaryData?.incidentes?.emergencias ?? 0}</strong>
                  </div>
                </div>
                <div className="categories-list">
                  <h4>Incidentes por categoría</h4>
                  <ul>
                    {(summaryData?.incidentes?.por_categoria || []).map((item) => (
                      <li key={`${item.nombre}-${item.total}`}>
                        <span>{item.nombre}</span>
                        <strong>{item.total}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
                {summaryData?.incidentes?.recientes?.length ? (
                  <div className="recent-incidents">
                    <h4>Incidentes recientes</h4>
                    <ul>
                      {summaryData.incidentes.recientes.map((item) => {
                        const relativeTime =
                          item.tiempo_transcurrido || formatRelativeTime(item.creado_en);
                        return (
                        <li key={item.id}>
                          <div className="recent-line">
                            <span>{item.categoria_nombre}</span>
                            <span>{relativeTime}</span>
                          </div>
                          <p>{item.descripcion || "Sin descripción"}</p>
                        </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="summary-actions">
              <button className="primary-button" onClick={handleDownloadPdf} disabled={summaryLoading}>
                Exportar como PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Seguridad;

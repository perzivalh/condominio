import API from "./axiosConfig";

export const fetchAccessHistory = async (limit = 10) => {
  const response = await API.get("seguridad/accesos/", {
    params: { limit },
  });
  return response.data;
};

export const identifyVehicle = async (imageBase64) => {
  const response = await API.post("seguridad/accesos/identificar/", {
    image_base64: imageBase64,
  });
  return response.data;
};

export const fetchIncidents = async (params = {}) => {
  const response = await API.get("seguridad/incidentes/", {
    params,
  });
  return response.data;
};

export const fetchSecuritySummary = async (period = "monthly") => {
  const response = await API.get("seguridad/reportes/resumen/", {
    params: { period },
  });
  return response.data;
};

export const downloadSecuritySummaryPdf = async (period = "monthly") => {
  const response = await API.get("seguridad/reportes/resumen/pdf/", {
    params: { period },
    responseType: "blob",
  });
  return response.data;
};

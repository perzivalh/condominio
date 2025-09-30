import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://condominio-production.up.railway.app/api/",
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;

import React from "react";
import { useNavigate } from "react-router-dom";
import "./GestionCrud.css";

const AREAS = [
  { id: 1, nombre: "Áreas Comunes", ruta: "areascomunes" },
  { id: 2, nombre: "Reservas", ruta: "reservas" },
  { id: 3, nombre: "Reportes", ruta: "reportes" },
];

const Areas = () => {
  const navigate = useNavigate();

  return (
    <div className="gestion-wrapper">
      <div className="gestion-card">
        <div className="gestion-card-header">
          <h1 className="gestion-card-title">Gestión de Áreas</h1>
          <p className="gestion-card-subtitle">
            Selecciona un área para administrar.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
            justifyContent: "center",
            marginTop: "30px",
            flexWrap: "wrap",
          }}
        >
          {AREAS.map((area) => (
            <div
              key={area.id}
              className="gestion-dashboard-card"
              style={{
                flex: "0 0 250px",
                height: "150px",
                borderRadius: "12px",
                backgroundColor: "#fff", 
                color: "#333", 
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)", 
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onClick={() => navigate(`/dashboard/areas/${area.ruta}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 6px 16px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(0,0,0,0.1)";
              }}
            >
              <h2 style={{ margin: "0 0 10px 0" }}>{area.nombre}</h2>
              <p style={{ fontSize: "14px", textAlign: "center", margin: 0 }}>
                {area.id === 1
                  ? "Gestionar información de las areas comunes"
                  : area.id === 2
                  ? "Gestionar reservas de areas comunes"
                  : "Gestionar reportes de areas comunes"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Areas;

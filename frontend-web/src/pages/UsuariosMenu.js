import React from "react";
import { useNavigate } from "react-router-dom";
import "./GestionCrud.css";

const roleOptions = [
  {
    key: "adm",
    code: "ADM",
    label: "Administradores",
    description:
      "Cuentas con acceso completo al panel de gestión y todas las funciones críticas.",
  },
  {
    key: "man",
    code: "MAN",
    label: "Mantenimiento",
    description:
      "Usuarios orientados al seguimiento de incidencias y tareas técnicas del condominio.",
  },
  {
    key: "gua",
    code: "GUA",
    label: "Guardias",
    description:
      "Cuentas enfocadas en control de accesos, registro de visitas y monitorización diaria.",
  },
  {
    key: "res",
    code: "RES",
    label: "Residentes",
    description:
      "Accesos para los habitantes del condominio con visibilidad a sus servicios y pagos.",
  },
];

export default function UsuariosMenu() {
  const navigate = useNavigate();

  return (
    <div className="gestion-wrapper">
      <div className="gestion-card usuarios-menu-card">
        <div className="gestion-card-header">
          <div>
            <h1 className="gestion-card-title">Gestión de usuarios</h1>
            <p className="gestion-card-subtitle">
              Selecciona el grupo que deseas administrar para crear nuevas cuentas o
              revisar las existentes.
            </p>
          </div>
        </div>

        <div className="usuarios-menu-grid">
          {roleOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className="usuarios-menu-item"
              onClick={() => navigate(`/dashboard/usuarios/${option.key}`)}
            >
              <span className="usuarios-badge">{option.code}</span>
              <span className="usuarios-menu-item__title">{option.label}</span>
              <span className="usuarios-menu-item__description">
                {option.description}
              </span>
              <span className="usuarios-menu-item__cta">
                Administrar
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M7.5 4.5L13.5 10L7.5 15.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

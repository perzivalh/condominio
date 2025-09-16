import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "@mui/material";

const roles = [
  { key: "adm", label: "Administradores" },
  { key: "man", label: "Mantenimiento" },
  { key: "gua", label: "Guardias" },
  { key: "res", label: "Residentes" },
];

export default function UsuariosMenu() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 20 }}>
      <h2>Gestión de Usuarios</h2>
      <Card style={{ padding: 20, display: "flex", gap: "1rem" }}>
        {roles.map((rol) => (
          <Button
            key={rol.key}
            variant="contained"
            color="primary"
            onClick={() => navigate(`/dashboard/usuarios/${rol.key}`)}
          >
            {rol.label}
          </Button>
        ))}
      </Card>
    </div>
  );
}

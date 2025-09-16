import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axiosConfig";
import { Button, TextField, MenuItem } from "@mui/material";

const roleMap = {
  adm: { id: 1, name: "ADM" },
  man: { id: 2, name: "MAN" },
  gua: { id: 3, name: "GUA" },
  res: { id: 4, name: "RES" },
};

export default function UsuarioForm() {
  const { rol, id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    rol_id: roleMap[rol]?.id || null,
    residente_id: null,
  });
  const [residentes, setResidentes] = useState([]);

  // Cargar residentes solo si es RES
  useEffect(() => {
    if (rol === "res") {
      API.get("residentes/")
        .then((res) => setResidentes(res.data))
        .catch((err) => console.error(err));
    }
  }, [rol]);

  // Si estamos editando
  useEffect(() => {
    if (id) {
      API.get(`usuarios/${id}/`)
        .then((res) => {
          setFormData({
            username: res.data.username || "",
            password: "",
            email: res.data.email || "",
            rol_id: roleMap[rol]?.id || null,
            residente_id: res.data.residente?.id || null,
          });
        })
        .catch((err) => console.error(err));
    }
  }, [id, rol]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (id) {
        await API.put(`usuarios/${id}/`, formData);
      } else {
        await API.post("usuarios/", formData);
      }
      navigate(`/dashboard/usuarios/${rol}`);
    } catch (error) {
      console.error(error);
      alert("Error al guardar usuario");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>{id ? "Editar" : "Crear"} Usuario {roleMap[rol]?.name}</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 400 }}>
        <TextField
          label="Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required={!id}
        />
        {rol !== "res" && (
          <TextField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        )}
        {rol === "res" && (
          <TextField
            select
            label="Residente"
            name="residente_id"
            value={formData.residente_id || ""}
            onChange={handleChange}
            required
          >
            {residentes.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.nombres} {r.apellidos}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Button type="submit" variant="contained" color="primary">
          {id ? "Actualizar" : "Crear"}
        </Button>
      </form>
    </div>
  );
}

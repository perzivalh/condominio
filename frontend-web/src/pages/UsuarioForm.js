import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axiosConfig";
import { Button, TextField, MenuItem } from "@mui/material";

const roleNameMap = {
  adm: "ADM",
  man: "MAN",
  gua: "GUA",
  res: "RES",
};

export default function UsuarioForm() {
  const { rol, id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    rol_id: null,
    residente_id: null,
  });

  const [residentes, setResidentes] = useState([]);

  // cargar roles para mapear UUID
  useEffect(() => {
    API.get("roles/")
      .then((res) => {
        const roleName = roleNameMap[rol]; // ej: "ADM"
        const r = res.data.find((x) => x.nombre === roleName);
        if (r) {
          setFormData((fd) => ({ ...fd, rol_id: r.id }));
        }
        setLoadingRol(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingRol(false);
      });
  }, [rol]);

  // cargar residentes solo si es RES
  useEffect(() => {
    if (rol !== "res") {
      setResidenteSeleccionado(null);
    }
  }, [rol]);

  useEffect(() => {
    if (rol === "res") {
      API.get("residentes/", {
        params: { solo_disponibles: 1 },
      })
        .then((res) => {
          let disponibles = res.data;

          if (
            residenteSeleccionado &&
            !disponibles.some((r) => r.id === residenteSeleccionado.id)
          ) {
            disponibles = [...disponibles, residenteSeleccionado];
          }

          setResidentes(disponibles);
        })
        .catch((err) => console.error(err));
    }
  }, [rol, residenteSeleccionado]);

  // si estamos editando
  useEffect(() => {
    if (id) {
      API.get(`usuarios/${id}/`)
        .then((res) => {
            console.log("Roles disponibles:", res.data);
          setFormData({
            username: res.data.username_out || "",
            password: "",
            email: res.data.email || "",
            residente_id: res.data.residente?.id || null,
          }));

          if (rol === "res") {
            setResidenteSeleccionado(res.data.residente || null);
          }
        })
        .catch((err) => console.error(err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.rol_id) {
      alert("El rol todavía no se cargó. Intenta de nuevo.");
      return;
    }

    const payload = {
      username: formData.username,
      password: formData.password,
      rol_id: String(formData.rol_id), 
      estado: 1,
    };

    if (rol === "res") {
      if (!formData.residente_id) {
        alert("No hay residentes disponibles para asignar");
        return;
      }
      payload.residente_id = formData.residente_id;
    } else {
      payload.email_in = formData.email;
    }

    try {
      if (id) {
        await API.put(`usuarios/${id}/`, payload);
      } else {
        await API.post("usuarios/", payload);
      }
      navigate(`/dashboard/usuarios/${rol}`);
    } catch (error) {
      console.error(error.response?.data || error);
      alert("Error al guardar usuario");
    }
  };

  if (loadingRol) {
    return <p>Cargando rol...</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>{id ? "Editar" : "Crear"} Usuario {roleNameMap[rol]}</h2>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxWidth: 400,
        }}
      >
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
            helperText={
              residentes.length === 0
                ? "No hay residentes disponibles sin usuario asignado"
                : ""
            }
            disabled={residentes.length === 0}
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

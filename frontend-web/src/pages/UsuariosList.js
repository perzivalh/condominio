import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axiosConfig";
import {
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";

const roleMap = {
  adm: "ADM",
  man: "MAN",
  gua: "GUA",
  res: "RES",
};

export default function UsuariosList() {
  const { rol } = useParams();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);

  const cargarUsuarios = () => {
    API.get("usuarios/")
      .then((res) => {
        console.log("Respuesta usuarios:", res.data);
        const filtro = roleMap[rol];
        const arr = Array.isArray(res.data) ? res.data : [];
        const conRoles = arr.some(
          (u) => Array.isArray(u.roles) && u.roles.length
        );
        setUsuarios(
          conRoles ? arr.filter((u) => u.roles.includes(filtro)) : arr
        );
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    cargarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol]);

  const eliminarUsuario = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
    try {
      await API.delete(`usuarios/${id}/`);
      cargarUsuarios();
    } catch (error) {
      console.error(error.response?.data || error);
      alert("Error al eliminar usuario");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Usuarios {roleMap[rol]}</h2>
      <Button
        variant="contained"
        color="success"
        onClick={() => navigate(`/dashboard/usuarios/${rol}/crear`)}
        style={{ marginBottom: 20 }}
      >
        Crear Usuario
      </Button>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Username</TableCell>
            <TableCell>Email</TableCell>
            {rol === "res" && <TableCell>Nombre Residente</TableCell>}
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {usuarios.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.id}</TableCell>
              <TableCell>{u.username_out || "(sin username)"}</TableCell>
              <TableCell>{u.email || "—"}</TableCell>
              {rol === "res" && (
                <TableCell>
                  {u.residente
                    ? `${u.residente.nombres} ${u.residente.apellidos}`
                    : "—"}
                </TableCell>
              )}
              <TableCell>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => eliminarUsuario(u.id)}
                >
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

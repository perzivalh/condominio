import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axiosConfig";
import { Button, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";

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

  useEffect(() => {
    API.get("usuarios/")
      .then((res) => {
        console.log("Respuesta usuarios:", res.data);
        const filtro = roleMap[rol];
        setUsuarios(res.data.filter((u) => u.roles.includes(filtro)));
      })
      .catch((err) => console.error(err));
  }, [rol]);

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
              <TableCell>{u.username}</TableCell>
              <TableCell>{u.email}</TableCell>
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
                  onClick={() => navigate(`/dashboard/usuarios/${rol}/editar/${u.id}`)}
                >
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

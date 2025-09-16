import React, { useState, useEffect } from "react";
import API from "../api/axiosConfig";

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState("");
  const [roles, setRoles] = useState([]);
  const [residentes, setResidentes] = useState([]);
  const [residenteId, setResidenteId] = useState("");
  const [editId, setEditId] = useState(null);
  const [email, setEmail] = useState("");

  // cargar usuarios
  const cargarUsuarios = async () => {
    const res = await API.get("usuarios/");
    setUsuarios(res.data);
  };

  // cargar roles
  const cargarRoles = async () => {
    const res = await API.get("roles/");
    setRoles(res.data);
  };

  // cargar residentes sin usuario asignado
  const cargarResidentes = async () => {
    const res = await API.get("residentes/");
    const libres = res.data.filter((r) => !r.usuario); // solo residentes sin usuario
    setResidentes(libres);
  };

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return; // si no hay token, no intentes pedir nada

    cargarUsuarios();
    cargarRoles();
    cargarResidentes();
  }, []);

  // crear usuario
  const crearUsuario = async (e) => {
    e.preventDefault();
    await API.post("usuarios/", {
      username,
      password,
      email,
      estado: 1,
      rol_id: rolId,
      residente_id: residenteId || undefined,
    });

    cargarUsuarios();
    cargarResidentes();
    limpiarFormulario();
  };

  // editar usuario
  const editarUsuario = (usuario) => {
    setEditId(usuario.id);
    setUsername(usuario.username);
    setPassword("");
    setEmail(usuario.email || "");
    if (usuario.roles && usuario.roles.length > 0) {
      const rolNombre = usuario.roles[0];
      const rol = roles.find((r) => r.nombre === rolNombre);
      if (rol) setRolId(rol.id);
    }
    if (usuario.residente) {
      setResidenteId(usuario.residente.id || "");
    }
  };

  // guardar cambios en edición
  const guardarEdicion = async (e) => {
    e.preventDefault();
    await API.put(`usuarios/${editId}/`, {
      username,
      password: password || undefined,
      email,
      estado: 1,
      rol_id: rolId,
      residente_id: residenteId || undefined,
    });

    cargarUsuarios();
    cargarResidentes();
    limpiarFormulario();
  };

  // eliminar usuario
  const eliminarUsuario = async (id) => {
    await API.delete(`usuarios/${id}/`);
    cargarUsuarios();
    cargarResidentes();
  };

  // limpiar formulario
  const limpiarFormulario = () => {
    setEditId(null);
    setUsername("");
    setPassword("");
    setRolId("");
    setResidenteId("");
    setEmail("");
  };

  return (
    <div>
      <h2>Gestión de Usuarios</h2>

      <form onSubmit={editId ? guardarEdicion : crearUsuario}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder={editId ? "Nueva contraseña (opcional)" : "Contraseña"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!editId}
        />

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <select
          value={rolId}
          onChange={(e) => setRolId(e.target.value)}
          required
        >
          <option value="">Seleccione un rol</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>

        <select
          value={residenteId}
          onChange={(e) => setResidenteId(e.target.value)}
        >
          <option value="">(Opcional) Seleccione un residente</option>
          {residentes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombres} {r.apellidos} (CI: {r.ci}) - {r.correo}
            </option>
          ))}
        </select>

        <button type="submit">
          {editId ? "Guardar cambios" : "Crear Usuario"}
        </button>
        {editId && (
          <button type="button" onClick={limpiarFormulario}>
            Cancelar
          </button>
        )}
      </form>

      <ul>
        {usuarios.map((u) => (
          <li key={u.id}>
            <strong>{u.username}</strong>
            {" "} | Rol: {u.roles?.join(", ") || "Sin rol"}
            {" "} | Estado: {u.estado === 1 ? "Activo" : "Inactivo"}
            {" "} | Correo: {u.email || "No registrado"}
            {" "} | {u.residente
              ? `Residente: ${u.residente.nombres} ${u.residente.apellidos} (CI: ${u.residente.ci})`
              : "Sin residente"}
            <button onClick={() => editarUsuario(u)}>Editar</button>
            <button onClick={() => eliminarUsuario(u.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Usuarios;

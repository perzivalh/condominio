import React, { useState, useEffect } from "react";
import API from "../api/axiosConfig";

function Avisos() {
  const [avisos, setAvisos] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [editId, setEditId] = useState(null);

  const cargarAvisos = async () => {
    const res = await API.get("avisos/");
    setAvisos(res.data);
  };

  useEffect(() => {
    cargarAvisos();
  }, []);

  // Crear aviso
  const crearAviso = async (e) => {
    e.preventDefault();
    await API.post("avisos/", {
      titulo,
      contenido,
      estado: 1,
      visibilidad: 0, // 0 = todos
    });
    cargarAvisos();
    setTitulo("");
    setContenido("");
  };

  // Editar aviso
  const editarAviso = (a) => {
    setEditId(a.id);
    setTitulo(a.titulo);
    setContenido(a.contenido);
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    await API.put(`avisos/${editId}/`, {
      titulo,
      contenido,
      estado: 1,
      visibilidad: 0,
    });
    cargarAvisos();
    setEditId(null);
    setTitulo("");
    setContenido("");
  };

  // Eliminar aviso
  const eliminarAviso = async (id) => {
    await API.delete(`avisos/${id}/`);
    cargarAvisos();
  };

  return (
    <div>
      <h2>Gestión de Avisos</h2>

      <form onSubmit={editId ? guardarEdicion : crearAviso}>
        <input
          type="text"
          placeholder="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />
        <textarea
          placeholder="Contenido"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          required
        />
        <button type="submit">{editId ? "Guardar cambios" : "Crear Aviso"}</button>
        {editId && (
          <button type="button" onClick={() => setEditId(null)}>
            Cancelar
          </button>
        )}
      </form>

      <ul>
        {avisos.map((a) => (
          <li key={a.id}>
            <strong>{a.titulo}</strong> - {a.contenido}{" "}
            <button onClick={() => editarAviso(a)}>Editar</button>
            <button onClick={() => eliminarAviso(a.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Avisos;

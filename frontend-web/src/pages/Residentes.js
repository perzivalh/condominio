import React, { useState, useEffect } from "react";
import API from "../api/axiosConfig";

function Residentes() {
  const [residentes, setResidentes] = useState([]);
  const [viviendas, setViviendas] = useState([]);

  const [ci, setCi] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [viviendaId, setViviendaId] = useState("");

  const [editId, setEditId] = useState(null);

  // cargar residentes
  const cargarResidentes = async () => {
    const res = await API.get("residentes/");
    setResidentes(res.data);
  };

  // cargar viviendas
  const cargarViviendas = async () => {
    const res = await API.get("viviendas/");
    setViviendas(res.data);
  };

  useEffect(() => {
    cargarResidentes();
    cargarViviendas();
  }, []);

  // crear residente
  const crearResidente = async (e) => {
    e.preventDefault();
    await API.post("residentes/", {
      ci,
      nombres,
      apellidos,
      telefono,
      correo,
      estado: 1,
      vivienda_id: viviendaId || null,
    });
    cargarResidentes();
    limpiarFormulario();
  };

  // editar residente
  const editarResidente = (r) => {
    setEditId(r.id);
    setCi(r.ci);
    setNombres(r.nombres);
    setApellidos(r.apellidos);
    setTelefono(r.telefono || "");
    setCorreo(r.correo || "");
    setViviendaId(r.vivienda ? r.vivienda.id : "");
  };

  // guardar edición
  const guardarEdicion = async (e) => {
    e.preventDefault();
    await API.put(`residentes/${editId}/`, {
      ci,
      nombres,
      apellidos,
      telefono,
      correo,
      estado: 1,
      vivienda_id: viviendaId || null,
    });
    cargarResidentes();
    limpiarFormulario();
  };

  // eliminar residente
  const eliminarResidente = async (id) => {
    await API.delete(`residentes/${id}/`);
    cargarResidentes();
  };

  // limpiar formulario
  const limpiarFormulario = () => {
    setEditId(null);
    setCi("");
    setNombres("");
    setApellidos("");
    setTelefono("");
    setCorreo("");
    setViviendaId("");
  };

  return (
    <div>
      <h2>Gestión de Residentes</h2>

      <form onSubmit={editId ? guardarEdicion : crearResidente}>
        <input
          type="text"
          placeholder="CI"
          value={ci}
          onChange={(e) => setCi(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Nombres"
          value={nombres}
          onChange={(e) => setNombres(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Apellidos"
          value={apellidos}
          onChange={(e) => setApellidos(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <input
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />

        <select
          value={viviendaId}
          onChange={(e) => setViviendaId(e.target.value)}
        >
          <option value="">Seleccione una vivienda</option>
          {viviendas.map((v) => (
            <option key={v.id} value={v.id}>
              {v.codigo_unidad}
            </option>
          ))}
        </select>

        <button type="submit">
          {editId ? "Guardar cambios" : "Crear Residente"}
        </button>
        {editId && (
          <button type="button" onClick={limpiarFormulario}>
            Cancelar
          </button>
        )}
      </form>

      <ul>
        {residentes.map((r) => (
          <li key={r.id}>
            {r.nombres} {r.apellidos} - CI: {r.ci} | Tel: {r.telefono || "-"} |{" "}
            Correo: {r.correo || "-"} |{" "}
            {r.vivienda
              ? `Vivienda: ${r.vivienda.codigo_unidad}`
              : "Sin vivienda"}
            <button onClick={() => editarResidente(r)}>Editar</button>
            <button onClick={() => eliminarResidente(r.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Residentes;

import React, { useEffect, useState } from "react";
import API from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";

function Residentes() {
  const { user } = useAuth();
  const canManage = Array.isArray(user?.roles) && user.roles.includes("ADM");

  const [residentes, setResidentes] = useState([]);
  const [viviendas, setViviendas] = useState([]);

  const [ci, setCi] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [viviendaId, setViviendaId] = useState("");

  const [editId, setEditId] = useState(null);

  const cargarResidentes = async () => {
    const res = await API.get("residentes/");
    setResidentes(res.data);
  };

  const cargarViviendas = async () => {
    const res = await API.get("viviendas/");
    setViviendas(res.data);
  };

  useEffect(() => {
    cargarResidentes();
    cargarViviendas();
  }, []);

  const crearResidente = async (e) => {
    if (!canManage) {
      return;
    }
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

  const editarResidente = (r) => {
    if (!canManage) {
      return;
    }
    setEditId(r.id);
    setCi(r.ci);
    setNombres(r.nombres);
    setApellidos(r.apellidos);
    setTelefono(r.telefono || "");
    setCorreo(r.correo || "");
    setViviendaId(r.vivienda ? r.vivienda.id : "");
  };

  const guardarEdicion = async (e) => {
    if (!canManage) {
      return;
    }
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

  const eliminarResidente = async (id) => {
    if (!canManage) {
      return;
    }
    await API.delete(`residentes/${id}/`);
    cargarResidentes();
  };

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
      <h2>Gestion de Residentes</h2>

      {canManage ? (
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
            placeholder="Telefono"
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
      ) : (
        <p style={{ color: "#555" }}>
          El rol actual tiene acceso de solo lectura en este modulo.
        </p>
      )}

      <ul>
        {residentes.map((r) => (
          <li key={r.id}>
            {r.nombres} {r.apellidos} - CI: {r.ci} | Tel: {r.telefono || "-"} | Correo: {r.correo || "-"}{" "}
            {r.vivienda ? `| Vivienda: ${r.vivienda.codigo_unidad}` : ""}
            {canManage && (
              <>
                <button onClick={() => editarResidente(r)}>Editar</button>
                <button onClick={() => eliminarResidente(r.id)}>Eliminar</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Residentes;

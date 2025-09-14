import React, { useState, useEffect } from "react";
import API from "../api/axiosConfig";

function Viviendas() {
  const [viviendas, setViviendas] = useState([]);
  const [condominios, setCondominios] = useState([]);
  const [condominioId, setCondominioId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [bloque, setBloque] = useState("");
  const [numero, setNumero] = useState("");
  const [editId, setEditId] = useState(null);

  // Cargar viviendas
  const cargarViviendas = async () => {
    const res = await API.get("viviendas/");
    setViviendas(res.data);
  };

  // Cargar condominios para el select
  const cargarCondominios = async () => {
    const res = await API.get("condominios/");
    setCondominios(res.data);
  };

  useEffect(() => {
    cargarViviendas();
    cargarCondominios();
  }, []);

  // Crear vivienda
  const crearVivienda = async (e) => {
    e.preventDefault();
    await API.post("viviendas/", {
      codigo_unidad: codigo,
      bloque,
      numero,
      estado: 1,
      condominio: condominioId, // 👈 ID elegido en el select
    });
    cargarViviendas();
    setCodigo("");
    setBloque("");
    setNumero("");
    setCondominioId("");
  };

  // Editar vivienda
  const editarVivienda = (v) => {
    setEditId(v.id);
    setCodigo(v.codigo_unidad);
    setBloque(v.bloque);
    setNumero(v.numero);
    setCondominioId(v.condominio); // ⚠️ depende de cómo DRF serialice (puede ser objeto o ID)
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    await API.put(`viviendas/${editId}/`, {
      codigo_unidad: codigo,
      bloque,
      numero,
      estado: 1,
      condominio: condominioId,
    });
    cargarViviendas();
    setEditId(null);
    setCodigo("");
    setBloque("");
    setNumero("");
    setCondominioId("");
  };

  // Eliminar vivienda
  const eliminarVivienda = async (id) => {
    await API.delete(`viviendas/${id}/`);
    cargarViviendas();
  };

  return (
    <div>
      <h2>Gestión de Viviendas</h2>

      <form onSubmit={editId ? guardarEdicion : crearVivienda}>
        <select
          value={condominioId}
          onChange={(e) => setCondominioId(e.target.value)}
          required
        >
          <option value="">Seleccione un condominio</option>
          {condominios.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Código unidad"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Bloque"
          value={bloque}
          onChange={(e) => setBloque(e.target.value)}
        />
        <input
          type="text"
          placeholder="Número"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />

        <button type="submit">
          {editId ? "Guardar cambios" : "Crear Vivienda"}
        </button>
        {editId && (
          <button type="button" onClick={() => setEditId(null)}>
            Cancelar
          </button>
        )}
      </form>

      <ul>
        {viviendas.map((v) => (
          <li key={v.id}>
            {v.codigo_unidad} - Bloque {v.bloque}, Nro {v.numero}{" "}
            <button onClick={() => editarVivienda(v)}>Editar</button>
            <button onClick={() => eliminarVivienda(v.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Viviendas;

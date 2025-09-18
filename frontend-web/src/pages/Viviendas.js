import React, { useEffect, useState } from "react";
import API from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";

function Viviendas() {
  const { user } = useAuth();
  const canManage = Array.isArray(user?.roles) && user.roles.includes("ADM");

  const [viviendas, setViviendas] = useState([]);
  const [condominios, setCondominios] = useState([]);
  const [condominioId, setCondominioId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [bloque, setBloque] = useState("");
  const [numero, setNumero] = useState("");
  const [editId, setEditId] = useState(null);

  const cargarViviendas = async () => {
    const res = await API.get("viviendas/");
    setViviendas(res.data);
  };

  const cargarCondominios = async () => {
    const res = await API.get("condominios/");
    setCondominios(res.data);
  };

  useEffect(() => {
    cargarViviendas();
    cargarCondominios();
  }, []);

  const crearVivienda = async (e) => {
    if (!canManage) {
      return;
    }
    e.preventDefault();
    await API.post("viviendas/", {
      codigo_unidad: codigo,
      bloque,
      numero,
      estado: 1,
      condominio: condominioId,
    });
    cargarViviendas();
    setCodigo("");
    setBloque("");
    setNumero("");
    setCondominioId("");
  };

  const editarVivienda = (v) => {
    if (!canManage) {
      return;
    }
    setEditId(v.id);
    setCodigo(v.codigo_unidad);
    setBloque(v.bloque);
    setNumero(v.numero);
    setCondominioId(v.condominio);
  };

  const guardarEdicion = async (e) => {
    if (!canManage) {
      return;
    }
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

  const eliminarVivienda = async (id) => {
    if (!canManage) {
      return;
    }
    await API.delete(`viviendas/${id}/`);
    cargarViviendas();
  };

  const limpiarFormulario = () => {
    setEditId(null);
    setCodigo("");
    setBloque("");
    setNumero("");
    setCondominioId("");
  };

  return (
    <div>
      <h2>Gestion de Viviendas</h2>

      {canManage ? (
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
            placeholder="Codigo unidad"
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
            placeholder="Numero"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
          />

          <button type="submit">
            {editId ? "Guardar cambios" : "Crear Vivienda"}
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
        {viviendas.map((v) => (
          <li key={v.id}>
            {v.codigo_unidad} - Bloque {v.bloque}, Nro {v.numero}{" "}
            {canManage && (
              <>
                <button onClick={() => editarVivienda(v)}>Editar</button>
                <button onClick={() => eliminarVivienda(v.id)}>Eliminar</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Viviendas;

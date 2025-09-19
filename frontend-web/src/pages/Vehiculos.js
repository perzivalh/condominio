import React, { useEffect, useState } from "react";
import API from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";

function Vehiculos() {
  const { user } = useAuth();
  const canManage = Array.isArray(user?.roles) && user.roles.includes("ADM");

  const [vehiculos, setVehiculos] = useState([]);
  const [residentes, setResidentes] = useState([]);
  const [residenteId, setResidenteId] = useState("");
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [color, setColor] = useState("");
  const [editId, setEditId] = useState(null);

  const cargarVehiculos = async () => {
    const res = await API.get("vehiculos/");
    setVehiculos(res.data);
  };

  const cargarResidentes = async () => {
    const res = await API.get("residentes/");
    setResidentes(res.data);
  };

  useEffect(() => {
    cargarVehiculos();
    cargarResidentes();
  }, []);

  const crearVehiculo = async (e) => {
    if (!canManage) {
      return;
    }
    e.preventDefault();
    await API.post("vehiculos/", {
      placa,
      marca,
      modelo,
      color,
      estado: 1,
      residente_id: residenteId,
    });
    cargarVehiculos();
    setPlaca("");
    setMarca("");
    setModelo("");
    setColor("");
    setResidenteId("");
  };

  const editarVehiculo = (v) => {
    if (!canManage) {
      return;
    }
    setEditId(v.id);
    setPlaca(v.placa);
    setMarca(v.marca);
    setModelo(v.modelo);
    setColor(v.color);
    setResidenteId(v.residente ? v.residente.id : "");
  };

  const guardarEdicion = async (e) => {
    if (!canManage) {
      return;
    }
    e.preventDefault();
    await API.put(`vehiculos/${editId}/`, {
      placa,
      marca,
      modelo,
      color,
      estado: 1,
      residente_id: residenteId,
    });
    cargarVehiculos();
    setEditId(null);
    setPlaca("");
    setMarca("");
    setModelo("");
    setColor("");
    setResidenteId("");
  };

  const eliminarVehiculo = async (id) => {
    if (!canManage) {
      return;
    }
    await API.delete(`vehiculos/${id}/`);
    cargarVehiculos();
  };

  return (
    <div>
      <h2>Gestion de Vehiculos</h2>

      {canManage ? (
        <form onSubmit={editId ? guardarEdicion : crearVehiculo}>
          <select
            value={residenteId}
            onChange={(e) => setResidenteId(e.target.value)}
            required
          >
            <option value="">Seleccione un residente</option>
            {residentes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombres} {r.apellidos}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Placa"
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Marca"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
          />
          <input
            type="text"
            placeholder="Modelo"
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
          />
          <input
            type="text"
            placeholder="Color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />

          <button type="submit">
            {editId ? "Guardar cambios" : "Crear Vehiculo"}
          </button>
          {editId && (
            <button type="button" onClick={() => setEditId(null)}>
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
        {vehiculos.map((v) => (
          <li key={v.id}>
            {v.placa} - {v.marca} {v.modelo} ({v.color || "sin color"}){" "}
            {canManage && (
              <>
                <button onClick={() => editarVehiculo(v)}>Editar</button>
                <button onClick={() => eliminarVehiculo(v.id)}>Eliminar</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Vehiculos;

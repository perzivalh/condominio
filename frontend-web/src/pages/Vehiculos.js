import React, { useState, useEffect } from "react";
import API from "../api/axiosConfig";

function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [residentes, setResidentes] = useState([]);
  const [residenteId, setResidenteId] = useState("");
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [color, setColor] = useState("");
  const [editId, setEditId] = useState(null);

  // Cargar vehículos
  const cargarVehiculos = async () => {
    const res = await API.get("vehiculos/");
    setVehiculos(res.data);
  };

  // Cargar residentes para el select
  const cargarResidentes = async () => {
    const res = await API.get("residentes/");
    setResidentes(res.data);
  };

  useEffect(() => {
    cargarVehiculos();
    cargarResidentes();
  }, []);

  // Crear vehículo
  const crearVehiculo = async (e) => {
    e.preventDefault();
    await API.post("vehiculos/", {
      placa,
      marca,
      modelo,
      color,
      estado: 1,
      residente_id: residenteId, // 👈 se asigna al residente elegido
    });
    cargarVehiculos();
    setPlaca("");
    setMarca("");
    setModelo("");
    setColor("");
    setResidenteId("");
  };

  // Editar vehículo
  const editarVehiculo = (v) => {
    setEditId(v.id);
    setPlaca(v.placa);
    setMarca(v.marca);
    setModelo(v.modelo);
    setColor(v.color);
    setResidenteId(v.residente); // ⚠️ depende de si DRF devuelve ID o objeto
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    await API.put(`vehiculos/${editId}/`, {
      placa,
      marca,
      modelo,
      color,
      estado: 1,
      residente_id: residenteId, // 👈 se asigna al residente elegido
    });
    cargarVehiculos();
    setEditId(null);
    setPlaca("");
    setMarca("");
    setModelo("");
    setColor("");
    setResidenteId("");
  };

  // Eliminar vehículo
  const eliminarVehiculo = async (id) => {
    await API.delete(`vehiculos/${id}/`);
    cargarVehiculos();
  };

  return (
    <div>
      <h2>Gestión de Vehículos</h2>

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
          {editId ? "Guardar cambios" : "Crear Vehículo"}
        </button>
        {editId && (
          <button type="button" onClick={() => setEditId(null)}>
            Cancelar
          </button>
        )}
      </form>

      <ul>
        {vehiculos.map((v) => (
          <li key={v.id}>
            {v.placa} - {v.marca} {v.modelo} ({v.color}){" "}
            <button onClick={() => editarVehiculo(v)}>Editar</button>
            <button onClick={() => eliminarVehiculo(v.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Vehiculos;

import React from "react";
import { Link, Outlet } from "react-router-dom";

function Dashboard({ onLogout }) {
  return (
    <div>
      <h2>Panel de Administración</h2>
      <nav>
        <Link to="/dashboard/usuarios">Usuarios</Link> |{" "}
        <Link to="/dashboard/viviendas">Viviendas</Link> |{" "}
        <Link to="/dashboard/residentes">Residentes</Link> |{" "}
        <Link to="/dashboard/vehiculos">Vehículos</Link> |{" "}
        <Link to="/dashboard/avisos">Avisos</Link> |{" "}
        <button onClick={onLogout}>Cerrar sesión</button>
      </nav>


      <div style={{ marginTop: "20px" }}>
        {/* Aquí se renderizan las sub-rutas */}
        <Outlet />
      </div>
    </div>
  );
}

export default Dashboard;

import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import API from "./api/axiosConfig";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Viviendas from "./pages/Viviendas";
import Residentes from "./pages/Residentes";
import Vehiculos from "./pages/Vehiculos";
import Avisos from "./pages/Avisos";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UsuariosMenu from "./pages/UsuariosMenu";
import UsuariosList from "./pages/UsuariosList";
import UsuarioForm from "./pages/UsuarioForm";


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      API.get("perfil/", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(() => setIsLoggedIn(true))
        .catch(() => {
          localStorage.removeItem("token");
          setIsLoggedIn(false);
        });
    }
  }, []);

  return (
    <Routes>
  <Route
    path="/login"
    element={
      isLoggedIn ? (
        <Navigate to="/dashboard" />
      ) : (
        <Login onLogin={() => setIsLoggedIn(true)} />
      )
    }
  />

  <Route
    path="/dashboard/*"
    element={
      isLoggedIn ? (
        <Dashboard
          onLogout={() => {
            localStorage.removeItem("token");
            setIsLoggedIn(false);
          }}
        />
      ) : (
        <Navigate to="/login" />
      )
    }
  >
    <Route path="usuarios" element={<Usuarios />} />
    <Route path="usuarios" element={<UsuariosMenu />} />
    <Route path="usuarios/:rol" element={<UsuariosList />} />
    <Route path="usuarios/:rol/crear" element={<UsuarioForm />} />
    <Route path="usuarios/:rol/editar/:id" element={<UsuarioForm />} />
    <Route path="viviendas" element={<Viviendas />} />
    <Route path="residentes" element={<Residentes />} />
    <Route path="vehiculos" element={<Vehiculos />} />
    <Route path="avisos" element={<Avisos />} />
  </Route>

  {/* 👇 Rutas sueltas para recuperar contraseña */}
  <Route path="/forgot-password" element={<ForgotPassword />} />
  <Route path="/reset-password" element={<ResetPassword />} />

  <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />} />
</Routes>

  );
}

export default App;

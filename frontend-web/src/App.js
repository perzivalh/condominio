import React, { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import API from "./api/axiosConfig";

import { AuthContext } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Viviendas from "./pages/Viviendas";
import Residentes from "./pages/Residentes";
import Vehiculos from "./pages/Vehiculos";
import Avisos from "./pages/Avisos";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UsuariosMenu from "./pages/UsuariosMenu";
import UsuariosList from "./pages/UsuariosList";
import Areas from "./pages/Areas";
import Finanzas from "./pages/Finanzas";
import Seguridad from "./pages/Seguridad";
import VisitasAccesos from "./pages/VisitasAccesos";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("access");
    if (!token) {
      setIsLoggedIn(false);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await API.get("perfil/");
      setUser(response.data);
      setIsLoggedIn(true);
    } catch (error) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      setIsLoggedIn(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return <div>Cargando panel...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, refreshProfile: fetchProfile }}>
      <Routes>
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/dashboard" />
            ) : (
              <Login
                onLogin={(profile) => {
                  setUser(profile);
                  setIsLoggedIn(true);
                }}
              />
            )
          }
        />

        <Route
          path="/dashboard/*"
          element={
            isLoggedIn ? (
              <Dashboard
                user={user}
                onLogout={() => {
                  localStorage.removeItem("access");
                  localStorage.removeItem("refresh");
                  setUser(null);
                  setIsLoggedIn(false);
                }}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        >
          <Route path="usuarios" element={<UsuariosMenu />} />
          <Route path="usuarios/:rol" element={<UsuariosList />} />

          <Route path="viviendas" element={<Viviendas />} />
          <Route path="residentes" element={<Residentes />} />
          <Route path="vehiculos" element={<Vehiculos />} />
          <Route path="avisos" element={<Avisos />} />
          <Route path="areas" element={<Areas />} />
          <Route path="finanzas" element={<Finanzas />} />
          <Route path="seguridad" element={<Seguridad />} />
          <Route path="visitas-accesos" element={<VisitasAccesos />} />
        </Route>

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;

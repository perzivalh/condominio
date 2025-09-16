import React, { useState } from "react";
import { useNavigate } from "react-router-dom";  // 👈 para redirigir
import API from "../api/axiosConfig";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("token/", { username, password });

      // 👉 guardamos tokens
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);

      if (onLogin) {
        onLogin(); // si tenés estado global de autenticación
      }

      // 👉 redirige directo al dashboard (usuarios)
      navigate("/dashboard/usuarios");
    } catch (err) {
      setError("Credenciales inválidas");
    }
  };

  return (
    <div>
      <h2>Login Administrador</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Ingresar</button>
        <p>
          <a href="/forgot-password">¿Olvidaste tu contraseña?</a>
        </p>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default Login;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axiosConfig";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const tokenResponse = await API.post("token/", { username, password });

      localStorage.setItem("access", tokenResponse.data.access);
      localStorage.setItem("refresh", tokenResponse.data.refresh);

      const profileResponse = await API.get("perfil/");

      if (onLogin) {
        onLogin(profileResponse.data);
      }

      navigate("/dashboard");
    } catch (err) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      setError("Credenciales invalidas");
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
          placeholder="Contrasena"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Ingresar</button>
        <p>
          <a href="/forgot-password">Olvidaste tu contrasena?</a>
        </p>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default Login;

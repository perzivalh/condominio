import React, { useState } from "react";
import API from "../api/axiosConfig";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");  // usamos username porque Django espera eso
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("token/", { username, password });
      localStorage.setItem("token", res.data.access);

      onLogin();
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
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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

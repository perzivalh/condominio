import React, { useState } from "react";
import API from "../api/axiosConfig";

function ResetPassword() {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("reset-password/", { token, new_password: newPassword });
      setMessage("Contraseña restablecida con éxito, ya puedes iniciar sesión.");
    } catch (err) {
      setMessage("Error al restablecer contraseña.");
    }
  };

  return (
    <div>
      <h2>Restablecer Contraseña</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Token recibido"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button type="submit">Restablecer</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default ResetPassword;

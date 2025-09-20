import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import API from "../api/axiosConfig";
import "./Login.css";

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState({ type: null, message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get("token");
    const emailParam = params.get("email");
    if (tokenParam) {
      setToken(tokenParam);
    }
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: null, message: "" });

    if (newPassword !== confirmPassword) {
      setStatus({
        type: "error",
        message: "La nueva contraseña y la confirmación deben coincidir.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await API.post("reset-password/", {
        correo: email.trim(),
        token: token.trim(),
        nueva_password: newPassword,
      });
      setStatus({
        type: "success",
        message: "Contraseña restablecida. Ya puedes iniciar sesión.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const message =
        error.response?.data?.error ||
        "No se pudo actualizar la contraseña. Intenta nuevamente.";
      setStatus({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const messageClass =
    status.type === "success"
      ? "auth-message auth-message--success"
      : "auth-message auth-message--error";

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <h1>Restablecer contraseña</h1>
          <p>Completa los datos para definir tu nueva contraseña</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="login-field">
            <label htmlFor="token">Token de recuperación</label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Código recibido"
              required
            />
          </div>
          <div className="login-field">
            <label htmlFor="new-password">Nueva contraseña</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Contraseña segura"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="login-field">
            <label htmlFor="confirm-password">Confirmar contraseña</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {status.message && <p className={messageClass}>{status.message}</p>}
          <button type="submit" className="login-submit" disabled={isSubmitting}>
            {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>
        <div className="login-footer">
          <Link to="/forgot-password">¿Necesitas solicitar un nuevo token?</Link>
        </div>
        <div className="login-footer">
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;

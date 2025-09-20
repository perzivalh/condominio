import React, { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axiosConfig";
import "./Login.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: null, message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: null, message: "" });
    setIsSubmitting(true);

    try {
      const response = await API.post("recuperar-password/", { correo: email.trim() });
      const message =
        response?.data?.mensaje ||
        "Si el correo está registrado, recibirás un enlace con instrucciones.";
      setStatus({ type: "success", message });
    } catch (error) {
      const message =
        error.response?.data?.error ||
        "No pudimos procesar la solicitud. Inténtalo nuevamente.";
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
          <h1>Recuperar acceso</h1>
          <p>Ingresa el correo que usas para iniciar sesión</p>
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
          {status.message && <p className={messageClass}>{status.message}</p>}
          <button type="submit" className="login-submit" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar instrucciones"}
          </button>
        </form>
        <div className="login-footer">
          <Link to="/reset-password">¿Ya tienes un token? Restablecer contraseña</Link>
        </div>
        <div className="login-footer">
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;

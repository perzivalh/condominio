import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import HolidayVillageOutlinedIcon from "@mui/icons-material/HolidayVillageOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";

const MODULES = [
  { id: "usuarios", label: "Usuarios", roles: ["ADM"], Icon: PersonOutlineOutlinedIcon },
  { id: "viviendas", label: "Viviendas", roles: ["ADM", "GUA"], Icon: HomeOutlinedIcon },
  { id: "residentes", label: "Residentes", roles: ["ADM", "GUA"], Icon: KeyOutlinedIcon },
  { id: "vehiculos", label: "Vehiculos", roles: ["ADM", "GUA"], Icon: DirectionsCarOutlinedIcon },
  { id: "avisos", label: "Avisos", roles: ["ADM"], Icon: MailOutlineOutlinedIcon },
  { id: "areas", label: "Areas", roles: ["ADM"], Icon: HolidayVillageOutlinedIcon },
  { id: "visitas-accesos", label: "Visitas Accesos", roles: ["ADM", "GUA"], Icon: GroupsOutlinedIcon },
  { id: "mantenimiento", label: "Mantenimiento", roles: ["ADM", "MAN"], Icon: BuildOutlinedIcon },
  { id: "finanzas", label: "Finanzas", roles: ["ADM"], Icon: PaymentsOutlinedIcon },
  { id: "seguridad", label: "Seguridad", roles: ["ADM", "GUA"], Icon: SecurityOutlinedIcon },
];

function Dashboard({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const roleList = useMemo(
    () => (Array.isArray(user?.roles) ? user.roles : []),
    [user]
  );

  const availableModules = useMemo(
    () =>
      MODULES.filter((module) => {
        if (!module.roles || module.roles.length === 0) {
          return true;
        }
        return module.roles.some((role) => roleList.includes(role));
      }),
    [roleList]
  );

  useEffect(() => {
    if (!availableModules.length) {
      return;
    }
    const segments = location.pathname.split("/");
    const currentSection = segments[2] || "";
    const isAllowed = availableModules.some((module) => module.id === currentSection);

    if (!currentSection || !isAllowed) {
      navigate(`/dashboard/${availableModules[0].id}`, { replace: true });
    }
  }, [availableModules, location.pathname, navigate]);

  const activeModuleId = location.pathname.split("/")[2] || "";

  const handleModuleClick = (moduleId) => {
    navigate(`/dashboard/${moduleId}`);
  };

  if (!availableModules.length) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
        <aside
          style={{
            width: collapsed ? "72px" : "260px",
            backgroundColor: "#101820",
            color: "#fff",
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            transition: "width 0.25s ease",
          }}
        >
          <div>
            <button
              onClick={() => setCollapsed((prev) => !prev)}
              style={{
                background: "transparent",
                border: "1px solid #2a343d",
                borderRadius: "50%",
                color: "#fff",
                width: "36px",
                height: "36px",
                cursor: "pointer",
              }}
            >
              {collapsed ? ">" : "<"}
            </button>
          </div>
          <button
            onClick={onLogout}
            style={{
              marginTop: "auto",
              background: "#2a343d",
              border: "none",
              borderRadius: "20px",
              color: "#fff",
              padding: "12px",
              cursor: "pointer",
            }}
          >
            Cerrar sesion
          </button>
        </aside>
        <main style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div
            style={{
              background: "#fff",
              padding: "32px",
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Sin modulos asignados</h2>
            <p>No hay modulos disponibles para los roles del usuario actual.</p>
            <button
              onClick={onLogout}
              style={{
                marginTop: "16px",
                background: "#101820",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "10px 18px",
                cursor: "pointer",
              }}
            >
              Volver a iniciar sesion
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
      <aside
        style={{
          width: collapsed ? "72px" : "260px",
          backgroundColor: "#101820",
          color: "#fff",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.25s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            marginBottom: "32px",
          }}
        >
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 600, fontSize: "18px", letterSpacing: "2px" }}>
                Panel
              </div>
              <div style={{ fontSize: "12px", color: "#90a4ae" }}>
                {user?.username_out || user?.email || ""}
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            style={{
              background: "transparent",
              border: "1px solid #2a343d",
              borderRadius: "50%",
              color: "#fff",
              width: "36px",
              height: "36px",
              cursor: "pointer",
            }}
            aria-label={collapsed ? "Expandir panel" : "Colapsar panel"}
          >
            {collapsed ? ">" : "<"}
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {availableModules.map((module) => {
            const isActive = activeModuleId === module.id;
            return (
              <button
                key={module.id}
                onClick={() => handleModuleClick(module.id)}
                style={{
                  background: isActive ? "#4a545d" : "#3a3f44",
                  color: "#fff",
                  border: "none",
                  borderRadius: "999px",
                  padding: collapsed ? "12px" : "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: collapsed ? "0" : "12px",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                  fontSize: collapsed ? "16px" : "15px",
                  letterSpacing: collapsed ? "1px" : "normal",
                }}
              >
                <module.Icon
                  fontSize="small"
                  aria-hidden="true"
                  style={{
                    fontSize: collapsed ? "22px" : "20px",
                  }}
                />
                {!collapsed && <span>{module.label}</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {!collapsed && (
            <div style={{ fontSize: "12px", color: "#90a4ae" }}>
              Rol: {roleList.join(", ") || "Sin rol"}
            </div>
          )}
          <button
            onClick={onLogout}
            style={{
              background: "#2a343d",
              border: "none",
              borderRadius: "999px",
              color: "#fff",
              padding: "12px",
              cursor: "pointer",
            }}
          >
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          background: "#f5f6fa",
          color: "#0f172a",
          overflow: "auto",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            padding: "32px",
            minHeight: "100vh",
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;

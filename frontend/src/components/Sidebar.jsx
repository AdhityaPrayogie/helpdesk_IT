// frontend/src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  FilePlus2,
  ClipboardList,
  BarChart3,
  Settings,
  Users,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const menu = [
    { to: "/", label: "Dashboard", icon: Home, end: true },
    { to: "/input", label: "Input Helpdesk", icon: FilePlus2 },
    { to: "/data", label: "Data Logbook", icon: ClipboardList },
    { to: "/performa-staff", label: "Performa Staff", icon: BarChart3 },
    ...(isSuperAdmin
      ? [
          { to: "/master-data", label: "Master Data", icon: Settings },
          { to: "/kelola-pengguna", label: "Kelola Pengguna", icon: Users },
        ]
      : []),
  ];

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <button
        className="sidebar-hamburger"
        onClick={() => setIsOpen(true)}
        aria-label="Buka menu"
      >
        <span className="hamburger-icon-wrap">
          <Menu size={20} className="icon-menu" />
        </span>
      </button>

      {isOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">IT</div>
          <div>
            <div className="brand-title">Logbook</div>
            <div className="brand-subtitle">Helpdesk System</div>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup menu"
          >
            <span className="hamburger-icon-wrap icon-close-wrap">
              <X size={18} />
            </span>
          </button>
        </div>

        <nav className="sidebar-nav">
          {menu.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
                style={{ animationDelay: `${index * 0.06}s` }}
                onClick={() => setIsOpen(false)}
              >
                <span className="nav-icon">
                  <Icon size={16} strokeWidth={2.25} />
                </span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div
          className="sidebar-user"
          style={{ animationDelay: `${menu.length * 0.06 + 0.1}s` }}
        >
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.nama}</span>
            <small className="sidebar-user-role">
              {isSuperAdmin ? "Super Admin" : "User"}
            </small>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={14} />
            Logout
          </button>
        </div>

        <div
          className="sidebar-footer"
          style={{ animationDelay: `${menu.length * 0.06 + 0.16}s` }}
        >
          <span>v1.0</span>
        </div>
      </aside>
    </>
  );
}

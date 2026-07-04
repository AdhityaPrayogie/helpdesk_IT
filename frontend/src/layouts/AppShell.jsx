// frontend/src/layouts/AppShell.jsx
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Outlet />
      </div>
    </div>
  );
}

export default AppShell;

// frontend/src/layouts/AppShell.jsx
import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Suspense fallback={<div className="loading-screen">Memuat...</div>}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}

export default AppShell;

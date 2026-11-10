// frontend/src/App.jsx
import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AppShell from "./layouts/AppShell";
import { ProtectedRoute, SuperAdminRoute } from "./components/ProtectedRoute";
import { ToastProvider } from "./components/Toast";
import ThemeSwitcher from "./components/ThemeSwitcher";

// Halaman dimuat saat dibuka (recharts hanya ikut ke dashboard, bukan ke login).
// Suspense-nya ada di AppShell supaya sidebar tetap tampil.
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const InputPage = lazy(() => import("./pages/InputPage"));
const DataPage = lazy(() => import("./pages/DataPage"));
const StaffPerformanceDashboard = lazy(
  () => import("./components/StaffPerformanceDashboard"),
);
const TrendHelpdeskPage = lazy(() => import("./pages/TrendHelpdeskPage"));
const MasterDataPage = lazy(() => import("./components/MasterDataPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));

function App() {
  return (
    <ToastProvider>
      <ThemeSwitcher />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/input" element={<InputPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route
              path="/performa-staff"
              element={<StaffPerformanceDashboard />}
            />
            <Route path="/trend-helpdesk" element={<TrendHelpdeskPage />} />

            <Route element={<SuperAdminRoute />}>
              <Route path="/master-data" element={<MasterDataPage />} />
              <Route path="/kelola-pengguna" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </ToastProvider>
  );
}

export default App;

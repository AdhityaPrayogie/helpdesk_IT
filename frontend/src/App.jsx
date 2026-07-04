// frontend/src/App.jsx
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AppShell from "./layouts/AppShell";
import DashboardPage from "./pages/DashboardPage";
import InputPage from "./pages/InputPage";
import DataPage from "./pages/DataPage";
import StaffPerformanceDashboard from "./components/StaffPerformanceDashboard";
import MasterDataPage from "./components/MasterDataPage";
import UsersPage from "./pages/UsersPage";
import { ProtectedRoute, SuperAdminRoute } from "./components/ProtectedRoute";
import { ToastProvider } from "./components/Toast";
// import "./App.css";
import ThemeSwitcher from "./components/ThemeSwitcher";

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

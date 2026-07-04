import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function SuperAdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "super_admin") return <Navigate to="/" replace />;
  return <Outlet />;
}

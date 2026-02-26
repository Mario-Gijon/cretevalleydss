// private/admin/AdminRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../../../context/auth/auth.context"; // ajusta si hace falta

export default function AdminRoute({ children }) {
  const { value, loading } = useAuthContext();

  if (loading) return null;

  const isAdmin = value?.role === "admin" || value?.isAdmin === true;
  return isAdmin ? children : <Navigate to="/dashboard/active" replace />;
}
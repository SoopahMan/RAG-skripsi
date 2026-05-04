import { Navigate, Outlet } from "react-router-dom";
import { useRBAC } from "../../services/useRBAC";

export default function RequireAuth({ allowedRoles }) {
  const { user, hasPermission } = useRBAC();

  if (!user) return <Navigate to="/login" replace />;
  if (user.expired) return <Navigate to="/login" replace />;


  return <Outlet />;
}
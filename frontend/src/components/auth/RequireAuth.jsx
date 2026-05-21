import { Navigate, Outlet } from "react-router-dom";
import { useRBAC } from "../../services/useRBAC";

export default function RequireAuth({ allowedRoles }) {
  const { user, loading, hasPermission } = useRBAC();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.expired) return <Navigate to="/login" replace />;
  if (allowedRoles && allowedRoles.length > 0 && !hasPermission(allowedRoles)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}


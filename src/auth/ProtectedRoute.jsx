import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Guards: redirect to /login if not authenticated
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// Guards: redirect to dashboard if authenticated user doesn't have required role
export const RoleRoute = ({ allowedRoles }) => {
  const { user } = useAuth();
  return allowedRoles.includes(user?.role)
    ? <Outlet />
    : <Navigate to="/" replace />;
};

export default ProtectedRoute;
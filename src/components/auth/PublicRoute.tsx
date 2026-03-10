import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/stream" replace />;
  return <>{children}</>;
};

export default PublicRoute;

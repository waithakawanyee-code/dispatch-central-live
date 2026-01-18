import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('ADMIN' | 'DISPATCHER' | 'WASHER' | 'USER')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, isWasher } = useProfile();
  const location = useLocation();

  const loading = authLoading || (user && profileLoading);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user is a WASHER and trying to access a non-washer page, redirect to washer dashboard
  // Exception: allow access to washer-dashboard itself
  if (isWasher && location.pathname !== '/washer' && !allowedRoles?.includes('WASHER')) {
    return <Navigate to="/washer" replace />;
  }

  // Check role restrictions if specified
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect based on role
    if (isWasher) {
      return <Navigate to="/washer" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

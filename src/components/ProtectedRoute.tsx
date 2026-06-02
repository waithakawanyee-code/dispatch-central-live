import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('ADMIN' | 'DISPATCHER' | 'WASHER' | 'USER' | 'DRIVER')[];
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
    const loginPath = allowedRoles?.length === 1 && allowedRoles[0] === 'DRIVER' ? '/tablet' : '/auth';
    return <Navigate to={loginPath} replace />;
  }

  const isDriver = profile?.role === 'DRIVER';

  // Drivers are confined to /portal
  if (isDriver && location.pathname !== '/portal' && !allowedRoles?.includes('DRIVER')) {
    return <Navigate to="/portal" replace />;
  }

  // If user is a WASHER and trying to access a non-washer page, redirect to washer dashboard
  if (isWasher && location.pathname !== '/washer' && !allowedRoles?.includes('WASHER')) {
    return <Navigate to="/washer" replace />;
  }

  // Check role restrictions if specified
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    if (isDriver) return <Navigate to="/portal" replace />;
    if (isWasher) return <Navigate to="/washer" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

import React, { useState, useEffect } from 'react';
import { useAuthContext } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, user } = useAuthContext();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      setAuthorized(false);
      return;
    }

    setAuthorized(true);
  }, [isAuthenticated, user, requiredRole]);

  if (!authorized) {
    return <div>Unauthorized</div>;
  }

  return <>{children}</>;
};

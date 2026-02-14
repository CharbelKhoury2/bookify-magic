import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loading, user } = useAdminCheck();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

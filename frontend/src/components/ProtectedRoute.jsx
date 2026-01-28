import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles && !roles.includes(user.role)) {
        // Redirect to a role-appropriate dashboard or 403 page
        // For now, if unauthorized, go to Login or Dashboard (if valid user but wrong role)
        // Better: Go to "Unauthorized" or simple Dashboard.
        if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin-dashboard" />;
        return <Navigate to="/dashboard" />;
    }

    return children;
};

export default ProtectedRoute;

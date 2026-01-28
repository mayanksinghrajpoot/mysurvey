import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Legacy Dashboard Redirector
// Redirects users to their specific role-based dashboard route.
const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        switch (user.role) {
            case 'SUPER_ADMIN':
                navigate('/super-admin');
                break;
            case 'ADMIN':
                navigate('/admin');
                break;
            case 'PROJECT_MANAGER':
                navigate('/pm');
                break;
            case 'NGO':
                navigate('/ngo');
                break;
            default:
                // Fallback or Unknown Role
                navigate('/login');
        }
    }, [user, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-slate-500">Redirecting to your dashboard...</div>
        </div>
    );
};

export default Dashboard;

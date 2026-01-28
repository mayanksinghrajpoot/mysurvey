import React from 'react';
import { useAuth } from '../context/AuthContext';
import PMDetailView from './views/PMDetailView';

// Level 3 Direct Access for PM
const ProjectManagerDashboard = () => {
    const { user, logout } = useAuth();

    // AuthContext user should have id.
    // If not, we might need to rely on endpoint returning own data, but PMDetailView expects ID to filter?
    // "createdBy === pmId"
    // User object has id (from our earlier fix).

    const pmId = user?.id;

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10 w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-600">
                                FormsFlow PM
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-slate-600">
                                {user?.username} <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded ml-1">PM</span>
                            </span>
                            <button onClick={handleLogout} className="text-sm border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {pmId ? (
                    <PMDetailView pmId={pmId} pmName={user.name || user.username} isOwnView={true} />
                ) : (
                    <div className="p-8 text-center text-red-500">Error: User ID missing. Please login again.</div>
                )}
            </main>
        </div>
    );
};

export default ProjectManagerDashboard;

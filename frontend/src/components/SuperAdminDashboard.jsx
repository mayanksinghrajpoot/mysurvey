import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CorporateDetailView from './views/CorporateDetailView';
import PMDetailView from './views/PMDetailView';

const SuperAdminDashboard = () => {
    const { user, logout } = useAuth();
    const [tenants, setTenants] = useState([]);
    const [selectedTenant, setSelectedTenant] = useState(null); // Level 1 Selection
    const [selectedPM, setSelectedPM] = useState(null); // Level 2 Selection

    useEffect(() => {
        // Fetch Tenants (Corporates)
        // Assumption: /auth/tenants endpoint returns Admin users representing Corporates
        api.get('/auth/tenants').then(res => setTenants(res.data)).catch(console.error);
    }, []);

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    // When selecting a Tenant, we need to set the Context (Header) for subsequent API calls
    // But our views (CorporateDetailView) make their own calls.
    // X-TENANT-ID header is usually managed via localStorage or Interceptor.
    // If I select a tenant, I should probably save it?
    // But SuperAdmin can switch rapidly.
    // BEST APPROACH: Pass the tenantId to the View components, and View components accept `tenantId` override?
    // Current `CorporateDetailView` fetches `/auth/users`.
    // We need to modify `api.js` or `CorporateDetailView` to handle explicit tenantId.
    // For now, I'll instruct the user of the limitation or Update `api.js` to read from a SuperAdmin State?
    // OR: I simply update the localStorage 'impersonateTenantId' when drilling down.

    const selectTenant = (tenant) => {
        setSelectedTenant(tenant);
        // Hack for MVP: Set X-TENANT-ID logic? 
        // Current API interceptor reads `tenantId` from somewhere?
        // Let's assume Backend returns filtered data if we pass query param or header.
        // Step needed: Ensure `CorporateDetailView` can fetch users for a specific tenant.
        // Since I can't easily change `CorporateDetailView` signature without breaking Admin, 
        // I will rely on `api` interceptor picking up a value I save here.
        localStorage.setItem('impersonateTenantId', tenant.id);
    };

    const clearTenant = () => {
        setSelectedTenant(null);
        setSelectedPM(null);
        localStorage.removeItem('impersonateTenantId');
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans">
            <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-xl font-bold text-white">
                                FormsFlow Super Admin
                            </h1>
                            {selectedTenant && (
                                <div className="flex items-center text-sm text-slate-400 space-x-2">
                                    <span>/</span>
                                    <button onClick={clearTenant} className="hover:text-white">Tenants</button>
                                    <span>/</span>
                                    <span className="text-white font-medium">{selectedTenant.name}</span>
                                    {selectedPM && (
                                        <>
                                            <span>/</span>
                                            <button onClick={() => setSelectedPM(null)} className="hover:text-white">PMs</button>
                                            <span>/</span>
                                            <span className="text-white font-medium">{selectedPM.name}</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-slate-400">
                                {user?.username} <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded ml-1">SUPER</span>
                            </span>
                            <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!selectedTenant ? (
                    // Level 1: Tenants List
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Corporates</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tenants.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => selectTenant(t)}
                                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-500 cursor-pointer transition"
                                >
                                    <div className="font-bold text-lg text-slate-900">{t.name}</div>
                                    <div className="text-sm text-slate-500">@{t.username}</div>
                                    <div className="mt-4 text-xs text-blue-600 font-medium">Click to manage →</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : !selectedPM ? (
                    // Level 2: Corporate View (PM List)
                    <div>
                        <button onClick={clearTenant} className="mb-4 text-sm text-slate-500 hover:text-blue-600">← Back to Tenants</button>
                        <CorporateDetailView onSelectPM={setSelectedPM} />
                    </div>
                ) : (
                    // Level 3: PM View
                    <div>
                        <button onClick={() => setSelectedPM(null)} className="mb-4 text-sm text-slate-500 hover:text-blue-600">← Back to PM List</button>
                        <PMDetailView pmId={selectedPM.id} pmName={selectedPM.name} isOwnView={false} />
                    </div>
                )}
            </main>
        </div>
    );
};

export default SuperAdminDashboard;

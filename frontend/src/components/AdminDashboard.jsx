import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const AdminDashboard = () => {
    const [tenants, setTenants] = useState([]);
    const [selectedTenant, setSelectedTenant] = useState('');
    const [surveys, setSurveys] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (role !== 'ADMIN') {
            navigate('/dashboard');
            return;
        }
        fetchTenants();
        fetchSurveys(); // Fetch all initially
    }, [navigate]);

    const fetchTenants = async () => {
        try {
            const res = await api.get('/auth/tenants');
            setTenants(res.data);
        } catch (err) {
            console.error('Failed to fetch tenants', err);
        }
    };

    const fetchSurveys = async (impersonateTenantId) => {
        try {
            const config = {};
            if (impersonateTenantId) {
                config.headers = { 'X-TENANT-ID': impersonateTenantId };
            } else {
                // If we want "Global View", we verify backend allows missing header for Admin
                // We might need to explicitly remove it if axios interceptor adds it automatically
            }

            // NOTE: Our api.js interceptor adds X-TENANT-ID from localStorage.
            // For Admin "Global View", we might want to temporarily clear it or override provided config.
            // Let's modify how we call it.

            // Actually, simpler approach for this task:
            // When Admin selects a tenant, we update localStorage 'tenantId' so the interceptor picks it up?
            // BUT, that changes the "Session" context.
            // Better: Pass explicit header to override.

            // Wait, axios interceptor:
            // if (tenantId) config.headers['X-TENANT-ID'] = tenantId;
            // It uses localStorage.

            // If I want to see ALL, I should probably NOT send the header?
            // But I'm logged in as Admin (who has a tenantId in token).
            // Backend Filter: 
            // - Checks Header. If present, sets Context.
            // - If missing, Context is null.
            // - JWT Filter: If Admin, it ignores mismatch. If header is missing, Context remains null (Global).

            // So for Global View, we need to ensure NO header is sent.
            // But localStorage has my Admin Tenant ID. Interceptor will send it.

            // Hack/Fix: I will manually override the header to empty string or null in the request config to bypass interceptor?
            // Or I can modify interceptor to respect config overrides.

            const res = await api.get('/surveys', {
                headers: impersonateTenantId ? { 'X-TENANT-ID': impersonateTenantId } : { 'X-TENANT-ID': '' }
                // Sending empty header might be treated as present but empty? Backend check: header != null && !isEmpty().
                // So empty string might work to set Context to empty?
                // Let's see TenantFilter: "if (tenantId != null && !tenantId.isEmpty())" -> Then set Context.
                // So if we send "", filter does NOT set context.
                // JWT Filter: "if ('ADMIN'.equals(role)) { ... }" -> If Context is null, stays null.
                // SurveyService: "if (tenantId == null) return findAll()"
                // Perfect. Sending "" should trigger Global View.
            });
            setSurveys(res.data);
        } catch (err) {
            console.error('Failed to fetch surveys', err);
        }
    };

    const handleTenantChange = (e) => {
        const val = e.target.value;
        setSelectedTenant(val);
        fetchSurveys(val);
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <nav className="bg-slate-900 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <span className="text-xl font-bold text-white">FormsFlow Admin</span>
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">SUPER ADMIN</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-sm text-slate-400">
                                View as:
                            </div>
                            <select
                                value={selectedTenant}
                                onChange={handleTenantChange}
                                className="bg-slate-800 text-white border-none rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">ALL TENANTS (Global)</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
                                ))}
                            </select>
                            <button onClick={handleLogout} className="text-slate-400 hover:text-white text-sm">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">
                        {selectedTenant ? `Surveys for ${tenants.find(t => t.id === selectedTenant)?.name}` : 'All System Surveys'}
                    </h2>
                    <span className="text-slate-500 text-sm">Showing {surveys.length} results</span>
                </div>

                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {surveys.map((survey) => (
                                <tr key={survey.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{survey.title}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 font-mono">{survey.tenantId}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(survey.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link to={`/surveys/${survey.id}/responses`} className="text-blue-600 hover:text-blue-900 mr-4">View Responses</Link>
                                        <Link to={`/surveys/${survey.id}/analytics`} className="text-purple-600 hover:text-purple-900 mr-4">Analytics</Link>
                                        <Link to={`/survey/${survey.id}`} className="text-green-600 hover:text-green-900">View Form</Link>
                                        {/* Admin specific actions like Delete could go here */}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {surveys.length === 0 && (
                        <div className="p-8 text-center text-gray-500">No surveys found.</div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;

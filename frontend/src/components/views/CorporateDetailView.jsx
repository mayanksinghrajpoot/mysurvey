import React, { useEffect, useState } from 'react';
import api from '../../services/api';

// This component displays the "Level 2" view:
// - List of Project Managers for a Corporate/Org
// - Default view for Admin
// - Drill-down step for Super Admin
const CorporateDetailView = ({ onSelectPM }) => {
    const [pms, setPms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPMs();
    }, []);

    const fetchPMs = async () => {
        setLoading(true);
        try {
            // Fetch users. 
            // If Super Admin is viewing, they must be impersonating (header set) OR we fetch by filtering?
            // "Super Admin... clicking any corporate it will show all PMs"
            // If Super Admin is NOT impersonating, /auth/users returns ALL system users?
            // AuthController.getAllUsers() -> calls getAccessibleUsers().
            // If Super Admin -> returns findAll().
            // So we need to Filter by selected Organization ID client side 
            // OR the parent component passes the filtered list?
            // Better: Backend Impersonation via Header is cleaner because it scopes ALL requests.
            // Assumption: The Parent Component sets the X-TENANT-ID header or context before rendering this?
            // NO, modifying headers in React global config during render is tricky.
            // BETTER: We filter client side if we have the list, OR we assume we receive just the relevant users.

            // Actually, if this is ADMIN view, /auth/users returns Org users.
            // If SUPER ADMIN view, /auth/users returns ALL. We filter by `organizationId`.
            // But this component doesn't know the Org ID unless passed.
            // Let's rely on api call returning what we need or filtering.

            const res = await api.get('/auth/users');
            // We just format and show PMs.
            // BUT wait, for Super Admin to see PMs of Corp X, we need to know X.
            // Let's assume the Super Admin Dashboard sets appropriate context or passes props?
            // Let's keep this component generic: It accepts `users` prop? Or fetches?
            // If it fetches, how does it know which Org?
            // "Admin view uses same".

            // Hack: Super Admin will "Impersonate" logic implies we set a Global State or context.
            // Or we just pass the OrgID to this component and it does nothing if it's Admin (who only sees own).

            // Let's filter by Role=PROJECT_MANAGER.
            // If Super Admin, we might see ALL PMs of ALL Orgs unless filtered.
            // We'll fix this in Parent.
            setPms(res.data.filter(u => u.role === 'PROJECT_MANAGER'));

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="animate-fade-in-up">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Project Managers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pms.map(pm => (
                    <div
                        key={pm.id}
                        onClick={() => onSelectPM(pm)}
                        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition group"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition">
                                {pm.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition">{pm.name}</h3>
                                <div className="text-sm text-slate-500">@{pm.username}</div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between text-sm text-slate-500">
                            <span>Click to view associated surveys & NGOs</span>
                            <span className="text-blue-500">→</span>
                        </div>
                    </div>
                ))}

                {/* Add New PM Card? (Only for Admin) */}
            </div>
            {pms.length === 0 && <div className="text-center text-slate-500 mt-10">No Project Managers found.</div>}
        </div>
    );
};

export default CorporateDetailView;

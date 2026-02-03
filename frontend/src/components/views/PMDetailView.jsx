import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Level 3: Survey List (Table) -> Survey Detail (Workbench)
const PMDetailView = ({ pmId, pmName, isOwnView }) => {
    const { user } = useAuth(); // Get current user for Role Check
    const [surveys, setSurveys] = useState([]);
    const [projects, setProjects] = useState([]); // New: Projects Map
    const [ngos, setNgos] = useState([]); // Associated NGOs
    const [pms, setPms] = useState([]);   // All PMs (For Admin Assignment)
    const [loading, setLoading] = useState(true);
    const [selectedSurvey, setSelectedSurvey] = useState(null);

    // Modal State for NGO Assignment (PM/Admin)
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignedNgoIds, setAssignedNgoIds] = useState([]);
    const [assigning, setAssigning] = useState(false);

    // Modal State for PM Assignment (Admin Only)
    const [showPmModal, setShowPmModal] = useState(false);
    const [selectedPmId, setSelectedPmId] = useState('');
    const [transferring, setTransferring] = useState(false);

    useEffect(() => {
        fetchData();
        setSelectedSurvey(null);
    }, [pmId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Surveys
            const surveyRes = await api.get('/surveys');
            // Backend now handles deduplication and extensive fetching for PMs.
            // We just use the result directly.
            // However, we might want to ensure we don't accidentally showing surveys not relevant if API is loose,
            // but api.get('/surveys') is context aware.
            setSurveys(surveyRes.data);

            // Fetch Projects for Name Mapping
            // If Admin, fetching all projects might be heavy, but for now it's okay.
            // If PM, fetching /projects returns their projects.
            const projRes = await api.get('/projects');
            setProjects(projRes.data);

            // Fetch Users (NGOs & PMs)
            const userRes = await api.get('/auth/users');

            // NGOs associated with THIS PM
            const pmNgos = userRes.data.filter(u =>
                u.role === 'NGO' &&
                u.associatedPmIds &&
                u.associatedPmIds.includes(pmId)
            );
            setNgos(pmNgos);

            // If Admin, fetch all PMs for potential assignment
            if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
                const allPms = userRes.data.filter(u => u.role === 'PROJECT_MANAGER');
                setPms(allPms);
            }

        } catch (error) {
            console.error("Failed to fetch details", error);
        } finally {
            setLoading(false);
        }
    };

    // --- NGO ASSIGNMENT ---
    const openAssignModal = () => {
        if (!selectedSurvey) return;
        setAssignedNgoIds(selectedSurvey.assignedNgoIds || []);
        setShowAssignModal(true);
    };

    const toggleNgo = (ngoId) => {
        if (assignedNgoIds.includes(ngoId)) {
            setAssignedNgoIds(assignedNgoIds.filter(id => id !== ngoId));
        } else {
            setAssignedNgoIds([...assignedNgoIds, ngoId]);
        }
    };

    const handleAssignSave = async () => {
        setAssigning(true);
        try {
            await api.put(`/surveys/${selectedSurvey.id}`, {
                ...selectedSurvey,
                assignedNgoIds: assignedNgoIds
            });

            const updatedSurvey = { ...selectedSurvey, assignedNgoIds: assignedNgoIds };
            setSelectedSurvey(updatedSurvey);
            setSurveys(surveys.map(s => s.id === updatedSurvey.id ? updatedSurvey : s));

            setShowAssignModal(false);
            alert("NGO assignments updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed: " + err.message);
        } finally {
            setAssigning(false);
        }
    };

    // --- PM ASSIGNMENT (Transfer) ---
    const openPmModal = () => {
        if (!selectedSurvey) return;
        setSelectedPmId(selectedSurvey.createdBy); // Default to current owner
        setShowPmModal(true);
    };

    const handlePmTransfer = async () => {
        if (!selectedPmId) return;
        setTransferring(true);
        try {
            await api.put(`/surveys/${selectedSurvey.id}`, {
                ...selectedSurvey,
                createdBy: selectedPmId // Transfer ownership
            });

            alert("Survey ownership transferred successfully!");
            setShowPmModal(false);
            setSelectedSurvey(null); // Close detail view as it might no longer belong here
            fetchData(); // Refresh list (it might disappear)
        } catch (err) {
            console.error(err);
            alert("Failed to transfer: " + err.message);
        } finally {
            setTransferring(false);
        }
    };


    if (loading) return <div className="p-8 text-center text-slate-500">Loading details...</div>;

    // MASTER-DETAIL: DETAIL VIEW
    if (selectedSurvey) {
        return (
            <div className="animate-fade-in-up space-y-6">
                {/* Breadcrumb */}
                <div className="flex items-center space-x-4 mb-4">
                    <button onClick={() => setSelectedSurvey(null)} className="text-slate-500 hover:text-blue-600 font-medium flex items-center">
                        <span className="mr-2">←</span> Back to Survey List
                    </button>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-800 font-bold">{selectedSurvey.title}</span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Link to={`/surveys/${selectedSurvey.id}/responses`} className="block group">
                        <div className="bg-white border-l-4 border-blue-500 rounded shadow-sm p-6 hover:shadow-md transition cursor-pointer h-full">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600">Responses</h3>
                                <span className="p-2 bg-blue-50 rounded-full text-blue-600 group-hover:bg-blue-100">📊</span>
                            </div>
                            <p className="text-sm text-slate-500">View collected answers.</p>
                        </div>
                    </Link>

                    <a href={`/survey/${selectedSurvey.id}`} target="_blank" rel="noopener noreferrer" className="block group">
                        <div className="bg-white border-l-4 border-green-500 rounded shadow-sm p-6 hover:shadow-md transition cursor-pointer h-full">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-slate-800 group-hover:text-green-600">Take Survey</h3>
                                <span className="p-2 bg-green-50 rounded-full text-green-600 group-hover:bg-green-100">📝</span>
                            </div>
                            <p className="text-sm text-slate-500">Open public form.</p>
                        </div>
                    </a>

                    <Link to={`/surveys/${selectedSurvey.id}/analytics`} className="block group">
                        <div className="bg-white border-l-4 border-purple-500 rounded shadow-sm p-6 hover:shadow-md transition cursor-pointer h-full">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-slate-800 group-hover:text-purple-600">Analytics</h3>
                                <span className="p-2 bg-purple-50 rounded-full text-purple-600 group-hover:bg-purple-100">📈</span>
                            </div>
                            <p className="text-sm text-slate-500">Visual insights.</p>
                        </div>
                    </Link>

                    {/* ACTIONS: Assign NGO (For PM/Admin) */}
                    <div onClick={openAssignModal} className="block group cursor-pointer">
                        <div className="bg-white border-l-4 border-orange-500 rounded shadow-sm p-6 hover:shadow-md transition h-full">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-slate-800 group-hover:text-orange-600">Assign NGOs</h3>
                                <span className="p-2 bg-orange-50 rounded-full text-orange-600 group-hover:bg-orange-100">🤝</span>
                            </div>
                            <p className="text-sm text-slate-500">Grant access to NGOs.</p>
                        </div>
                    </div>

                    {/* ACTIONS: Assign PM (Admin Only) - DISABLED
                    {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                        <div onClick={openPmModal} className="block group cursor-pointer lg:col-span-4 md:col-span-2">
                            <div className="bg-slate-800 border-l-4 border-slate-600 rounded shadow-sm p-4 hover:bg-slate-700 transition flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Transfer Ownership</h3>
                                    <p className="text-sm text-slate-400">Assign this survey to a Project Manager.</p>
                                </div>
                                <span className="p-2 bg-slate-700 rounded-full text-white">👤</span>
                            </div>
                        </div>
                    )}
                    */}
                </div>

                {/* Survey Info */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Survey Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Survey ID:</span>
                            <span className="font-mono text-slate-700 select-all">{selectedSurvey.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Created By (ID):</span>
                            <span className="font-mono text-slate-700">{selectedSurvey.createdBy}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Tenant ID:</span>
                            <span className="text-slate-700">{selectedSurvey.organizationId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Assigned NGOs:</span>
                            <span className="text-slate-700 font-bold">{selectedSurvey.assignedNgoIds?.length || 0}</span>
                        </div>
                    </div>
                </div>

                {/* NGO ASSIGN MODAL */}
                {showAssignModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 animate-fade-in-up">
                            <h2 className="text-xl font-bold mb-4 text-slate-800">Assign NGOs</h2>
                            <p className="text-sm text-slate-500 mb-4">Select NGOs who can view and distribute this survey.</p>

                            <div className="mb-6 max-h-60 overflow-y-auto border border-slate-100 rounded-lg p-2 bg-slate-50">
                                {ngos.length === 0 ? (
                                    <p className="text-center text-slate-400 py-4">No NGOs associated with you.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {ngos.map(ngo => (
                                            <label key={ngo.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition">
                                                <input
                                                    type="checkbox"
                                                    checked={assignedNgoIds.includes(ngo.id)}
                                                    onChange={() => toggleNgo(ngo.id)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700">{ngo.name}</span>
                                                    <span className="text-xs text-slate-400">@{ngo.username}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowAssignModal(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssignSave}
                                    disabled={assigning}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                                >
                                    {assigning ? 'Saving...' : 'Save Assignments'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PM TRANSFER MODAL */}
                {showPmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 animate-fade-in-up">
                            <h2 className="text-xl font-bold mb-4 text-slate-900">Transfer Ownership</h2>
                            <p className="text-sm text-slate-500 mb-4">Select a Project Manager to own this survey.</p>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Project Manager</label>
                                <select
                                    value={selectedPmId}
                                    onChange={(e) => setSelectedPmId(e.target.value)}
                                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value="">Select a PM...</option>
                                    {pms.map(pm => (
                                        <option key={pm.id} value={pm.id}>{pm.name} (@{pm.username})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowPmModal(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePmTransfer}
                                    disabled={transferring || !selectedPmId}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                                >
                                    {transferring ? 'Transferring...' : 'Transfer Ownership'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // MASTER-DETAIL: LIST VIEW (TABLE)
    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                    {isOwnView ? 'My Dashboard' : `Project Manager: ${pmName}`}
                </h2>
                {isOwnView && (
                    <Link to="/create-survey" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition flex items-center">
                        <span className="mr-1">+</span> New Survey
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Surveys List (Table View) */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800">Associated Surveys</h3>
                        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">{surveys.length}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Survey Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Project</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-32">Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {surveys.map(s => (
                                    <tr
                                        key={s.id}
                                        onClick={() => setSelectedSurvey(s)}
                                        className="hover:bg-blue-50 cursor-pointer transition group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900 group-hover:text-blue-600">{s.title}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-0.5">{s.id.substring(0, 8)}...</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2 py-1 rounded-full ${s.projectId ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {s.projectId ? (projects.find(p => p.id === s.projectId)?.name || 'Unknown Project') : 'No Project'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <span className="text-slate-400 group-hover:text-blue-500 font-bold">→</span>
                                        </td>
                                    </tr>
                                ))}
                                {surveys.length === 0 && (
                                    <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-400 text-sm">No surveys found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* NGOs List (Sidebar) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800">Associated NGOs</h3>
                        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">{ngos.length}</span>
                    </div>
                    <ul className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                        {ngos.map(n => (
                            <li key={n.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">
                                        {n.name.substring(0, 1)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="font-medium text-slate-900 truncate w-32">{n.name}</div>
                                        <div className="text-xs text-slate-500 truncate">@{n.username}</div>
                                    </div>
                                </div>
                                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                            </li>
                        ))}
                        {ngos.length === 0 && <li className="p-6 text-center text-slate-400 text-sm">No NGOs associated.</li>}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default PMDetailView;

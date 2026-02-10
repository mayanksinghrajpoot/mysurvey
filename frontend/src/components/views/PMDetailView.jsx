import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import ConfirmationModal from '../ConfirmationModal';
import SchemaDataViewer from '../SchemaDataViewer';

// Level 3: Survey List (Table) -> Survey Detail (Workbench)
const PMDetailView = ({ pmId, pmName, isOwnView }) => {
    const { user } = useAuth(); // Get current user for Role Check
    const [activeTab, setActiveTab] = useState('surveys'); // surveys | operations

    const [surveys, setSurveys] = useState([]);
    const [projects, setProjects] = useState([]); // Map of Project Details
    const [ngos, setNgos] = useState([]); // Associated NGOs
    const [pms, setPms] = useState([]);   // All PMs (For Admin Assignment)
    const [rfqs, setRfqs] = useState([]);
    const [rfps, setRfps] = useState([]);
    const [utilizations, setUtilizations] = useState([]);

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
            // Parallel Fetch: Dashboard Data + Users (for NGO/PM list)
            const [dashboardRes, userRes] = await Promise.all([
                api.get(`/dashboard/pm/details/${pmId}`),
                api.get('/auth/users')
            ]);

            const data = dashboardRes.data;

            setSurveys(data.surveys || []);
            setProjects(data.projects || []);
            setRfqs(data.rfqs || []);
            setRfps(data.rfps || []);
            setUtilizations(data.utilizations || []);

            // User Management Data
            // NGOs associated with THIS PM
            const pmNgos = userRes.data.filter(u =>
                u.role === 'NGO' &&
                u.associatedPmIds &&
                u.associatedPmIds.includes(pmId)
            );
            setNgos(pmNgos);

            if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
                setPms(userRes.data.filter(u => u.role === 'PROJECT_MANAGER'));
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
            toast.success("NGO assignments updated successfully!");
        } catch (err) {
            console.error(err);
            toast.error("Failed: " + err.message);
        } finally {
            setAssigning(false);
        }
    };

    // --- PM ASSIGNMENT (Transfer) ---
    const handlePmTransfer = async () => {
        if (!selectedPmId) return;
        setTransferring(true);
        try {
            await api.put(`/surveys/${selectedSurvey.id}`, {
                ...selectedSurvey,
                createdBy: selectedPmId // Transfer ownership
            });

            toast.success("Survey ownership transferred successfully!");
            setShowPmModal(false);
            setSelectedSurvey(null); // Close detail view as it might no longer belong here
            fetchData(); // Refresh list (it might disappear)
        } catch (err) {
            console.error(err);
            toast.error("Failed to transfer: " + err.message);
        } finally {
            setTransferring(false);
        }
    };

    // --- UI Modals State ---
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        isDanger: false
    });

    const closeConfirmModal = () => setConfirmModal({ ...confirmModal, isOpen: false });

    // Details Modal
    const [viewDetailsModal, setViewDetailsModal] = useState(null);
    const [viewSchema, setViewSchema] = useState(null);

    useEffect(() => {
        const fetchSchema = async () => {
            if (!viewDetailsModal) {
                setViewSchema(null);
                return;
            }

            try {
                // Determine if it's RFP or Utilization
                // RFP has rfqId. Utilization has rfpId.
                if (viewDetailsModal.rfqId) {
                    // It's an RFP (Milestone)
                    // Need Global RFP Schema for Tenant
                    const rfq = rfqs.find(r => r.id === viewDetailsModal.rfqId);
                    if (rfq) {
                        const survey = surveys.find(s => s.projectId === rfq.projectId);
                        if (survey && survey.organizationId) {
                            const res = await api.get(`/schemas?tenantId=${survey.organizationId}&type=RFP`);
                            if (res.data && res.data.schemaJson) {
                                setViewSchema(typeof res.data.schemaJson === 'string'
                                    ? JSON.parse(res.data.schemaJson)
                                    : res.data.schemaJson);
                            }
                        }
                    }
                } else if (viewDetailsModal.rfpId) {
                    // It's a Utilization (Expense)
                    // Derived from RFP -> RFQ -> expenseFormat
                    const rfp = rfps.find(r => r.id === viewDetailsModal.rfpId);
                    if (rfp) {
                        const rfq = rfqs.find(r => r.id === rfp.rfqId);
                        if (rfq && rfq.expenseFormat) {
                            // expenseFormat is likely an array of fields
                            setViewSchema({ components: rfq.expenseFormat });
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load schema for details", err);
            }
        };
        fetchSchema();
    }, [viewDetailsModal, rfqs, rfps, surveys]);

    // --- Operations Logic ---
    const handleVerifyExpense = async (id) => {
        try {
            await api.put(`/utilizations/${id}/verify`);
            toast.success("Expense Verified");
            // Locally update
            setUtilizations(utilizations.map(u => u.id === id ? { ...u, status: 'VERIFIED' } : u));
        } catch (err) {
            toast.error("Failed to verify");
        }
    };

    const handleRejectExpense = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Reject Expense?',
            message: 'Are you sure you want to reject this expense claim?',
            isDanger: true,
            confirmText: 'Reject Expense',
            onConfirm: async () => {
                try {
                    await api.put(`/utilizations/${id}/reject`);
                    toast.info("Expense Rejected");
                    setUtilizations(utilizations.map(u => u.id === id ? { ...u, status: 'REJECTED' } : u));
                } catch (err) {
                    toast.error("Failed to reject");
                }
            }
        });
    };

    // --- Render Helpers ---
    const getProjectStats = (projectId) => {
        const pRfqs = rfqs.filter(r => r.projectId === projectId && r.status === 'APPROVED');
        const totalBudget = pRfqs.reduce((sum, r) => sum + r.totalBudget, 0);

        const pRfps = rfps.filter(r => pRfqs.some(q => q.id === r.rfqId) && r.status === 'APPROVED');
        const released = pRfps.reduce((sum, r) => sum + r.amount, 0);

        const pUtils = utilizations.filter(u => pRfps.some(r => r.id === u.rfpId) && u.status === 'VERIFIED');
        const utilized = pUtils.reduce((sum, u) => sum + u.amount, 0);

        return { totalBudget, released, utilized };
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
            </div>
        );
    }

    // MASTER-DETAIL: LIST VIEW
    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">
                    {isOwnView ? 'My Dashboard' : `Project Manager: ${pmName}`}
                </h2>
                {isOwnView && (
                    <Link to="/create-survey" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition flex items-center">
                        <span className="mr-1">+</span> New Survey
                    </Link>
                )}
            </div>

            {/* TABS */}
            <div className="flex space-x-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('surveys')}
                    className={`pb-2 px-3 font-medium ${activeTab === 'surveys' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500'}`}
                >
                    Surveys
                </button>
                <button
                    onClick={() => setActiveTab('operations')}
                    className={`pb-2 px-3 font-medium ${activeTab === 'operations' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500'}`}
                >
                    Budget & Operations
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-2 px-3 font-medium ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500'}`}
                >
                    History
                </button>
            </div>

            {activeTab === 'surveys' && (
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
            )}

            {activeTab === 'operations' && (
                <div className="space-y-12">
                    {/* 1. Projects Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {projects.map(p => {
                            const stats = getProjectStats(p.id);
                            const percentReleased = stats.totalBudget ? (stats.released / stats.totalBudget) * 100 : 0;
                            const percentUtilized = stats.released ? (stats.utilized / stats.released) * 100 : 0;

                            // Only show projects that have budget activity
                            if (stats.totalBudget === 0) return null;

                            return (
                                <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                    <h3 className="font-bold text-lg text-slate-800 mb-4">{p.name || `Project ${p.id.substring(0, 8)}`}</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-500">Released / Budget</span>
                                                <span className="font-medium text-slate-700">₹{stats.released.toLocaleString()} / ₹{stats.totalBudget.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${percentReleased}%` }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-500">Utilized / Released</span>
                                                <span className="font-medium text-slate-700">₹{stats.utilized.toLocaleString()} / ₹{stats.released.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${percentUtilized}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* 2. Pending Verification Queue */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-semibold text-slate-800">Pending Expense Verifications</h3>
                        </div>
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expense Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proof</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {utilizations.filter(u => u.status === 'SUBMITTED').map(u => (
                                    <tr key={u.id}>
                                        <td className="px-6 py-4 font-medium text-slate-900">{u.title}</td>
                                        <td className="px-6 py-4 text-slate-700">₹{u.amount?.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm text-blue-600 truncate max-w-xs">{u.proofUrl || '-'}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => setViewDetailsModal(u)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</button>
                                            <button onClick={() => handleRejectExpense(u.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Reject</button>
                                            <button onClick={() => handleVerifyExpense(u.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">Verify</button>
                                        </td>
                                    </tr>
                                ))}
                                {utilizations.filter(u => u.status === 'SUBMITTED').length === 0 && (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">No pending verifications.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="space-y-12">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-semibold text-slate-800">All Project Milestones</h3>
                        </div>
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Milestone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {rfps.map(r => (
                                    <tr key={r.id}>
                                        <td className="px-6 py-4 font-medium text-slate-900">{r.title}</td>
                                        <td className="px-6 py-4 text-slate-700">₹{r.amount?.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            {r.status === 'APPROVED' && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Released</span>}
                                            {r.status === 'PENDING_PM' && <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">Needs Approval</span>}
                                            {r.status === 'PENDING_ADMIN' && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Waiting Admin</span>}
                                            {r.status === 'REJECTED' && <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Rejected</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            <div className="flex justify-between items-center">
                                                <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</span>
                                                <button onClick={() => setViewDetailsModal(r)} className="text-blue-600 hover:text-blue-800 text-xs font-bold">VIEW DETAILS</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {rfps.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">No milestones found.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-semibold text-slate-800">All Expenses</h3>
                        </div>
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expense Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proof</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {utilizations.map(u => (
                                    <tr key={u.id}>
                                        <td className="px-6 py-4 font-medium text-slate-900">{u.title}</td>
                                        <td className="px-6 py-4 text-slate-700">₹{u.amount?.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm text-blue-600 truncate max-w-xs cursor-pointer hover:underline" onClick={() => setViewDetailsModal(u)}>{u.proofUrl || '-'}</td>
                                        <td className="px-6 py-4">
                                            {u.status === 'VERIFIED' && <span className="text-green-600 font-medium">Verified</span>}
                                            {u.status === 'REJECTED' && <span className="text-red-600 font-medium">Rejected</span>}
                                            {u.status === 'SUBMITTED' && <span className="text-yellow-600">Pending Verification</span>}
                                        </td>
                                    </tr>
                                ))}
                                {utilizations.length === 0 && (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">No expenses found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {viewDetailsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-fade-in-up">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Details</h3>

                        {/* Standard Fields */}
                        <div className="mb-4">
                            <div className="text-sm text-slate-500 mb-1">Title / Description</div>
                            <div className="font-medium">{viewDetailsModal.title || viewDetailsModal.name}</div>
                        </div>

                        {/* Custom Data */}
                        <SchemaDataViewer data={viewDetailsModal.customData} schema={viewSchema} />

                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setViewDetailsModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText || "Confirm"}
                isDanger={confirmModal.isDanger}
            />
        </div>
    );
};

export default PMDetailView;

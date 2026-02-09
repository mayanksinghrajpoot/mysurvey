import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PMDetailView from './views/PMDetailView';
import api from '../services/api';
import { toast } from 'react-toastify';

const ProjectManagerDashboard = () => {
    const { user, logout } = useAuth();
    const pmId = user?.id;
    const [activeTab, setActiveTab] = useState('projects');

    // Approval State
    const [pendingRfqs, setPendingRfqs] = useState([]);
    const [pendingRfps, setPendingRfps] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'approvals' && pmId) {
            fetchPendingApprovals();
        }
    }, [activeTab, pmId]);

    const fetchPendingApprovals = async () => {
        setLoading(true);
        try {
            // 1. Get My Projects
            const projRes = await api.get('/projects');
            const myProjects = projRes.data;

            // 2. Get RFQs for each project
            const rfqPromises = myProjects.map(p => api.get(`/rfqs/project/${p.id}`));
            const rfqResponses = await Promise.all(rfqPromises);
            const allRfqs = rfqResponses.flatMap(r => r.data).filter(r => r.status === 'PENDING_PM');

            // 3. Get RFPs for each project
            const rfpPromises = myProjects.map(p => api.get(`/rfps/pending-pm/${p.id}`));
            const rfpResponses = await Promise.all(rfpPromises);
            const allRfps = rfpResponses.flatMap(r => r.data);

            setPendingRfqs(allRfqs);
            setPendingRfps(allRfps);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load approvals.");
        } finally {
            setLoading(false);
        }
    };

    const handleApproveRfq = async (id) => {
        try {
            await api.put(`/rfqs/${id}/approve-pm`);
            toast.success("RFQ Approved!");
            fetchPendingApprovals();
        } catch (err) {
            toast.error(err.response?.data?.error || "Approval failed");
        }
    };

    // Schema Editor State
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const [selectedRfqToApprove, setSelectedRfqToApprove] = useState(null);
    const [customFields, setCustomFields] = useState([]);

    const openApprovalModal = (rfq) => {
        setSelectedRfqToApprove(rfq);
        setCustomFields([]); // Start empty or load existing if applicable
        setApprovalModalOpen(true);
    };

    const closeApprovalModal = () => {
        setApprovalModalOpen(false);
        setSelectedRfqToApprove(null);
        setCustomFields([]);
    };

    const addCustomField = () => {
        setCustomFields([...customFields, { name: '', type: 'text', required: true }]);
    };

    const updateCustomField = (index, key, value) => {
        const updated = [...customFields];
        updated[index][key] = value;
        setCustomFields(updated);
    };

    const removeCustomField = (index) => {
        setCustomFields(customFields.filter((_, i) => i !== index));
    };

    const confirmApproveRfq = async () => {
        try {
            // Validate fields
            const validFields = customFields.filter(f => f.name.trim() !== '');

            await api.put(`/rfqs/${selectedRfqToApprove.id}/approve-pm`, {
                expenseFormat: validFields
            });
            toast.success("RFQ Approved with Expense Format!");
            closeApprovalModal();
            fetchPendingApprovals();
        } catch (err) {
            toast.error(err.response?.data?.error || "Approval failed");
        }
    };

    const handleRejectRfq = async (id) => {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;
        try {
            await api.put(`/rfqs/${id}/reject`, { reason });
            toast.info("RFQ Rejected.");
            fetchPendingApprovals();
        } catch (err) {
            toast.error(err.response?.data?.error || "Rejection failed");
        }
    };

    const handleApproveRfp = async (id) => {
        try {
            await api.put(`/rfps/${id}/approve-pm`);
            toast.success("Milestone Approved!");
            fetchPendingApprovals();
        } catch (err) {
            toast.error(err.response?.data?.error || "Approval failed");
        }
    };

    const handleRejectRfp = async (id) => {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;
        try {
            await api.put(`/rfps/${id}/reject`, { reason });
            toast.info("Milestone Rejected.");
            fetchPendingApprovals();
        } catch (err) {
            toast.error(err.response?.data?.error || "Rejection failed");
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10 w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-6">
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-600">
                                FormsFlow PM
                            </h1>
                            <div className="hidden sm:flex space-x-2">
                                <button
                                    onClick={() => setActiveTab('projects')}
                                    className={`px-3 py-1.5 rounded text-sm font-medium ${activeTab === 'projects' ? 'bg-green-100 text-green-700' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Projects & Surveys
                                </button>
                                <button
                                    onClick={() => setActiveTab('approvals')}
                                    className={`px-3 py-1.5 rounded text-sm font-medium ${activeTab === 'approvals' ? 'bg-green-100 text-green-700' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Funding Approvals
                                </button>
                            </div>
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
                {activeTab === 'projects' ? (
                    pmId ? (
                        <PMDetailView pmId={pmId} pmName={user.name || user.username} isOwnView={true} />
                    ) : (
                        <div className="p-8 text-center text-red-500">Error: User ID missing. Please login again.</div>
                    )
                ) : (
                    // APPROVALS TAB
                    <div className="animate-fade-in-up space-y-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-slate-800">Pending Approvals</h2>
                            <button onClick={fetchPendingApprovals} className="text-sm text-blue-600 hover:underline">Refresh</button>
                        </div>

                        {loading && <div className="text-center py-8 text-slate-500">Loading requests...</div>}

                        {!loading && (
                            <>
                                {/* RFQs Table */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">
                                        Budget Requests (RFQs)
                                    </div>
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-white">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Title</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Budget</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {pendingRfqs.map(rfq => (
                                                <tr key={rfq.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-medium text-slate-900">{rfq.title}</td>
                                                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{rfq.projectId}</td>
                                                    <td className="px-6 py-4 text-slate-700">
                                                        <div className="font-bold">${rfq.totalBudget?.toLocaleString()}</div>
                                                        {rfq.budgetBreakdown && rfq.budgetBreakdown.length > 0 && (
                                                            <div className="mt-1 text-xs text-slate-500">
                                                                {rfq.budgetBreakdown.map((b, i) => (
                                                                    <div key={i}>{b.financialYear}: ${b.amount?.toLocaleString()}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <button onClick={() => handleRejectRfq(rfq.id)} className="text-red-600 hover:text-red-800 text-sm">Reject</button>
                                                        <button onClick={() => openApprovalModal(rfq)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">Approve</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {pendingRfqs.length === 0 && <tr><td colSpan="4" className="px-6 py-6 text-center text-slate-400 text-sm">No pending budget requests.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>

                                {/* RFPs Table */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">
                                        Milestone Releases (RFPs)
                                    </div>
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-white">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Milestone</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">RFQ Ref</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {pendingRfps.map(rfp => (
                                                <tr key={rfp.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-medium text-slate-900">{rfp.title}</td>
                                                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{rfp.rfqId.substring(0, 8)}...</td>
                                                    <td className="px-6 py-4 text-slate-700 font-bold">${rfp.amount?.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <button onClick={() => handleRejectRfp(rfp.id)} className="text-red-600 hover:text-red-800 text-sm">Reject</button>
                                                        <button onClick={() => handleApproveRfp(rfp.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">Approve</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {pendingRfps.length === 0 && <tr><td colSpan="4" className="px-6 py-6 text-center text-slate-400 text-sm">No pending milestone requests.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {/* Approval Modal */}
                        {approvalModalOpen && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                                    <h2 className="text-xl font-bold mb-4">Approve Funds & Set Expense Format</h2>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Define the format (columns) that the NGO must use when reporting expenses for this contract.
                                        Leave empty if standard format is sufficient.
                                    </p>

                                    <div className="space-y-3 mb-6">
                                        {customFields.map((field, index) => (
                                            <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-200">
                                                <input
                                                    type="text"
                                                    placeholder="Field Name (e.g. Vendor Name)"
                                                    value={field.name}
                                                    onChange={(e) => updateCustomField(index, 'name', e.target.value)}
                                                    className="flex-1 border p-1 rounded text-sm"
                                                />
                                                <select
                                                    value={field.type}
                                                    onChange={(e) => updateCustomField(index, 'type', e.target.value)}
                                                    className="border p-1 rounded text-sm"
                                                >
                                                    <option value="text">Text</option>
                                                    <option value="number">Number</option>
                                                    <option value="date">Date</option>
                                                    {/* <option value="file">File (Unsupported)</option> */}
                                                </select>
                                                <label className="flex items-center gap-1 text-sm text-slate-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.required}
                                                        onChange={(e) => updateCustomField(index, 'required', e.target.checked)}
                                                    /> Req
                                                </label>
                                                <button onClick={() => removeCustomField(index)} className="text-red-500 hover:text-red-700 px-2">×</button>
                                            </div>
                                        ))}
                                        <button onClick={addCustomField} className="text-sm text-blue-600 font-medium hover:underline">+ Add Custom Field</button>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                        <button onClick={closeApprovalModal} className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-50">Cancel</button>
                                        <button onClick={confirmApproveRfq} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium">Confirm Approval</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProjectManagerDashboard;

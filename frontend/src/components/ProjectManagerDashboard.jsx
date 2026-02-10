import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PMDetailView from './views/PMDetailView';
import api from '../services/api';
import PromptModal from './PromptModal';
import { toast } from 'react-toastify';
import SchemaDataViewer from './SchemaDataViewer';

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
            // 1. Get Pending RFQs (Single Call)
            const rfqRes = await api.get(`/rfqs/pending-pm?pmId=${pmId}`);
            setPendingRfqs(rfqRes.data);

            // 2. Get Pending RFPs (Single Call)
            const rfpRes = await api.get(`/rfps/pending-pm?pmId=${pmId}`);
            setPendingRfps(rfpRes.data);
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
    const handleApproveRfp = async (id) => {
        try {
            await api.put(`/rfps/${id}/approve-pm`);
            toast.success("Milestone Approved!");
            fetchPendingApprovals();
        } catch (err) {
            toast.error(err.response?.data?.error || "Approval failed");
        }
    };

    const [viewDetailsModal, setViewDetailsModal] = useState(null);
    const [viewSchema, setViewSchema] = useState(null); // Schema for the currently viewed RFQ/RFP

    // Fetch schema when viewing details
    useEffect(() => {
        const fetchSchemaForDetails = async () => {
            if (!viewDetailsModal) {
                setViewSchema(null);
                return;
            }

            try {
                // 1. We need organizationId. We have projectId in RFQ.
                // If it's RFP, we have rfqId -> then get RFQ -> then get Project.
                // Let's assume viewDetailsModal has projectId (RFQ) or we need to fetch it (RFP).

                let projectId = viewDetailsModal.projectId;
                let type = 'RFQ';

                if (viewDetailsModal.rfqId) {
                    type = 'RFP';
                    // We might need to fetch the RFQ to get the projectId if not present in RFP object
                    // But let's see if we can get orgId differently or if RFP has projectId? 
                    // Model check: RFP does NOT have projectId. It has rfqId.
                    // So we need to fetch RFQ first? Or maybe we can cheat?
                    // Actually, fetching the survey by project is the standard way.
                    // Let's try to get survey by rfqId? No endpoint.

                    // Optimization: In 'pendingRfps', we can't easily get projectId without fetching RFQ.
                    // However, we can try to fetch the schema if we know the tenant? 
                    // PM doesn't know tenant ID directly? 

                    // Let's try to fetch the RFQ first if it's an RFP
                    const rfqRes = await api.get(`/rfqs/${viewDetailsModal.rfqId}`);
                    projectId = rfqRes.data.projectId;
                }

                if (projectId) {
                    // Fetch survey to get organizationId
                    const surveysRes = await api.get('/surveys');
                    const survey = surveysRes.data.find(s => s.projectId === projectId);

                    if (survey && survey.organizationId) {
                        const schemaRes = await api.get(`/schemas?tenantId=${survey.organizationId}&type=${type}`);
                        if (schemaRes.data && schemaRes.data.schemaJson) {
                            const parsed = typeof schemaRes.data.schemaJson === 'string'
                                ? JSON.parse(schemaRes.data.schemaJson)
                                : schemaRes.data.schemaJson;
                            setViewSchema(parsed);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch schema for labels", e);
            }
        };
        fetchSchemaForDetails();
    }, [viewDetailsModal]);

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

    // Prompt Modal State
    const [promptModal, setPromptModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        isDanger: false
    });

    const closePromptModal = () => {
        setPromptModal({ ...promptModal, isOpen: false });
    };

    const handleRejectRfq = (id) => {
        setPromptModal({
            isOpen: true,
            title: 'Reject RFQ',
            message: 'Please provide a reason for rejecting this Budget Request.',
            isDanger: true,
            onConfirm: async (reason) => {
                try {
                    await api.put(`/rfqs/${id}/reject`, { reason });
                    toast.info("RFQ Rejected.");
                    fetchPendingApprovals();
                } catch (err) {
                    toast.error(err.response?.data?.error || "Rejection failed");
                }
            }
        });
    };

    const handleRejectRfp = (id) => {
        setPromptModal({
            isOpen: true,
            title: 'Reject Milestone',
            message: 'Please provide a reason for rejecting this Milestone Release.',
            isDanger: true,
            onConfirm: async (reason) => {
                try {
                    await api.put(`/rfps/${id}/reject`, { reason });
                    toast.info("Milestone Rejected.");
                    fetchPendingApprovals();
                } catch (err) {
                    toast.error(err.response?.data?.error || "Rejection failed");
                }
            }
        });
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
                                                        <div className="font-bold">₹{rfq.totalBudget?.toLocaleString()}</div>
                                                        {rfq.budgetBreakdown && rfq.budgetBreakdown.length > 0 && (
                                                            <div className="mt-1 text-xs text-slate-500">
                                                                {rfq.budgetBreakdown.map((b, i) => (
                                                                    <div key={i}>{b.financialYear}: ₹{b.amount?.toLocaleString()}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <button onClick={() => setViewDetailsModal(rfq)} className="text-blue-600 hover:text-blue-800 text-sm">View</button>
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
                                                    <td className="px-6 py-4 text-slate-700 font-bold">₹{rfp.amount?.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <button onClick={() => setViewDetailsModal(rfp)} className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                                                        <button onClick={() => handleRejectRfp(rfp.id)} className="text-red-600 hover:text-red-800 text-sm">Reject</button>
                                                        <button onClick={() => handleApproveRfp(rfp.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">Approve</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {pendingRfps.length === 0 && <tr><td colSpan="4" className="px-6 py-6 text-center text-slate-400 text-sm">No pending milestone requests.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Details Modal */}
                                {viewDetailsModal && (
                                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                                        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-fade-in-up">
                                            <h3 className="text-xl font-bold text-slate-800 mb-4">Request Details</h3>

                                            {/* Standard Fields */}
                                            <div className="mb-4">
                                                <div className="text-sm text-slate-500 mb-1">Description / Title</div>
                                                <div className="font-medium">{viewDetailsModal.title}</div>
                                            </div>

                                            {/* Custom Data */}
                                            <SchemaDataViewer data={viewDetailsModal.customData} schema={viewSchema} />

                                            <div className="mt-6 flex justify-end">
                                                <button onClick={() => setViewDetailsModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200">Close</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
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

                        {/* Prompt Modal */}
                        <PromptModal
                            isOpen={promptModal.isOpen}
                            onClose={closePromptModal}
                            onConfirm={promptModal.onConfirm}
                            title={promptModal.title}
                            message={promptModal.message}
                            submitText="Reject"
                            isDanger={promptModal.isDanger}
                            placeholder="Reason for rejection..."
                        />
                    </div>
                )
                }
            </main >
        </div >
    );
};

export default ProjectManagerDashboard;

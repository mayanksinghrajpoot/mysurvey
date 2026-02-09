import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';

const NgoDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('surveys'); // surveys | funding | operations

    // Survey Data
    const [surveys, setSurveys] = useState([]);
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [loading, setLoading] = useState(true);

    // RFQ/RFP Data
    const [projects, setProjects] = useState([]); // Derived from surveys
    const [rfqMap, setRfqMap] = useState({}); // projectId -> rfq
    const [selectedRfq, setSelectedRfq] = useState(null); // For viewing RFPs
    const [allRfps, setAllRfps] = useState([]); // Cache all RFPs
    const [rfps, setRfps] = useState([]); // Filtered view
    const [activeRfp, setActiveRfp] = useState(null); // For viewing Expenses

    // Expense Data
    const [allExpenses, setAllExpenses] = useState([]); // Cache all expenses
    const [expenses, setExpenses] = useState([]); // Filtered view
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ title: '', amount: '', proofUrl: '', customData: {} });

    // Create Forms
    const [showCreateRfq, setShowCreateRfq] = useState(null); // projectId
    const [rfqForm, setRfqForm] = useState({ title: '', details: '', budgetBreakdown: [{ financialYear: '', amount: '' }] });
    const [showCreateRfp, setShowCreateRfp] = useState(false);
    const [rfpForm, setRfpForm] = useState({ title: '', amount: '' });

    useEffect(() => {
        fetchAssignedSurveys();
    }, []);

    const fetchAssignedSurveys = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/dashboard/ngo/summary?ngoId=${user.id}`);
            const data = res.data;

            setSurveys(data.surveys || []);
            setProjects([...data.projectIds] || []);
            setRfqMap(data.rfqMap || {});
            setAllRfps(data.rfps || []);
            setAllExpenses(data.expenses || []);

            // Re-apply filters if views are active
            if (selectedRfq) {
                const currentRfps = (data.rfps || []).filter(r => r.rfqId === selectedRfq.id);
                setRfps(currentRfps);
            }
            if (activeRfp) {
                const currentExpenses = (data.expenses || []).filter(e => e.rfpId === activeRfp.id);
                setExpenses(currentExpenses);
            }

        } catch (err) {
            console.error(err);
            toast.error("Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    // --- RFQ Logic ---
    const handleCreateRFQ = async (projectId) => {
        try {
            // Clean and validate breakdown
            const validBreakdown = rfqForm.budgetBreakdown
                .filter(b => b.financialYear && b.amount)
                .map(b => ({ financialYear: b.financialYear, amount: parseFloat(b.amount) }));

            if (validBreakdown.length === 0) {
                toast.error("Please add at least one Financial Year budget.");
                return;
            }

            await api.post('/rfqs', {
                projectId,
                ngoId: user.id,
                title: rfqForm.title,
                details: rfqForm.details,
                budgetBreakdown: validBreakdown
                // totalBudget is calculated by backend
            });
            toast.success("RFQ Created! Waiting for PM Approval.");
            setShowCreateRfq(null);
            setRfqForm({ title: '', details: '', budgetBreakdown: [{ financialYear: '', amount: '' }] });
            fetchAssignedSurveys();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to create RFQ");
        }
    };

    const handleViewRfq = async (rfq) => {
        setSelectedRfq(rfq);
        // Optimize: verify if allRfps are fresh, currently assuming fetchAssignedSurveys keeps them fresh
        setRfps(allRfps.filter(r => r.rfqId === rfq.id));
    };

    // --- RFP Logic ---
    const handleCreateRFP = async () => {
        try {
            await api.post('/rfps', {
                rfqId: selectedRfq.id,
                ngoId: user.id,
                title: rfpForm.title,
                amount: parseFloat(rfpForm.amount)
            });
            toast.success("Milestone Request (RFP) Submitted!");
            setShowCreateRfp(false);
            // Reload data to get the new RFP
            await fetchAssignedSurveys();
            // View update handled in fetchAssignedSurveys via selectedRfq check
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to submit RFP");
        }
    };

    // --- Expense Logic ---
    const handleViewExpenses = async (rfp) => {
        setActiveRfp(rfp);
        setExpenses(allExpenses.filter(e => e.rfpId === rfp.id));
    };

    const handleAddExpense = async () => {
        try {
            await api.post('/utilizations', {
                rfpId: activeRfp.id,
                ngoId: user.id,
                title: expenseForm.title,
                amount: parseFloat(expenseForm.amount),
                proofUrl: expenseForm.proofUrl,
                customData: expenseForm.customData || {}
            });
            toast.success("Expense Report Submitted!");
            setShowAddExpense(false);
            setExpenseForm({ title: '', amount: '', proofUrl: '', customData: {} });
            // Reload data to get new expense
            await fetchAssignedSurveys();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add expense");
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const renderRfqStatus = (status) => {
        switch (status) {
            case 'PENDING_PM': return <span className="text-orange-600 bg-orange-100 px-2 py-1 rounded text-xs">Waiting PM Approval</span>;
            case 'PENDING_ADMIN': return <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs">Waiting Admin Approval</span>;
            case 'APPROVED': return <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs">Active / Approved</span>;
            case 'REJECTED': return <span className="text-red-600 bg-red-100 px-2 py-1 rounded text-xs">Rejected</span>;
            default: return status;
        }
    };

    if (loading) return <div className="p-10 text-center">Loading assigned tasks...</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10 w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-blue-600">
                                FormsFlow NGO
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-slate-600">
                                {user?.username} <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded ml-1">NGO</span>
                            </span>
                            <button onClick={handleLogout} className="text-sm border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="flex space-x-4 mb-6 border-b border-slate-200 overflow-x-auto">
                    {['surveys', 'funding', 'operations', 'history'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setSelectedSurvey(null); setSelectedRfq(null); setActiveRfp(null); }}
                            className={`pb-2 px-3 text-sm font-medium capitalize whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-teal-600 text-teal-700' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {tab === 'funding' ? 'Funding & Budget' : tab === 'operations' ? 'Operations / Expenses' : tab === 'history' ? 'History / Logs' : 'Assigned Surveys'}
                        </button>
                    ))}
                </div>

                {/* SURVEY TAB */}
                {activeTab === 'surveys' && (
                    selectedSurvey ? (
                        <div className="animate-fade-in-up space-y-6">
                            <button onClick={() => setSelectedSurvey(null)} className="text-slate-500 hover:text-blue-600 font-medium flex items-center">
                                <span className="mr-2">←</span> Back to Surveys
                            </button>
                            <h2 className="text-3xl font-bold text-slate-800">{selectedSurvey.title}</h2>
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
                                <p className="text-slate-500 mb-6 max-w-lg mx-auto">
                                    You are assigned to collect responses for this survey.
                                </p>
                                <a
                                    href={`/survey/${selectedSurvey.id}?ref=${user.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-blue-700 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1"
                                >
                                    Start Survey Collection
                                </a>

                                <div className="mt-6">
                                    <Link
                                        to={`/surveys/${selectedSurvey.id}/responses`}
                                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        <span className="mr-2">📊</span> View My Responses
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Survey Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Date</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {surveys.map(s => (
                                        <tr key={s.id} onClick={() => setSelectedSurvey(s)} className="hover:bg-teal-50 cursor-pointer transition">
                                            <td className="px-6 py-4 font-medium text-slate-900">{s.title}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <span className="text-teal-600 font-bold">Open →</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {surveys.length === 0 && (
                                        <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400">No surveys assigned.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {/* FUNDING TAB */}
                {activeTab === 'funding' && (
                    selectedRfq ? (
                        <div className="animate-fade-in-up space-y-6">
                            <button onClick={() => setSelectedRfq(null)} className="text-slate-500 hover:text-blue-600 font-medium flex items-center">
                                <span className="mr-2">←</span> Back to Project Funding
                            </button>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedRfq.title}</h2>
                                        <p className="text-slate-500 mt-1">{selectedRfq.details}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-teal-600">₹{selectedRfq.totalBudget?.toLocaleString()}</div>
                                        <div className="mt-2">{renderRfqStatus(selectedRfq.status)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-8">
                                <h3 className="text-xl font-bold text-slate-800">Your Milestones (RFPs)</h3>
                                {selectedRfq.status === 'APPROVED' && (
                                    <button onClick={() => setShowCreateRfp(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                        + Request Release
                                    </button>
                                )}
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Milestone</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {rfps.map(r => (
                                            <tr key={r.id}>
                                                <td className="px-6 py-4 font-medium text-slate-900">{r.title}</td>
                                                <td className="px-6 py-4 text-slate-600">₹{r.amount?.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    {r.status === 'PENDING_PM' && <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">Waiting PM</span>}
                                                    {r.status === 'PENDING_ADMIN' && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Waiting Admin</span>}
                                                    {r.status === 'APPROVED' && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Released</span>}
                                                    {r.status === 'REJECTED' && <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Rejected</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        {rfps.length === 0 && <tr><td colSpan="3" className="px-6 py-6 text-center text-slate-400">No milestones.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {projects.map(pid => {
                                const rfq = rfqMap[pid];
                                return (
                                    <div key={pid} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">Project ID: {pid.substring(0, 8)}...</h3>
                                            <p className="text-sm text-slate-500">{surveys.filter(s => s.projectId === pid).length} active surveys</p>
                                        </div>
                                        <div>
                                            {rfq ? (
                                                <div className="text-right">
                                                    <div className="mb-2">{renderRfqStatus(rfq.status)}</div>
                                                    <button onClick={() => handleViewRfq(rfq)} className="text-blue-600 text-sm hover:underline">View Budget Details</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setShowCreateRfq(pid)} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">Create Budget Request (RFQ)</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {projects.length === 0 && <div className="text-center text-slate-400 py-10">No projects found.</div>}
                        </div>
                    )
                )}

                {/* OPERATIONS (EXPENSES) TAB */}
                {activeTab === 'operations' && (
                    !activeRfp ? (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-slate-800">Select Released Milestone to Add Expenses</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.values(rfqMap).flatMap(rfq =>
                                    (rfq?.status === 'APPROVED' ? [rfq] : [])
                                ).length === 0 && <div className="col-span-3 text-center text-slate-400 py-8">No Approved Projects with Releases found.</div>}

                                {Object.values(rfqMap).map(rfq => (
                                    rfq.status === 'APPROVED' && (
                                        <div key={rfq.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition cursor-pointer" onClick={() => {
                                            setSelectedRfq(rfq);
                                            handleViewRfq(rfq).then(() => {
                                                // After loading RFPs, filtering happens in next render step, but logic requires direct selection
                                                // For simplicity, we just load RFPs and let user pick one
                                                setActiveTab('operations_rfp_select');
                                            });
                                        }}>
                                            <h3 className="font-bold text-lg text-slate-800">{rfq.title}</h3>
                                            <p className="text-sm text-slate-500 mt-1">Budget: ₹{rfq.totalBudget?.toLocaleString()}</p>
                                            <div className="mt-4 text-blue-600 text-sm font-medium">Select Milestone →</div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in-up space-y-6">
                            <button onClick={() => setActiveRfp(null)} className="text-slate-500 hover:text-blue-600 font-medium flex items-center">
                                <span className="mr-2">←</span> Back to Milestones
                            </button>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h2 className="text-2xl font-bold text-slate-800">{activeRfp.title} (Released)</h2>
                                <p className="text-slate-500 mt-1">Total Released Amount: <span className="font-bold text-emerald-600">₹{activeRfp.amount?.toLocaleString()}</span></p>
                            </div>

                            <div className="flex justify-between items-center mt-6">
                                <h3 className="text-xl font-bold text-slate-800">Expense Log</h3>
                                <button onClick={() => setShowAddExpense(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">
                                    + Add Expense
                                </button>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expense</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {expenses.map(exp => (
                                            <tr key={exp.id}>
                                                <td className="px-6 py-4 font-medium text-slate-900">{exp.title}</td>
                                                <td className="px-6 py-4 text-slate-600">₹{exp.amount?.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    {exp.status === 'SUBMITTED' && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Submitted</span>}
                                                    {exp.status === 'VERIFIED' && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Verified</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        {expenses.length === 0 && <tr><td colSpan="3" className="px-6 py-6 text-center text-slate-400">No expenses recorded yet.</td></tr>}
                                    </tbody>
                                    <tfoot className="bg-slate-50">
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-slate-700 text-right">Total Utilized:</td>
                                            <td className="px-6 py-4 font-bold text-slate-900">₹{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )
                )}

                {/* Selection View for Operations (Inner Tab) */}
                {activeTab === 'operations_rfp_select' && (
                    <div className="animate-fade-in-up space-y-6">
                        <button onClick={() => { setActiveTab('operations'); setSelectedRfq(null); }} className="text-slate-500 hover:text-blue-600 font-medium flex items-center">
                            <span className="mr-2">←</span> Back to Projects
                        </button>
                        <h2 className="text-2xl font-bold text-slate-800">Select Milestone from {selectedRfq?.title}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {rfps.map(r => (
                                <div key={r.id} className={`p-6 rounded-xl border cursor-pointer transition ${r.status === 'APPROVED' ? 'bg-white border-slate-200 hover:shadow-md hover:border-teal-300' : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'}`}
                                    onClick={() => r.status === 'APPROVED' && handleViewExpenses(r)}
                                >
                                    <h3 className="font-bold text-slate-800">{r.title}</h3>
                                    <p className="text-sm text-slate-500">₹{r.amount?.toLocaleString()}</p>
                                    <div className={`mt-2 text-xs font-bold ${r.status === 'APPROVED' ? 'text-green-600' : 'text-slate-400'}`}>
                                        {r.status === 'APPROVED' ? 'Available for Utilization →' : r.status}
                                    </div>
                                </div>
                            ))}
                            {rfps.length === 0 && <div className="text-slate-400">No milestones found.</div>}
                        </div>
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="animate-fade-in-up space-y-8">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Milestone History</h2>
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                                        {allRfps.map(r => (
                                            <tr key={r.id}>
                                                <td className="px-6 py-4 font-medium text-slate-900">{r.title}</td>
                                                <td className="px-6 py-4 text-slate-600">₹{r.amount?.toLocaleString()}</td>
                                                <td className="px-6 py-4">{renderRfqStatus(r.status)}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</td>
                                            </tr>
                                        ))}
                                        {allRfps.length === 0 && <tr><td colSpan="4" className="px-6 py-6 text-center text-slate-400">No milestones found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Expense History</h2>
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expense</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proof</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {allExpenses.map(e => (
                                            <tr key={e.id}>
                                                <td className="px-6 py-4 font-medium text-slate-900">{e.title}</td>
                                                <td className="px-6 py-4 text-slate-600">₹{e.amount?.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    {e.status === 'VERIFIED' && <span className="text-green-600 font-medium">Verified</span>}
                                                    {e.status === 'REJECTED' && <span className="text-red-600 font-medium">Rejected</span>}
                                                    {e.status === 'SUBMITTED' && <span className="text-yellow-600">Pending</span>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-blue-600 truncate max-w-xs "><a href={e.proofUrl} target="_blank" rel="noreferrer">{e.proofUrl}</a></td>
                                            </tr>
                                        ))}
                                        {allExpenses.length === 0 && <tr><td colSpan="4" className="px-6 py-6 text-center text-slate-400">No expenses found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODALS */}
                {/* RFQ Modal */}
                {showCreateRfq && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold mb-4">Create Budget Request (RFQ)</h3>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Scope Title</label>
                                    <input className="w-full border p-2 rounded" placeholder="e.g. 3-Year Scholarship Program" value={rfqForm.title} onChange={e => setRfqForm({ ...rfqForm, title: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Details</label>
                                    <textarea className="w-full border p-2 rounded" placeholder="Scope details..." value={rfqForm.details} onChange={e => setRfqForm({ ...rfqForm, details: e.target.value })} />
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Multi-Year Budget Breakdown</label>
                                    {rfqForm.budgetBreakdown.map((row, index) => (
                                        <div key={index} className="flex space-x-2 mb-2">
                                            <input
                                                className="w-1/3 border p-2 rounded text-sm"
                                                placeholder="FY (e.g. 2024-25)"
                                                value={row.financialYear}
                                                onChange={e => {
                                                    const newBreakdown = [...rfqForm.budgetBreakdown];
                                                    newBreakdown[index].financialYear = e.target.value;
                                                    setRfqForm({ ...rfqForm, budgetBreakdown: newBreakdown });
                                                }}
                                            />
                                            <input
                                                type="number"
                                                className="w-1/3 border p-2 rounded text-sm"
                                                placeholder="Amount"
                                                value={row.amount}
                                                onChange={e => {
                                                    const newBreakdown = [...rfqForm.budgetBreakdown];
                                                    newBreakdown[index].amount = e.target.value;
                                                    setRfqForm({ ...rfqForm, budgetBreakdown: newBreakdown });
                                                }}
                                            />
                                            {index > 0 && (
                                                <button onClick={() => {
                                                    const newBreakdown = rfqForm.budgetBreakdown.filter((_, i) => i !== index);
                                                    setRfqForm({ ...rfqForm, budgetBreakdown: newBreakdown });
                                                }} className="text-red-500 hover:text-red-700 px-2">×</button>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={() => setRfqForm({ ...rfqForm, budgetBreakdown: [...rfqForm.budgetBreakdown, { financialYear: '', amount: '' }] })} className="text-sm text-blue-600 font-medium hover:underline">
                                        + Add Financial Year
                                    </button>

                                    <div className="mt-4 p-3 bg-slate-50 rounded text-right">
                                        <span className="text-sm text-slate-500 mr-2">Total Contract Value:</span>
                                        <span className="font-bold text-slate-800">
                                            ₹{rfqForm.budgetBreakdown.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 mt-4">
                                    <button onClick={() => setShowCreateRfq(null)} className="text-slate-500">Cancel</button>
                                    <button onClick={() => handleCreateRFQ(showCreateRfq)} className="bg-blue-600 text-white px-4 py-2 rounded">Submit Request</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* RFP Modal */}
                {showCreateRfp && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-2xl animate-fade-in-up">
                            <h3 className="text-xl font-bold mb-4">Request Fund Release (RFP)</h3>
                            <div className="space-y-4">
                                <input className="w-full border p-2 rounded" placeholder="Milestone Title" value={rfpForm.title} onChange={e => setRfpForm({ ...rfpForm, title: e.target.value })} />
                                <input type="number" className="w-full border p-2 rounded" placeholder="Amount (₹)" value={rfpForm.amount} onChange={e => setRfpForm({ ...rfpForm, amount: e.target.value })} />
                                <p className="text-xs text-slate-500">Remaining Budget: ₹{(selectedRfq.totalBudget - rfps.reduce((acc, r) => acc + (r.status !== 'REJECTED' ? r.amount : 0), 0)).toLocaleString()}</p>
                                <div className="flex justify-end space-x-3 mt-4">
                                    <button onClick={() => setShowCreateRfp(false)} className="text-slate-500">Cancel</button>
                                    <button onClick={handleCreateRFP} className="bg-green-600 text-white px-4 py-2 rounded">Submit</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Expense Modal */}
                {showAddExpense && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-2xl animate-fade-in-up">
                            <h3 className="text-xl font-bold mb-4">Add Expense Report</h3>
                            <div className="space-y-4">
                                <input className="w-full border p-2 rounded" placeholder="Expense Title / Vendor" value={expenseForm.title} onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })} />
                                <input type="number" className="w-full border p-2 rounded" placeholder="Amount (₹)" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                                <input className="w-full border p-2 rounded" placeholder="Proof URL (Optional)" value={expenseForm.proofUrl} onChange={e => setExpenseForm({ ...expenseForm, proofUrl: e.target.value })} />

                                {/* Dynamic Fields based on RFQ Format */}
                                {selectedRfq?.expenseFormat && selectedRfq.expenseFormat.length > 0 && (
                                    <div className="border-t pt-4 mt-4">
                                        <h4 className="text-sm font-bold text-slate-700 mb-2">Required Details</h4>
                                        <div className="space-y-3">
                                            {selectedRfq.expenseFormat.map((field, idx) => (
                                                <div key={idx}>
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                                        {field.name} {field.required && <span className="text-red-500">*</span>}
                                                    </label>
                                                    <input
                                                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                                                        className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white"
                                                        placeholder={`Enter ${field.name}`}
                                                        value={expenseForm.customData?.[field.name] || ''}
                                                        onChange={(e) => {
                                                            const newCustomData = { ...expenseForm.customData, [field.name]: e.target.value };
                                                            setExpenseForm({ ...expenseForm, customData: newCustomData });
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end space-x-3 mt-4">
                                    <button onClick={() => setShowAddExpense(false)} className="text-slate-500">Cancel</button>
                                    <button onClick={handleAddExpense} className="bg-teal-600 text-white px-4 py-2 rounded">Submit Expense</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default NgoDashboard;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CorporateDetailView from './views/CorporateDetailView';
import PMDetailView from './views/PMDetailView';
import ProjectList from './views/ProjectList';
import ProjectDetailView from './views/ProjectDetailView';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
    const { user, logout } = useAuth();

    // View State
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'management' | 'approvals' | 'projects'
    const [selectedPM, setSelectedPM] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);

    // Management State
    const [manageView, setManageView] = useState('pms'); // 'pms' | 'ngos'
    const [users, setUsers] = useState([]);
    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [msg, setMsg] = useState('');

    // Approval State
    const [pendingRfqs, setPendingRfqs] = useState([]);
    const [pendingRfps, setPendingRfps] = useState([]);
    const [loading, setLoading] = useState(false);

    // Association Modal State
    const [showAssocModal, setShowAssocModal] = useState(false);
    const [selectedNgo, setSelectedNgo] = useState(null);
    const [assocPmIds, setAssocPmIds] = useState([]);

    // Effects
    useEffect(() => {
        if (activeTab === 'management') fetchUsers();
        if (activeTab === 'approvals') fetchPendingApprovals();
    }, [activeTab]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/auth/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPendingApprovals = async () => {
        setLoading(true);
        try {
            const rfqRes = await api.get('/rfqs/pending-admin');
            setPendingRfqs(rfqRes.data);

            const rfpRes = await api.get('/rfps/pending-admin');
            setPendingRfps(rfpRes.data);
        } catch (err) {
            toast.error("Failed to fetch pending approvals");
        } finally {
            setLoading(false);
        }
    };

    // Management Functions
    const createUser = async (e, role) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', {
                name: newName,
                username: newUsername,
                password: newPassword,
                role: role
            });
            setMsg(`${role === 'PROJECT_MANAGER' ? 'PM' : 'NGO'} Created Successfully`);
            setNewName('');
            setNewUsername('');
            setNewPassword('');
            fetchUsers();
        } catch (err) {
            setMsg('Failed: ' + (err.response?.data?.error || err.message));
        }
    };

    // Approval Functions (RFQs)
    const handleApproveRfq = async (rfqId) => {
        try {
            await api.put(`/rfqs/${rfqId}/approve-admin`);
            toast.success("RFQ Final Approval Granted!");
            fetchPendingApprovals();
        } catch (err) {
            toast.error("Approval failed: " + err.message);
        }
    };

    const handleRejectRfq = async (rfqId) => {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;
        try {
            await api.put(`/rfqs/${rfqId}/reject`, { reason });
            toast.info("RFQ Rejected.");
            fetchPendingApprovals();
        } catch (err) {
            toast.error("Rejection failed: " + err.message);
        }
    };

    // Approval Functions (RFPs)
    const handleApproveRfp = async (rfpId) => {
        try {
            await api.put(`/rfps/${rfpId}/approve-admin`);
            toast.success("Milestone Final Release Approved!");
            fetchPendingApprovals();
        } catch (err) {
            toast.error(err.response?.data?.error || "Approval failed");
        }
    };

    const handleRejectRfp = async (rfpId) => {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;
        try {
            await api.put(`/rfps/${rfpId}/reject`, { reason });
            toast.info("Milestone Rejected.");
            fetchPendingApprovals();
        } catch (err) {
            toast.error(err.response?.data?.error || "Rejection failed");
        }
    };

    const openAssocModal = (ngo) => {
        setSelectedNgo(ngo);
        setAssocPmIds(ngo.associatedPmIds || []);
        setShowAssocModal(true);
    };

    const togglePmAssoc = (pmId) => {
        if (assocPmIds.includes(pmId)) {
            setAssocPmIds(assocPmIds.filter(id => id !== pmId));
        } else {
            setAssocPmIds([...assocPmIds, pmId]);
        }
    };

    const saveAssociations = async () => {
        try {
            const original = selectedNgo.associatedPmIds || [];
            const toAdd = assocPmIds.filter(id => !original.includes(id));
            const toRemove = original.filter(id => !assocPmIds.includes(id));

            for (const pmId of toAdd) await api.post(`/auth/users/${selectedNgo.id}/associate`, { pmId, remove: 'false' });
            for (const pmId of toRemove) await api.post(`/auth/users/${selectedNgo.id}/associate`, { pmId, remove: 'true' });

            setShowAssocModal(false);
            fetchUsers();
            toast.success("Associations updated successfully!");
        } catch (e) {
            toast.error("Failed to update associations: " + e.message);
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    // Edit User State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', username: '', role: '' });

    const openEditModal = (u) => {
        setEditUser(u);
        setEditForm({ name: u.name, username: u.username, role: u.role });
        setShowEditModal(true);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/auth/users/${editUser.id}`, editForm);
            toast.success("User updated successfully");
            setShowEditModal(false);
            fetchUsers();
        } catch (err) {
            toast.error("Update failed: " + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteUser = async (u) => {
        if (!window.confirm(`Are you sure you want to delete user ${u.username}? This cannot be undone.`)) return;
        try {
            await api.delete(`/auth/users/${u.id}`);
            toast.success("User deleted successfully");
            fetchUsers();
        } catch (err) {
            toast.error("Delete failed: " + (err.response?.data?.error || err.message));
        }
    };

    // Filtered Lists
    const pms = users.filter(u => u.role === 'PROJECT_MANAGER');
    const ngos = users.filter(u => u.role === 'NGO');

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10 w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-6">
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                                FormsFlow Admin
                            </h1>
                            <div className="hidden sm:flex space-x-2">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`px-3 py-1.5 rounded text-sm font-medium ${activeTab === 'overview' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('projects')}
                                    className={`px-3 py-1.5 rounded text-sm font-medium ${activeTab === 'projects' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Projects
                                </button>
                                <button
                                    onClick={() => setActiveTab('approvals')}
                                    className={`px-3 py-1.5 rounded text-sm font-medium ${activeTab === 'approvals' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Funding Approvals
                                </button>
                                <button
                                    onClick={() => setActiveTab('management')}
                                    className={`px-3 py-1.5 rounded text-sm font-medium ${activeTab === 'management' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Management
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link to="/create-survey" className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 shadow-sm transition">
                                + Create Survey
                            </Link>
                            <span className="text-sm text-slate-600">
                                {user?.username} <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded ml-1">ADMIN</span>
                            </span>
                            <button onClick={handleLogout} className="text-sm border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'projects' && (
                    <div>
                        {selectedProject ? (
                            <div className="space-y-4">
                                <button onClick={() => setSelectedProject(null)} className="text-sm text-slate-500 hover:text-blue-600 flex items-center">
                                    ← Back to Projects
                                </button>
                                <ProjectDetailView projectId={selectedProject.id} />
                            </div>
                        ) : (
                            <ProjectList onSelectProject={setSelectedProject} />
                        )}
                    </div>
                )}

                {activeTab === 'overview' && (
                    <div>
                        {selectedPM ? (
                            <div className="space-y-4">
                                <button onClick={() => setSelectedPM(null)} className="text-sm text-slate-500 hover:text-blue-600 flex items-center">
                                    ← Back to Overview
                                </button>
                                <PMDetailView pmId={selectedPM.id} pmName={selectedPM.name} isOwnView={selectedPM.id === user?.id} />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setSelectedPM({ id: user.id, name: 'My Surveys' })}
                                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center bg-blue-50 px-3 py-2 rounded-lg"
                                    >
                                        📂 View My Surveys
                                    </button>
                                </div>
                                <CorporateDetailView onSelectPM={setSelectedPM} />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'approvals' && (
                    <div className="animate-fade-in-up space-y-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-slate-800">Final Funding Approvals</h2>
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
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">RFQ Title</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Project ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Budget Requested</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {pendingRfqs.map(rfq => (
                                                <tr key={rfq.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-medium text-slate-900">{rfq.title}</td>
                                                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{rfq.projectId}</td>
                                                    <td className="px-6 py-4 text-slate-700 font-bold">₹{rfq.totalBudget?.toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">PM Approved</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <button
                                                            onClick={() => handleRejectRfq(rfq.id)}
                                                            className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveRfq(rfq.id)}
                                                            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
                                                        >
                                                            Final Approve
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {pendingRfqs.length === 0 && (
                                                <tr><td colSpan="5" className="px-6 py-6 text-center text-slate-400 text-sm">No pending budget requests.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* RFPs Table */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">
                                        Milestone Releases (RFPs)
                                    </div>
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Milestone</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">RFQ Ref</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {pendingRfps.map(rfp => (
                                                <tr key={rfp.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-medium text-slate-900">{rfp.title}</td>
                                                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{rfp.rfqId.substring(0, 8)}...</td>
                                                    <td className="px-6 py-4 text-slate-700 font-bold">₹{rfp.amount?.toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">PM Approved</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <button
                                                            onClick={() => handleRejectRfp(rfp.id)}
                                                            className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveRfp(rfp.id)}
                                                            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
                                                        >
                                                            Final Release
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {pendingRfps.length === 0 && (
                                                <tr><td colSpan="5" className="px-6 py-6 text-center text-slate-400 text-sm">No pending milestone requests.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'management' && (
                    <div className="flex gap-8">
                        <div className="w-48 flex-shrink-0">
                            <div className="space-y-1">
                                <button onClick={() => setManageView('pms')} className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${manageView === 'pms' ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    Project Managers
                                </button>
                                <button onClick={() => setManageView('ngos')} className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${manageView === 'ngos' ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    NGOs & Permissions
                                </button>
                            </div>
                        </div>
                        <div className="flex-1">
                            {/* Create User Form */}
                            <div className="bg-white shadow rounded-lg p-6 mb-6">
                                <h3 className="text-lg font-bold mb-4">Add {manageView === 'pms' ? 'Project Manager' : 'NGO'}</h3>
                                {msg && <div className={`mb-4 p-2 text-sm rounded ${msg.includes('Success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{msg}</div>}
                                <form onSubmit={(e) => createUser(e, manageView === 'pms' ? 'PROJECT_MANAGER' : 'NGO')} className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Name</label>
                                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 text-sm" required placeholder="Full Name" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Username</label>
                                        <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 text-sm" required placeholder="username" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Password</label>
                                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 text-sm" required placeholder="password" />
                                    </div>
                                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm h-10">Create</button>
                                </form>
                            </div>

                            {/* User List */}
                            <div className="bg-white shadow rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                            {manageView === 'ngos' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Associations</th>}
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {(manageView === 'pms' ? pms : ngos).map(u => (
                                            <tr key={u.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">@{u.username}</td>
                                                {manageView === 'ngos' && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {u.associatedPmIds?.length || 0} PMs Linked
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                                    {manageView === 'ngos' && (
                                                        <button onClick={() => openAssocModal(u)} className="text-blue-600 hover:text-blue-900">Manage PM Links</button>
                                                    )}
                                                    <button onClick={() => openEditModal(u)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                                    <button onClick={() => handleDeleteUser(u)} className="text-red-600 hover:text-red-900">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(manageView === 'pms' ? pms : ngos).length === 0 && (
                                            <tr><td colSpan="4" className="px-6 py-4 text-center text-sm text-slate-500">No users found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Association Modal */}
            {showAssocModal && selectedNgo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Associate PMs to {selectedNgo.name}</h2>
                        <div className="mb-4 max-h-60 overflow-y-auto space-y-2">
                            {pms.length === 0 ? <p className="text-slate-500">No PMs available.</p> : (
                                pms.map(pm => (
                                    <label key={pm.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded">
                                        <input
                                            type="checkbox"
                                            checked={assocPmIds.includes(pm.id)}
                                            onChange={() => togglePmAssoc(pm.id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-slate-700">{pm.name} (@{pm.username})</span>
                                    </label>
                                ))
                            )}
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setShowAssocModal(false)} className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button onClick={saveAssociations} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Associations</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && editUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 animate-fade-in-up">
                        <h2 className="text-xl font-bold mb-4">Edit User</h2>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <input type="text" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                    <option value="PROJECT_MANAGER">Project Manager</option>
                                    <option value="NGO">NGO</option>
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Update User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CorporateDetailView from './views/CorporateDetailView';
import PMDetailView from './views/PMDetailView';

const AdminDashboard = () => {
    const { user, logout } = useAuth();

    // View State
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'management'
    const [overviewLevel, setOverviewLevel] = useState('corporate'); // 'corporate' | 'pm'
    const [selectedPM, setSelectedPM] = useState(null);

    // Management State (Restored from previous version)
    const [manageView, setManageView] = useState('pms'); // 'pms' | 'ngos'
    const [users, setUsers] = useState([]);
    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [msg, setMsg] = useState('');

    // Association Modal State
    const [showAssocModal, setShowAssocModal] = useState(false);
    const [selectedNgo, setSelectedNgo] = useState(null);
    const [assocPmIds, setAssocPmIds] = useState([]);

    // Effects
    useEffect(() => {
        if (activeTab === 'management') {
            fetchUsers();
        }
    }, [activeTab]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/auth/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
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
        } catch (e) {
            alert("Failed to update associations: " + e.message);
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
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
                                <Link
                                    to="/projects"
                                    className={`px-3 py-1.5 rounded text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50`}
                                >
                                    Projects
                                </Link>
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
                {activeTab === 'overview' ? (
                    // Overview Tab (Drill Down)
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
                ) : (
                    // Management Tab (Tables/Forms)
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
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {manageView === 'ngos' && (
                                                        <button onClick={() => openAssocModal(u)} className="text-blue-600 hover:text-blue-900">Manage PM Links</button>
                                                    )}
                                                    {/* Add Delete/Edit later */}
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

            {/* Association Modal (Copied from previous step) */}
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
        </div>
    );
};

export default AdminDashboard;

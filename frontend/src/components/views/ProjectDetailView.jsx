import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import ConfirmationModal from '../ConfirmationModal';

const ProjectDetailView = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [project, setProject] = useState(null);
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pms, setPms] = useState([]);

    // Assign PM Modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedPmId, setSelectedPmId] = useState('');
    const [assigning, setAssigning] = useState(false);

    // Confirmation Modal
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        pmId: null
    });

    useEffect(() => {
        fetchData();
        if (isAdmin()) fetchPms();
    }, [id]);

    const isAdmin = () => user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    const fetchData = async () => {
        setLoading(true);
        try {
            const [projRes, surveyRes] = await Promise.all([
                api.get(`/projects/${id}`),
                api.get(`/projects/${id}/surveys`)
            ]);
            setProject(projRes.data);
            setSurveys(surveyRes.data);
        } catch (error) {
            console.error("Failed to fetch details", error);
            toast.error("Failed to load project details.");
        } finally {
            setLoading(false);
        }
    };

    const fetchPms = async () => {
        try {
            const res = await api.get('/auth/users');
            setPms(res.data.filter(u => u.role === 'PROJECT_MANAGER'));
        } catch (e) {
            console.error("Failed to fetch PMs", e);
        }
    };

    const handleAddPm = async () => {
        setAssigning(true);
        try {
            await api.post(`/projects/${id}/managers`, { pmId: selectedPmId });
            // Refresh
            const res = await api.get(`/projects/${id}`);
            setProject(res.data);

            setShowAssignModal(false);
            setSelectedPmId('');
            toast.success("Project Manager added successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to add Project Manager.");
        } finally {
            setAssigning(false);
        }
    };

    const handleRemovePm = (pmId) => {
        setConfirmModal({ isOpen: true, pmId });
    };

    const handleConfirmRemove = async () => {
        const pmId = confirmModal.pmId;
        if (!pmId) return;

        try {
            await api.delete(`/projects/${id}/managers/${pmId}`);
            // Refresh
            const res = await api.get(`/projects/${id}`);
            setProject(res.data);
            toast.success("Project Manager removed.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to remove Project Manager.");
        } finally {
            setConfirmModal({ isOpen: false, pmId: null });
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading details...</div>;
    if (!project) return <div className="p-8 text-center text-red-500">Project not found.</div>;

    // Helper to get PM names
    const assignedPmIds = project.projectManagerIds || [];

    return (
        <div className="space-y-6 animate-fade-in-up md:p-6 p-4">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-slate-500 mb-4">
                <Link to="/projects" className="hover:text-blue-600">Projects</Link>
                <span>/</span>
                <span className="font-semibold text-slate-800">{project.name}</span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">{project.name}</h1>
                        <p className="text-slate-600 max-w-2xl">{project.description}</p>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center space-x-2 text-slate-600">
                        <span className="font-semibold">Status:</span>
                        <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 text-xs uppercase">
                            {project.status}
                        </span>
                    </div>
                </div>

                {/* Managed PM List */}
                <div className="mt-6 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-800">Assigned Project Managers</h3>
                        {isAdmin() && (
                            <button
                                onClick={() => setShowAssignModal(true)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                + Add Manager
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {assignedPmIds.length === 0 && <span className="text-slate-400 text-sm italic">No managers assigned.</span>}

                        {assignedPmIds.map(pmId => {
                            const pm = pms.find(u => u.id === pmId);
                            const name = pm ? pm.name : 'Unknown PM';
                            return (
                                <div key={pmId} className="flex items-center space-x-1 bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm">
                                    <span>{name}</span>
                                    {isAdmin() && (
                                        <button onClick={() => handleRemovePm(pmId)} className="text-slate-400 hover:text-red-500 ml-1">×</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Surveys Section */}
            <div className="flex items-center justify-between mt-8">
                <h2 className="text-xl font-bold text-slate-800">Surveys in this Project</h2>
                <Link
                    to="/create-survey"
                    state={{ projectId: id }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition flex items-center text-sm"
                >
                    <span className="mr-1">+</span> Add Survey
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Survey Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {surveys.map(survey => (
                            <tr key={survey.id} className="hover:bg-blue-50 transition group">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{survey.title}</div>
                                    <div className="text-xs text-slate-400">{survey.slug}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600">{survey.status}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link to={`/surveys/${survey.id}/responses`} className="text-blue-600 hover:underline text-sm font-medium">
                                        View Dashboard →
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {surveys.length === 0 && (
                            <tr>
                                <td colSpan="3" className="px-6 py-8 text-center text-slate-400">
                                    No surveys yet. Create one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ASSIGN PM MODAL */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                        <h2 className="text-xl font-bold mb-4 text-slate-800">Add Project Manager</h2>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Select Manager</label>
                            <select
                                value={selectedPmId}
                                onChange={(e) => setSelectedPmId(e.target.value)}
                                className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">Select a PM...</option>
                                <option disabled className="text-gray-400">---</option>
                                {pms.filter(pm => !assignedPmIds.includes(pm.id)).map(pm => (
                                    <option key={pm.id} value={pm.id}>{pm.name} (@{pm.username})</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button onClick={handleAddPm} disabled={assigning || !selectedPmId} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors">Add Manager</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmRemove}
                title="Remove Project Manager"
                message="Are you sure you want to remove this Project Manager from the project?"
                isDanger={true}
                confirmText="Remove"
            />
        </div>
    );
};

export default ProjectDetailView;

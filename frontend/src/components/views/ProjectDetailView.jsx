import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
            if (projRes.data.projectManagerId) setSelectedPmId(projRes.data.projectManagerId);
        } catch (error) {
            console.error("Failed to fetch details", error);
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

    const handleAssignPm = async () => {
        setAssigning(true);
        try {
            const updatedProject = { ...project, projectManagerId: selectedPmId };
            await api.put(`/projects/${id}`, updatedProject);
            setProject(updatedProject);
            setShowAssignModal(false);
            alert("Project Manager assigned successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to assign PM");
        } finally {
            setAssigning(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading details...</div>;
    if (!project) return <div className="p-8 text-center text-red-500">Project not found.</div>;

    const pmName = pms.find(p => p.id === project.projectManagerId)?.name || 'Unassigned';

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
                    {isAdmin() && (
                        <button
                            onClick={() => setShowAssignModal(true)}
                            className="text-sm bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full hover:bg-slate-200 transition flex items-center"
                        >
                            👤 {project.projectManagerId ? 'Change PM' : 'Assign PM'}
                        </button>
                    )}
                </div>

                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center space-x-2 text-slate-600">
                        <span className="font-semibold">Project Manager:</span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                            {project.projectManagerId ? pmName : 'None Assigned'}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-600">
                        <span className="font-semibold">Status:</span>
                        <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 text-xs uppercase">
                            {project.status}
                        </span>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                        <h2 className="text-xl font-bold mb-4 text-slate-800">Assign Project Manager</h2>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Select Manager</label>
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
                            <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 border border-slate-300 rounded text-slate-700">Cancel</button>
                            <button onClick={handleAssignPm} disabled={assigning || !selectedPmId} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetailView;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ProjectList = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // New Project Form
    const [newProject, setNewProject] = useState({ name: '', description: '' });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await api.post('/projects', newProject);
            setProjects([...projects, res.data]);
            setShowCreateModal(false);
            setNewProject({ name: '', description: '' });
            alert("Project created successfully!");
        } catch (error) {
            console.error("Failed to create project", error);
            alert("Failed to create project.");
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading projects...</div>;

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    return (
        <div className="space-y-8 animate-fade-in-up p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Projects</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {isAdmin ? 'Manage all projects and assignments.' : 'Projects assigned to you.'}
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition flex items-center"
                    >
                        <span className="mr-1">+</span> New Project
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                    <Link to={`/projects/${project.id}`} key={project.id} className="group block">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-blue-300 transition h-full flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-lg ${project.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                    📁
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${project.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-100 text-slate-500'}`}>
                                    {project.status}
                                </span>
                            </div>

                            <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-blue-600 transition">{project.name}</h3>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{project.description || 'No description provided.'}</p>

                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className="text-xs text-slate-400">
                                    Created {new Date(project.createdAt).toLocaleDateString()}
                                </span>
                                <span className="text-sm font-medium text-blue-600 group-hover:translate-x-1 transition">
                                    View Details →
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}

                {projects.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p>No projects found.</p>
                        {isAdmin && <button onClick={() => setShowCreateModal(true)} className="text-blue-600 hover:underline mt-2">Create your first project</button>}
                    </div>
                )}
            </div>

            {/* CREATE PROJECT MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                        <h2 className="text-xl font-bold mb-4 text-slate-800">Create New Project</h2>
                        <form onSubmit={handleCreateProject}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        value={newProject.name}
                                        onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                        placeholder="e.g. Health Survey 2024"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea
                                        className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        rows="3"
                                        value={newProject.description}
                                        onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                                        placeholder="Brief description of the project goals..."
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectList;

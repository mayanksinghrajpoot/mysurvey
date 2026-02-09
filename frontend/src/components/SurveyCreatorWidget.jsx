import React, { useEffect, useState } from 'react';
import { SurveyCreatorComponent, SurveyCreator } from 'survey-creator-react';
import 'survey-core/survey-core.min.css';
import 'survey-creator-core/survey-creator-core.min.css';
import api from '../services/api';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const SurveyCreatorWidget = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    // Get Project ID from State or URL
    const [projectId, setProjectId] = useState(location.state?.projectId || searchParams.get('projectId'));

    // Project Selection Modal State
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(false);

    useEffect(() => {
        // If PM and no project is selected, force selection
        if (!projectId && user?.role === 'PROJECT_MANAGER') {
            fetchProjects();
            setShowProjectModal(true);
        }
    }, [projectId, user]);

    const fetchProjects = async () => {
        setLoadingProjects(true);
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (error) {
            console.error("Failed to fetch projects", error);
            toast.error("Could not load your projects.");
        } finally {
            setLoadingProjects(false);
        }
    }

    const handleProjectSelect = (pid) => {
        setProjectId(pid);
        setShowProjectModal(false);
    }

    const creator = React.useMemo(() => {
        const options = {
            showLogicTab: true,
            autoSaveEnabled: false
        };
        const newCreator = new SurveyCreator(options);

        newCreator.saveSurveyFunc = async (saveNo, callback) => {
            // Block save if no project (shouldn't happen with modal, but double check)
            if (!projectId && user?.role === 'PROJECT_MANAGER') {
                toast.warning("You must select a project first.");
                setShowProjectModal(true);
                callback(saveNo, false);
                return;
            }

            try {
                // ... (slugify logic) ...
                const survey = newCreator.survey;
                const pages = survey.pages;

                // Helper to slugify text
                const slugify = (text) => {
                    return text.toString().toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^\w\-]+/g, '')
                        .replace(/\-\-+/g, '-')
                        .replace(/^-+/, '')
                        .replace(/-+$/, '');
                };

                pages.forEach(page => {
                    page.elements.forEach(el => {
                        if (el.title && el.name.match(/^question\d+$/)) {
                            const newName = slugify(el.title);
                            if (newName && newName !== el.name) {
                                if (!survey.getQuestionByName(newName)) {
                                    el.name = newName;
                                }
                            }
                        }
                    });
                });

                const surveyJson = newCreator.JSON;
                const payload = {
                    title: surveyJson.title || 'Untitled Survey',
                    surveyJson: surveyJson,
                    projectId: projectId // Attach Project ID
                };

                await api.post('/surveys', payload);
                callback(saveNo, true);

                if (projectId) {
                    navigate(`/projects/${projectId}`);
                } else {
                    navigate('/dashboard');
                }
            } catch (err) {
                console.error(err);
                callback(saveNo, false);
                toast.error('Error saving survey: ' + (err.response?.data?.message || err.message));
            }
        };

        return newCreator;
    }, [navigate, projectId, user]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <nav className="bg-white shadow-sm border-b border-slate-200 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                                FormsFlow
                            </span>
                            <span className="mx-2 text-slate-300">/</span>
                            <span className="text-gray-600">Survey Creator</span>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition"
                            >
                                Close & Exit
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Context Bar */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center text-sm text-slate-600">
                    <span className="mr-2">Creating Survey for:</span>
                    {projectId ? (
                        <span className="font-bold text-blue-600 flex items-center">
                            📁 {projects.find(p => p.id === projectId)?.name || 'Project ' + projectId}
                        </span>
                    ) : (
                        <span className="font-bold text-purple-600 flex items-center">
                            🏢 Entire Organization (Global)
                        </span>
                    )}
                </div>
                {user?.role !== 'PROJECT_MANAGER' && (
                    <button
                        onClick={() => { fetchProjects(); setShowProjectModal(true); }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                        Change Context
                    </button>
                )}
            </div>
            <div className="flex-1 relative h-screen">
                <SurveyCreatorComponent creator={creator} />
            </div>

            {/* Project Selection Modal */}
            {showProjectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-8 animate-fade-in-up">
                        <h2 className="text-2xl font-bold mb-2 text-slate-800">Select a Project</h2>
                        <p className="text-slate-600 mb-6">You must create this survey inside a project.</p>

                        {loadingProjects ? (
                            <div className="text-center py-8 text-slate-500">Loading your projects...</div>
                        ) : projects.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-red-500 mb-4">You are not assigned to any projects.</p>
                                <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-slate-200 rounded-lg text-slate-700">Go Back</button>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {projects.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleProjectSelect(p.id)}
                                        className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition group"
                                    >
                                        <div className="font-bold text-slate-800 group-hover:text-blue-700">{p.name}</div>
                                        {p.description && <div className="text-sm text-slate-500 mt-1 truncate">{p.description}</div>}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                            <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-400 hover:text-slate-600">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SurveyCreatorWidget;

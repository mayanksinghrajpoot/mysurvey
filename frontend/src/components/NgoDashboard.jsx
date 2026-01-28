import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const NgoDashboard = () => {
    const { user, logout } = useAuth();
    const [surveys, setSurveys] = useState([]);
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssignedSurveys();
    }, []);

    const fetchAssignedSurveys = async () => {
        setLoading(true);
        try {
            // For NGO, /surveys returns only assigned ones (backend filtered)
            const res = await api.get('/surveys');
            setSurveys(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    if (loading) return <div className="p-10 text-center">Loading assigned surveys...</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
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
                {selectedSurvey ? (
                    <div className="animate-fade-in-up space-y-6">
                        <button onClick={() => setSelectedSurvey(null)} className="text-slate-500 hover:text-blue-600 font-medium flex items-center">
                            <span className="mr-2">←</span> Back to Surveys
                        </button>
                        <h2 className="text-3xl font-bold text-slate-800">{selectedSurvey.title}</h2>

                        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
                            <p className="text-slate-500 mb-6 max-w-lg mx-auto">
                                You are assigned to collect responses for this survey.
                                Click below to open the survey form.
                            </p>

                            <a
                                href={`/survey/${selectedSurvey.id}?ref=${user.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-blue-700 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1"
                            >
                                Start Survey Collection
                            </a>

                            <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-4 max-w-sm mx-auto">
                                <Link to={`/surveys/${selectedSurvey.id}/responses`} className="text-sm text-blue-600 hover:underline">
                                    View Past Responses
                                </Link>
                                <button onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/survey/${selectedSurvey.id}?ref=${user.id}`);
                                    alert("Link copied!");
                                }} className="text-sm text-slate-500 hover:text-slate-800">
                                    Copy Link
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Assigned Surveys</h2>
                            <span className="text-sm text-slate-500">{surveys.length} Active</span>
                        </div>

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
                                        <tr
                                            key={s.id}
                                            onClick={() => setSelectedSurvey(s)}
                                            className="hover:bg-teal-50 cursor-pointer transition"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{s.title}</div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5">{s.id.substring(0, 8)}...</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <span className="text-teal-600 font-bold">Open →</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {surveys.length === 0 && (
                                        <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400">No surveys assigned to you yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default NgoDashboard;

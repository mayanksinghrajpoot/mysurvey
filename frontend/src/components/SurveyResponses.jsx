import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const SurveyResponses = () => {
    const { id } = useParams();
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResponses = async () => {
            try {
                const role = localStorage.getItem('role');
                const config = {};
                if (role === 'ADMIN') {
                    // For Admin, we use Global View (empty header) to bypass the interceptor's default tenant injection
                    // This allows Admin to view responses for ANY survey regardless of which tenant owns it
                    config.headers = { 'X-TENANT-ID': '' };
                }
                const res = await api.get(`/surveys/${id}/responses`, config);
                setResponses(res.data);
            } catch (err) {
                console.error("Failed to fetch responses", err);
            } finally {
                setLoading(false);
            }
        };
        fetchResponses();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-slate-500 flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Loading responses...
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white shadow-sm border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                                FormsFlow
                            </span>
                        </div>
                        <div className="flex items-center">
                            <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                                &larr; Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Survey Responses</h2>
                    <p className="mt-1 text-sm text-slate-500">Viewing submissions for survey ID: <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{id}</span></p>
                </div>

                {responses.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <p className="text-slate-500">No responses collected yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submission ID</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted At</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {responses.map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                {r.id.substring(0, 8)}...
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {new Date(r.submittedAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                <div className="bg-slate-50 rounded border border-slate-200 p-2 font-mono text-xs overflow-auto max-h-32 max-w-lg">
                                                    <pre>{JSON.stringify(r.answers?.answers || r.answers, null, 2)}</pre>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SurveyResponses;

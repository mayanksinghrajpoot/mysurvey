import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const SurveyResponses = () => {
    const { id } = useParams();
    const { user } = useAuth();

    const [responses, setResponses] = useState([]);
    const [survey, setSurvey] = useState(null);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);

    // User Mapping and Filtering
    const [userMap, setUserMap] = useState({});
    const [uniqueRespondents, setUniqueRespondents] = useState([]);
    const [filterRespondent, setFilterRespondent] = useState('ALL');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const role = localStorage.getItem('role'); // Or user.role
                const config = {};
                // Admin context handled by RBAC, but keep tenant override if needed?
                // Actually OrganizationContext handles it.

                // Fetch Survey and Responses
                const [surveyRes, responsesRes] = await Promise.all([
                    api.get(`/surveys/${id}`),
                    api.get(`/surveys/${id}/responses`)
                ]);

                const surveyDef = surveyRes.data;
                const respData = responsesRes.data;

                setSurvey(surveyDef);
                setResponses(respData);

                // Fetch Users for Mapping (Only if PM or Admin)
                // NGOs might not have permission to list all users
                const canFetchUsers = role === 'PROJECT_MANAGER' || role === 'ADMIN' || role === 'SUPER_ADMIN';
                let users = [];
                if (canFetchUsers) {
                    try {
                        const usersRes = await api.get('/auth/users');
                        users = usersRes.data;
                        const map = {};
                        users.forEach(u => map[u.id] = u);
                        setUserMap(map);
                    } catch (e) {
                        console.warn("Could not fetch users for mapping", e);
                    }
                }

                // Extract Unique Respondents for Filter
                const respondents = [...new Set(respData.map(r => r.respondentId).filter(Boolean))];
                setUniqueRespondents(respondents);

                // Extract Columns from Survey Schema
                const cols = [];
                const pages = surveyDef.surveyJson?.pages || [];
                pages.forEach(page => {
                    (page.elements || []).forEach(el => {
                        if (el.name) {
                            cols.push({
                                key: el.name,
                                title: el.title || el.name,
                                type: el.type
                            });
                        }
                    });
                });
                setColumns(cols);

            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setLoading(true);
            await api.post(`/surveys/${id}/import`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Import Failed: ' + (err.response?.data || err.message));
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/surveys/${id}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `survey_${id}_responses.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert("Export failed: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const getRespondentName = (id) => {
        if (!id) return 'Anonymous';
        if (userMap[id]) return userMap[id].username + (userMap[id].role === 'NGO' ? ' (NGO)' : ` (${userMap[id].role})`);
        return id.substring(0, 8) + '...'; // Fallback to partial ID
    };

    const filteredResponses = filterRespondent === 'ALL'
        ? responses
        : responses.filter(r => r.respondentId === filterRespondent);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-slate-500 flex items-center">Fetching data...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <nav className="bg-white shadow-sm border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                                FormsFlow
                            </span>
                            <span className="mx-2 text-slate-300">/</span>
                            <span className="text-sm font-medium text-slate-600">{survey?.title || 'Survey'} Responses</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded shadow transition">
                                Export
                            </button>
                            <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded shadow transition">
                                <span>Import</span>
                                <input type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
                            </label>
                            <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                                Back
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 overflow-auto bg-slate-100 p-4 sm:p-8">
                <div className="max-w-7xl mx-auto space-y-4">

                    {/* Filters */}
                    {(user?.role === 'PROJECT_MANAGER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                        <div className="bg-white p-4 rounded shadow flex items-center space-x-4">
                            <label className="text-sm font-medium text-slate-700">Filter by Respondent:</label>
                            <select
                                value={filterRespondent}
                                onChange={(e) => setFilterRespondent(e.target.value)}
                                className="border-gray-300 rounded px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                                <option value="ALL">All Respondents</option>
                                {uniqueRespondents.map(id => (
                                    <option key={id} value={id}>
                                        {getRespondentName(id)}
                                    </option>
                                ))}
                            </select>
                            <div className="text-xs text-slate-500">
                                Showing {filteredResponses.length} of {responses.length} responses.
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                        {filteredResponses.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">No responses found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r border-slate-200">S.No</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-r border-slate-200">Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-r border-slate-200">Respondent</th>
                                            {columns.map(col => (
                                                <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-slate-600 font-bold uppercase tracking-wider border-r border-slate-200 min-w-[150px]">
                                                    {col.title}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {filteredResponses.map((r, rowIndex) => {
                                            const answers = r.answers?.answers || r.answers || {};
                                            return (
                                                <tr key={r.id} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50 hover:bg-slate-100'}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500 sticky left-0 bg-inherit border-r border-slate-200">{rowIndex + 1}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 border-r border-slate-200">{new Date(r.submittedAt).toLocaleString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 border-r border-slate-200">
                                                        {getRespondentName(r.respondentId)}
                                                    </td>
                                                    {columns.map(col => {
                                                        let val = answers[col.key];
                                                        if (Array.isArray(val)) val = val.join(', ');
                                                        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                                                        if (val === undefined || val === null) val = '-';
                                                        return (
                                                            <td key={col.key} className="px-6 py-4 text-sm text-slate-800 border-r border-slate-200 truncate max-w-xs" title={val}>{val}</td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SurveyResponses;

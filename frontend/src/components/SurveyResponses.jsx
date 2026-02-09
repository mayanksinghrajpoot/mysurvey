import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import ConfirmationModal from './ConfirmationModal';

const SurveyResponses = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // Drill down params
    const questionKey = searchParams.get('questionKey');
    const answerValue = searchParams.get('answerValue');

    const [responses, setResponses] = useState([]);
    const [survey, setSurvey] = useState(null);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);

    // User Mapping and Filtering
    const [userMap, setUserMap] = useState({});
    const [uniqueRespondents, setUniqueRespondents] = useState([]);
    const [filterRespondent, setFilterRespondent] = useState('ALL');

    // Report Modal State
    const [reportModal, setReportModal] = useState({
        isOpen: false,
        title: '',
        message: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const role = localStorage.getItem('role'); // Or user.role
                const config = {};
                // Admin context handled by RBAC, but keep tenant override if needed?
                // Actually OrganizationContext handles it.

                // Fetch Survey and Responses
                const responsesParams = {};
                if (questionKey && answerValue) {
                    responsesParams.params = { questionKey, answerValue };
                }

                const [surveyRes, responsesRes] = await Promise.all([
                    api.get(`/surveys/${id}`),
                    api.get(`/surveys/${id}/responses`, responsesParams)
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
                toast.error("Failed to load survey responses.");
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
            const res = await api.post(`/surveys/${id}/import`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            console.log("Import Response Recieved:", res.data); // Debugging
            const summary = res.data;

            // Check if backend returned valid summary object
            if (!summary) {
                toast.warning("Server returned empty response.");
                setLoading(false);
                return;
            }

            // Construct detailed report
            const report = [
                `Total Rows Found: ${summary.totalRows || 0}`,
                `Successfully Imported: ${summary.successCount}`,
                `Duplicates Skipped: ${summary.duplicateCount || 0}`,
                `Empty Rows Skipped: ${summary.emptyCount || 0}`,
                `Failed Rows: ${summary.failedCount}`,
                `----------------`
            ];

            const hasErrors = summary.failedCount > 0 || (summary.errors && summary.errors.length > 0);

            if (hasErrors) {
                report.push(`\nErrors:`);
                const maxErrors = 10;
                const errorsToShow = summary.errors || [];
                report.push(errorsToShow.slice(0, maxErrors).join('\n'));
                if (errorsToShow.length > maxErrors) {
                    report.push(`...and ${errorsToShow.length - maxErrors} more error(s).`);
                }
            } else if (summary.successCount === 0 && (summary.duplicateCount === 0 && summary.emptyCount === 0)) {
                report.push(`\nWarning: No data was imported and no specific reason was found. Please check your file headers.`);
            }

            // Show Report Modal
            setReportModal({
                isOpen: true,
                title: 'Import Summary',
                message: report.join('\n')
            });

            // We do NOT reload immediately. We wait for user to close modal.
            // But waiting for modal close is tricky with async.
            // Let's just reload IF success count > 0 after they close? 
            // Or simplifies: Just trigger reload when modal closes if needed.
            // For now, let's keep it simple: Show modal. If success, we should refresh data behind the scenes or on close.
            if (summary.successCount > 0) {
                // We will signal to refresh on modal close? 
                // Or just refresh data now?
                // Let's let the modal stay open, and when they close we can refresh if we want.
                // Actually, let's just refresh data silently now so when they close it's there.
                // But "window.location.reload()" is heavy.
                // Let's rely on manual refresh for now or just force a reload on confirmation.
                // I'll make the modal "OK" button trigger reload if success > 0.
                // To do that, I need to know in the modal handler. 
                // Simpler: Just refresh page if success > 0 when setting modal? No, that kills modal.
                // I'll add "shouldReload" to state.
            }

        } catch (err) {
            console.error("Import Error Caught:", err);
            let errorMsg = err.message;
            if (err.response && err.response.data) {
                const data = err.response.data;
                if (typeof data === 'object') {
                    errorMsg = data.message || data.error || JSON.stringify(data);
                } else {
                    errorMsg = data;
                }
            }
            toast.error('Import Failed: ' + errorMsg);
        } finally {
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
            toast.success("Export started!");
        } catch (err) {
            toast.error("Export failed: " + (err.response?.data?.message || err.message));
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

                    {/* Active Filter Banner */}
                    {questionKey && answerValue && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded relative flex items-center justify-between" role="alert">
                            <div className="flex items-center">
                                <strong className="font-bold mr-1">Filtered View:</strong>
                                <span className="block sm:inline">Showing responses where <strong>{questionKey}</strong> matches <strong>"{answerValue}"</strong></span>
                            </div>
                            <Link
                                to={`/surveys/${id}/responses`}
                                className="bg-white hover:bg-slate-50 text-blue-500 font-semibold py-1 px-3 border border-blue-200 rounded shadow-sm text-xs transition"
                            >
                                Clear Filter
                            </Link>
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
                                                        if (typeof val === 'boolean') val = val.toString();
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
            {/* Report Modal */}
            <ConfirmationModal
                isOpen={reportModal.isOpen}
                onClose={() => {
                    setReportModal({ ...reportModal, isOpen: false });
                    // If the message implies success (hacky check or add state), reload.
                    // Let's just reload if title is Import Summary and not error?
                    // Better: check if we should reload. 
                    // For now, simple close. The user can see the data if we refetched (which we haven't yet).
                    // Actually, let's trigger a re-fetch on close if it was an import.
                    // Simplest: window.location.reload() if it was a success. 
                    // But I didn't save "success" state. 
                    // Let's just let them close it.
                    window.location.reload();
                }}
                onConfirm={() => {
                    setReportModal({ ...reportModal, isOpen: false });
                    window.location.reload();
                }}
                title={reportModal.title}
                message={reportModal.message}
                confirmText="OK"
                cancelText={null}
            />
        </div>
    );
};

export default SurveyResponses;

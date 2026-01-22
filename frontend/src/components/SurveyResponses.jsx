import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const SurveyResponses = () => {
    const { id } = useParams();
    const [responses, setResponses] = useState([]);
    const [survey, setSurvey] = useState(null);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const role = localStorage.getItem('role');
                const config = {};
                if (role === 'ADMIN') {
                    // For Admin, we use Global View (empty header) to bypass the interceptor's default tenant injection
                    config.headers = { 'X-TENANT-ID': '' };
                }

                // Parallel fetch for Schema and Data
                const [surveyRes, responsesRes] = await Promise.all([
                    api.get(`/surveys/${id}`, config),
                    api.get(`/surveys/${id}/responses`, config)
                ]);

                const surveyDef = surveyRes.data;
                setSurvey(surveyDef);
                setResponses(responsesRes.data);

                // Extract Columns from Survey Schema
                const cols = [];
                const pages = surveyDef.surveyJson?.pages || [];
                pages.forEach(page => {
                    (page.elements || []).forEach(el => {
                        // We want all input types to be columns
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

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-slate-500 flex items-center">
                Fetching data...
            </div>
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
                        <div className="flex items-center">
                            <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                                &larr; Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 overflow-auto bg-slate-100 p-4 sm:p-8">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    {responses.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">No responses collected yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {/* Fixed Meta Columns */}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                                            S.No
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-r border-slate-200">
                                            Time
                                        </th>

                                        {/* Dynamic Question Columns */}
                                        {columns.map(col => (
                                            <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-slate-600 font-bold uppercase tracking-wider border-r border-slate-200 min-w-[150px]">
                                                {col.title}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {responses.map((r, rowIndex) => {
                                        // Parse answers logic: handle both new format (r.answers.answers) and old format (r.answers)
                                        // Some stored responses might be nested differently depending on how they were saved
                                        const answers = r.answers?.answers || r.answers || {};

                                        return (
                                            <tr key={r.id} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50 hover:bg-slate-100'}>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500 sticky left-0 bg-inherit border-r border-slate-200">
                                                    {rowIndex + 1}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 border-r border-slate-200">
                                                    {new Date(r.submittedAt).toLocaleString()}
                                                </td>

                                                {/* Map answers to columns */}
                                                {columns.map(col => {
                                                    let val = answers[col.key];

                                                    // Handle Arrays (CheckBox) or Objects
                                                    if (Array.isArray(val)) val = val.join(', ');
                                                    if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                                                    if (val === undefined || val === null) val = '-';

                                                    return (
                                                        <td key={col.key} className="px-6 py-4 text-sm text-slate-800 border-r border-slate-200 truncate max-w-xs" title={val}>
                                                            {val}
                                                        </td>
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
            </main>
        </div>
    );
};

export default SurveyResponses;

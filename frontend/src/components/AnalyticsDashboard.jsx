import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const AnalyticsDashboard = () => {
    const { id } = useParams();
    const [survey, setSurvey] = useState(null);
    const [chartsData, setChartsData] = useState({});
    const [timelineData, setTimelineData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSurveyAndData();
    }, [id]);

    const fetchSurveyAndData = async () => {
        try {
            const role = localStorage.getItem('role');
            const config = {};
            if (role === 'ADMIN') {
                config.headers = { 'X-TENANT-ID': '' };
            }

            // 1. Fetch Survey Definition
            const surveyRes = await api.get(`/surveys/${id}`, config);
            const surveyDef = surveyRes.data;
            setSurvey(surveyDef);

            // 2. Identify Chart-able questions (radiogroup, dropdown, rating, boolean)
            // This is a simplified traversal. Nested panels/pages need recursion in production.
            const questions = [];
            const pages = surveyDef.surveyJson?.pages || [];
            pages.forEach(page => {
                (page.elements || []).forEach(el => {
                    if (['radiogroup', 'dropdown', 'rating', 'boolean'].includes(el.type)) {
                        questions.push({ name: el.name, title: el.title || el.name });
                    }
                });
            });

            // 3. Fetch Data for each question
            const dataMap = {};
            await Promise.all(questions.map(async (q) => {
                try {
                    const res = await api.get(`/analytics/${id}/questions/${q.name}`, config);
                    dataMap[q.name] = res.data;
                } catch (e) {
                    console.error(`Failed to load data for ${q.name}`, e);
                }
            }));
            setChartsData(dataMap);

            // 4. Fetch Timeline
            const timelineRes = await api.get(`/analytics/${id}/timeline`, config);
            setTimelineData(timelineRes.data);

        } catch (err) {
            console.error("Error loading analytics", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Analytics...</div>;
    if (!survey) return <div className="p-8 text-center text-red-500">Survey not found</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white shadow-sm border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-xl font-bold text-slate-800">Analytics: {survey.title}</span>
                        </div>
                        <div className="flex items-center">
                            <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                                &larr; Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Timeline Section */}
                <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Submission Trends</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timelineData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Questions Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.keys(chartsData).map(key => {
                        // Find the question definition for the Title
                        let questionTitle = key;
                        const pages = survey.surveyJson?.pages || [];
                        for (const page of pages) {
                            for (const el of (page.elements || [])) {
                                if (el.name === key) {
                                    questionTitle = el.title || el.name;
                                }
                            }
                        }

                        return (
                            <div key={key} className="bg-white rounded-xl shadow p-6">
                                <h4 className="text-md font-medium text-slate-700 mb-4">{questionTitle} <span className="text-xs text-slate-400">({key})</span></h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartsData[key]}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="label" />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#82ca9d" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default AnalyticsDashboard;

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ChartCard from './ChartCard';
import { motion } from 'framer-motion';

const AnalyticsDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [survey, setSurvey] = useState(null);
    const [chartsData, setChartsData] = useState({});
    const [timelineData, setTimelineData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMetrics, setLoadingMetrics] = useState({}); // Track loading state per question
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Date Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchSurveyAndData();
    }, [id]); // Refetch when ID changes

    // Refetch when dates change
    useEffect(() => {
        if (survey) {
            fetchStats();
        }
    }, [startDate, endDate]);

    // Derived state: Extract questions from survey definition
    const questions = React.useMemo(() => {
        if (!survey || !survey.surveyJson) return [];
        const qs = [];
        const pages = survey.surveyJson.pages || [];
        pages.forEach(page => {
            (page.elements || []).forEach(el => {
                if (['radiogroup', 'dropdown', 'rating', 'boolean', 'checkbox', 'tagbox', 'text', 'comment'].includes(el.type)) {
                    qs.push({ name: el.name, title: el.title || el.name, type: el.type });
                }
            });
        });
        return qs;
    }, [survey]);

    const fetchSurveyAndData = async () => {
        setLoading(true);
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

            // 2. Fetch Initial Stats
            await fetchStats(surveyDef);

        } catch (err) {
            console.error("Error loading analytics", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async (surveyDef = survey) => {
        if (!surveyDef) return;
        setIsRefreshing(true);

        const role = localStorage.getItem('role');
        const config = { params: {} };
        if (role === 'ADMIN') {
            config.headers = { 'X-TENANT-ID': '' };
        }

        if (startDate) config.params.startDate = startDate;
        if (endDate) config.params.endDate = endDate;

        try {
            // Re-calculate questions locally if needed, or just use the memoized logic implicitly by using the same logic
            // But for fetching we can just re-extract or rely on the Render loop to pick up data once set.
            // Let's re-extract to be safe for the "questions" var in THIS scope.
            const qs = [];
            const pages = surveyDef.surveyJson?.pages || [];
            pages.forEach(page => {
                (page.elements || []).forEach(el => {
                    if (['radiogroup', 'dropdown', 'rating', 'boolean', 'checkbox', 'tagbox', 'text', 'comment'].includes(el.type)) {
                        qs.push({ name: el.name, title: el.title || el.name, type: el.type });
                    }
                });
            });

            // Fetch Data
            const dataMap = {};
            await Promise.all(qs.map(async (q) => {
                try {
                    const res = await api.get(`/analytics/${id}/questions/${q.name}`, config);
                    dataMap[q.name] = {
                        data: res.data,
                        type: q.type,
                        title: q.title
                    };
                } catch (e) {
                    console.error(`Failed to load data for ${q.name}`, e);
                }
            }));
            setChartsData(dataMap);

            // Fetch Timeline
            const timelineRes = await api.get(`/analytics/${id}/timeline`, config);
            setTimelineData(timelineRes.data || []);

        } catch (e) {
            console.error("Error fetching stats", e);
        } finally {
            setIsRefreshing(false);
        }
    };

    const determineChartType = (qType, dataLength) => {
        if (['text', 'comment'].includes(qType)) return 'list';
        if (qType === 'rating') return 'bar';
        // Logic: specific types or based on option count
        if (dataLength > 5) return 'bar';
        return 'pie';
    };

    const handleMetricFetch = async (questionKey, metricType) => {
        // If switching back to distribution, just update state locally
        if (metricType === 'DISTRIBUTION') {
            setChartsData(prev => ({
                ...prev,
                [questionKey]: { ...prev[questionKey], selectedMetric: metricType }
            }));
            return;
        }

        setLoadingMetrics(prev => ({ ...prev, [questionKey]: true }));

        try {
            const role = localStorage.getItem('role');
            const config = { params: { type: metricType } };
            if (role === 'ADMIN') {
                config.headers = { 'X-TENANT-ID': '' };
            }
            if (startDate) config.params.startDate = startDate;
            if (endDate) config.params.endDate = endDate;

            const res = await api.get(`/analytics/${id}/questions/${questionKey}/metric`, config);

            setChartsData(prev => ({
                ...prev,
                [questionKey]: {
                    ...prev[questionKey],
                    selectedMetric: metricType,
                    metricValue: res.data.value
                }
            }));

        } catch (error) {
            console.error("Error fetching metric:", error);
            // Optionally toast error here
        } finally {
            setLoadingMetrics(prev => ({ ...prev, [questionKey]: false }));
        }
    };

    const handleDrillDown = (questionKey, answerLabel) => {
        // Navigate within the SPA
        if (answerLabel === null || answerLabel === undefined) {
            navigate(`/surveys/${id}/responses`);
        } else {
            navigate(`/surveys/${id}/responses?questionKey=${encodeURIComponent(questionKey)}&answerValue=${encodeURIComponent(answerLabel)}`);
        }
    };

    // If survey is NOT loaded yet, show full page spinner (first load)
    if (loading && !survey) return (
        <div className="flex justify-center items-center h-screen bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );

    if (!survey) return <div className="p-8 text-center text-red-500">Survey not found</div>;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-slate-50 font-sans"
        >
            <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                                {survey.title} <span className="text-slate-400 font-normal text-lg ml-2">Analytics</span>
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(`/surveys/${id}/responses`)} // Navigate to responses to export data from there for now
                                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium py-1.5 px-3 rounded shadow-sm transition"
                            >
                                View & Export Data
                            </button>
                            <div className="flex items-center bg-slate-100 rounded-lg p-1">
                                <input
                                    type="date"
                                    className="bg-transparent border-none text-sm text-slate-600 focus:ring-0"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    placeholder="Start Date"
                                />
                                <span className="text-slate-400 mx-1">-</span>
                                <input
                                    type="date"
                                    className="bg-transparent border-none text-sm text-slate-600 focus:ring-0"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    placeholder="End Date"
                                />
                            </div>
                            <Link to="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition">
                                &times; Close
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Timeline Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <ChartCard
                        title="Response Timeline"
                        type="area"
                        data={timelineData}
                        color="#4F46E5"
                        isLoading={isRefreshing && timelineData.length === 0} // Optional: Keep old data while refreshing or show loading
                    />
                </motion.div>

                {/* Questions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                    {questions.map((q, index) => {
                        const item = chartsData[q.name];
                        // If item exists, use its data. If not (or refreshing), we render skeleton via isLoading
                        // Note: If refreshing, we might want to show SKELETON instead of stale data? 
                        // User said "loading ... appears blank". 
                        // Let's pass isLoading=true if data is missing OR if we want to indicate refresh
                        // Typically, keeping stale data + a spinner is better than full skeleton replace.
                        // BUT user complained about "blank space". That implies data was MISSING (initial load).
                        // So: if (!item) -> Loading.

                        // If we are refreshing, we can choose to show loading overlay or skeleton. 
                        const isItemLoading = !item || loadingMetrics[q.name];

                        // Calculate props safely
                        const chartType = determineChartType(q.type, item?.data?.length || 0);

                        return (
                            <ChartCard
                                key={q.name}
                                index={index}
                                title={q.title}
                                type={chartType}
                                data={item?.data}
                                surveyId={id}
                                questionKey={q.name}
                                onMetricFetch={handleMetricFetch}
                                selectedMetric={item?.selectedMetric}
                                metricValue={item?.metricValue}
                                isLoading={isItemLoading}
                                onDrillDown={handleDrillDown}
                            />
                        );
                    })}
                </div>
            </main>
        </motion.div>
    );
};

export default AnalyticsDashboard;

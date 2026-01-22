import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
    const [surveys, setSurveys] = useState([]);

    useEffect(() => {
        fetchSurveys();
    }, []);

    const fetchSurveys = async () => {
        try {
            const res = await api.get('/surveys');
            setSurveys(res.data);
        } catch (err) {
            console.error('Failed to fetch surveys', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('tenantId');
        localStorage.removeItem('tenantName');
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Navbar */}
            <nav className="bg-white shadow-sm border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                                FormsFlow
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-sm text-slate-600 hidden sm:block">
                                Signed in as <span className="font-semibold text-slate-900">{localStorage.getItem('tenantName')}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-sm border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header Action */}
                <div className="sm:flex sm:items-center sm:justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                        <p className="mt-1 text-sm text-slate-500">Manage your surveys and view responses.</p>
                    </div>
                    <div className="mt-4 sm:mt-0">
                        <Link to="/create-survey">
                            <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition">
                                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                Create New Survey
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Survey Grid */}
                {surveys.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-300">
                        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <h3 className="mt-2 text-sm font-medium text-slate-900">No surveys yet</h3>
                        <p className="mt-1 text-sm text-slate-500">Get started by creating a new survey.</p>
                        <div className="mt-6">
                            <Link to="/create-survey" className="text-blue-600 hover:text-blue-500 font-medium text-sm">Create Survey &rarr;</Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {surveys.map(s => (
                            <div key={s.id} className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 hover:shadow-md transition duration-200">
                                <div className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {s.title.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    </div>
                                    <div className="mt-4">
                                        <h3 className="text-lg font-medium text-slate-900 truncate">{s.title}</h3>
                                        <p className="mt-1 text-sm text-slate-500 truncate">Created recently</p>
                                    </div>
                                    <div className="mt-6 flex space-x-3">
                                        <Link
                                            to={`/surveys/${s.id}/responses`}
                                            className="flex-1 text-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition"
                                        >
                                            Responses
                                        </Link>
                                        <Link
                                            to={`/survey/${s.id}`}
                                            className="flex-1 text-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition"
                                        >
                                            Take Survey
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;

import React, { useEffect, useState } from 'react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/survey-core.min.css';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const SurveyRunner = () => {
    const { id } = useParams();
    const [surveyModel, setSurveyModel] = useState(null);

    useEffect(() => {
        const loadSurvey = async () => {
            try {
                const res = await api.get(`/surveys/public/${id}`);
                const surveyData = res.data;

                const model = new Model(surveyData.surveyJson);
                model.onComplete.add(async (sender) => {
                    const results = sender.data;
                    try {
                        await api.post(`/surveys/submit/${id}`, { answers: results });
                        // SurveyJS handles "Thank you" page automatically
                    } catch (err) {
                        alert('Failed to submit survey');
                    }
                });
                setSurveyModel(model);
            } catch (err) {
                console.error("Error loading survey", err);
            }
        };
        loadSurvey();
    }, [id]);

    if (!surveyModel) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-slate-500 flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Loading survey...
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pt-8 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 shadow-2xl rounded-xl bg-white overflow-hidden p-6 py-10">
                <Survey model={surveyModel} />
            </div>
        </div>
    );
};

export default SurveyRunner;

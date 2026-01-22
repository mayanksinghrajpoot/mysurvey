import React, { useEffect } from 'react';
import { SurveyCreatorComponent, SurveyCreator } from 'survey-creator-react';
import 'survey-core/survey-core.min.css';
import 'survey-creator-core/survey-creator-core.min.css';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const SurveyCreatorWidget = () => {
    const navigate = useNavigate();

    const creator = React.useMemo(() => {
        const options = {
            showLogicTab: true,
            autoSaveEnabled: false
        };
        const newCreator = new SurveyCreator(options);

        newCreator.saveSurveyFunc = async (saveNo, callback) => {
            try {
                // Auto-rename generic questions (question1, etc.) to meaningful names based on Title
                // This ensures analytics/storage uses readable keys
                const survey = newCreator.survey;
                const pages = survey.pages;

                // Helper to slugify text
                const slugify = (text) => {
                    return text.toString().toLowerCase()
                        .replace(/\s+/g, '-')           // Replace spaces with -
                        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                        .replace(/^-+/, '')             // Trim - from start
                        .replace(/-+$/, '');            // Trim - from end
                };

                pages.forEach(page => {
                    page.elements.forEach(el => {
                        // Check if name is generic (starts with question + number) OR just ensure we match title if possible
                        // We strictly want "indexed on question name", so let's force name = slug(title) if title is set
                        if (el.title && el.name.match(/^question\d+$/)) {
                            const newName = slugify(el.title);
                            if (newName && newName !== el.name) {
                                // check if name exists
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
                    surveyJson: surveyJson
                };

                await api.post('/surveys', payload);
                callback(saveNo, true);
                alert('Survey Saved! responses will now use meaningful names.');
                navigate('/dashboard');
            } catch (err) {
                console.error(err);
                callback(saveNo, false);
                alert('Error saving survey');
            }
        };

        return newCreator;
    }, [navigate]);

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
            <div className="flex-1 relative h-screen">
                <SurveyCreatorComponent creator={creator} />
            </div>
        </div>
    );
};

export default SurveyCreatorWidget;

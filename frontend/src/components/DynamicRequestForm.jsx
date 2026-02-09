import React from 'react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/survey-core.min.css';

// Apply SurveyJS Theme
// StylesManager.applyTheme("defaultV2"); // Removed as deprecated

const DynamicRequestForm = ({ schemaJson, initialData, onSubmit, onComplete }) => {
    if (!schemaJson) return <div className="text-red-500">Error: No form definition found.</div>;

    const survey = new Model(schemaJson);

    // Set initial data if providing for edit mode
    if (initialData) {
        survey.data = initialData;
    }

    survey.onComplete.add((sender) => {
        if (onComplete) {
            onComplete(sender.data);
        } else if (onSubmit) {
            onSubmit(sender.data);
        }
    });

    return (
        <div className="dynamic-form-container bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <Survey model={survey} />
        </div>
    );
};

export default DynamicRequestForm;

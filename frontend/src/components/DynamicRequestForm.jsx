import React, { useMemo } from 'react';
import { FormRenderer } from './FormBuilder/FormRenderer';

const DynamicRequestForm = ({ schemaJson, initialData, onSubmit, onComplete }) => {
    const formData = useMemo(() => {
        if (!schemaJson) return null;
        try {
            return typeof schemaJson === 'string' ? JSON.parse(schemaJson) : schemaJson;
        } catch (e) {
            console.error("Invalid JSON", e);
            return null;
        }
    }, [schemaJson]);

    if (!formData) return <div className="text-red-500">Error: No form definition found.</div>;

    // Handle submission
    const handleSubmit = async (answers) => {
        if (onComplete) {
            await onComplete(answers);
        } else if (onSubmit) {
            await onSubmit(answers);
        }
    };

    return (
        <div className="dynamic-form-container bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800">{formData.title}</h3>
                <p className="text-slate-500 text-sm">{formData.description}</p>
            </div>
            <FormRenderer
                fields={formData.fields || []}
                initialData={initialData}
                onSubmit={handleSubmit}
                submitLabel="Submit Request"
            />
        </div>
    );
};

export default DynamicRequestForm;

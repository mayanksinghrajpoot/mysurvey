import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { FormRenderer } from './FormRenderer';

export function FormPreview({ fields, title, description, formId, onClose, onSubmit: parentSubmit }) {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (answers) => {
        if (parentSubmit) {
            await parentSubmit(answers);
            setSubmitted(true);
            return;
        }

        // Preview mode simulation
        console.log("Submitting preview", answers);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="size-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
                    <p className="text-gray-600 mb-6">Your response has been recorded successfully.</p>
                    <button
                        onClick={() => {
                            setSubmitted(false);
                            if (onClose) onClose();
                        }}
                        className="w-full bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                    >
                        Close Preview
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                <div className="p-5 border-b flex justify-between items-start bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="font-bold text-xl text-gray-900">{title}</h2>
                        <p className="text-gray-500 text-sm mt-1">{description}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors">
                        <X className="size-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    <FormRenderer fields={fields} onSubmit={handleSubmit} submitLabel="Submit Response" />
                </div>
            </div>
        </div>
    );
}

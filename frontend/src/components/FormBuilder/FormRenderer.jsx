import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

export function FormRenderer({ fields = [], onSubmit, initialData = {}, disabled = false, submitLabel = "Submit" }) {
    const [answers, setAnswers] = useState(initialData);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setAnswers(initialData);
        }
    }, [initialData]);

    const handleChange = (fieldId, value) => {
        setAnswers(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (onSubmit) {
            setLoading(true);
            try {
                await onSubmit(answers);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
            {fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>

                    {field.type === 'text' && (
                        <input
                            type="text"
                            required={field.required}
                            placeholder={field.placeholder}
                            value={answers[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            disabled={disabled}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    )}

                    {field.type === 'number' && (
                        <input
                            type="number"
                            required={field.required}
                            placeholder={field.placeholder}
                            min={field.extraAttributes?.min}
                            max={field.extraAttributes?.max}
                            value={answers[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            disabled={disabled}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    )}

                    {field.type === 'textarea' && (
                        <textarea
                            required={field.required}
                            placeholder={field.placeholder}
                            rows={4}
                            value={answers[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            disabled={disabled}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-y disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    )}

                    {field.type === 'date' && (
                        <input
                            type="date"
                            required={field.required}
                            value={answers[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            disabled={disabled}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    )}

                    {field.type === 'checkbox' && (
                        <div className={cn("flex items-center gap-3 p-3 border border-gray-200 rounded-lg transition-colors", disabled ? "bg-gray-50" : "hover:bg-gray-50 cursor-pointer")}
                            onClick={() => {
                                if (disabled) return;
                                const checkbox = document.getElementById(field.id);
                                if (checkbox) {
                                    checkbox.checked = !checkbox.checked;
                                    handleChange(field.id, checkbox.checked);
                                }
                            }}>
                            <input
                                type="checkbox"
                                id={field.id}
                                required={field.required}
                                checked={!!answers[field.id]}
                                onChange={(e) => handleChange(field.id, e.target.checked)}
                                disabled={disabled}
                                className="size-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
                                onClick={(e) => e.stopPropagation()}
                            />
                            <label htmlFor={field.id} className={cn("text-sm text-gray-700 font-medium", !disabled && "cursor-pointer")}>
                                {field.placeholder || "Yes"}
                            </label>
                        </div>
                    )}

                    {field.type === 'dropdown' && (
                        <select
                            required={field.required}
                            value={answers[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            disabled={disabled}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white disabled:bg-gray-100 disabled:text-gray-500"
                        >
                            <option value="">Select an option...</option>
                            {field.extraAttributes?.options?.map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                            ))}
                        </select>
                    )}

                    {field.type === 'file' && (
                        <div className={cn("border-2 border-dashed border-gray-300 rounded-lg p-6 transition-colors text-center", disabled ? "bg-gray-50" : "hover:bg-gray-50 cursor-pointer")}>
                            <input
                                type="file"
                                id={`file-${field.id}`}
                                required={field.required}
                                accept={field.extraAttributes?.accept}
                                disabled={disabled}
                                className="hidden"
                                onChange={(e) => handleChange(field.id, e.target.files?.[0]?.name)}
                            />
                            <label htmlFor={`file-${field.id}`} className={cn("flex flex-col items-center gap-2", !disabled && "cursor-pointer")}>
                                <span className={cn("text-sm font-medium", disabled ? "text-gray-400" : "text-blue-600 hover:text-blue-700")}>
                                    {answers[field.id] ? `Selected: ${answers[field.id]}` : "Click to upload"}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {answers[field.id] ? "Change file" : "or drag and drop"}
                                </span>
                            </label>
                        </div>
                    )}
                </div>
            ))}

            {!disabled && (
                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium shadow-md transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Submitting...' : submitLabel}
                    </button>
                </div>
            )}
        </form>
    );
}

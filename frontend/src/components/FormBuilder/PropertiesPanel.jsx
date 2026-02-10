import React from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

export function PropertiesPanel({ selectedField, onUpdate, onClose }) {
    if (!selectedField) {
        return (
            <div className="w-80 bg-white border-l p-4 flex flex-col items-center justify-center text-gray-500">
                <p>Select a field to edit properties</p>
            </div>
        );
    }

    return (
        <div className="w-80 bg-white border-l flex flex-col h-full">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h2 className="font-semibold text-gray-700">Field Properties</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X className="size-4" />
                </button>
            </div>

            <div className="p-4 space-y-6 overflow-y-auto flex-1">
                {/* Field Type (Read Only for now, could be changeable) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <input
                        type="text"
                        value={selectedField.type}
                        disabled
                        className="w-full px-3 py-2 border rounded-md bg-gray-100 text-gray-500 capitalize"
                    />
                </div>

                {/* Label */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                    <input
                        type="text"
                        value={selectedField.label}
                        onChange={(e) => onUpdate(selectedField.id, { label: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Placeholder */}
                {['text', 'number', 'textarea', 'date', 'dropdown'].includes(selectedField.type) && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                        <input
                            type="text"
                            value={selectedField.placeholder || ''}
                            onChange={(e) => onUpdate(selectedField.id, { placeholder: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                )}

                {/* Dropdown Options */}
                {selectedField.type === 'dropdown' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-gray-900">Options</label>
                            <button
                                onClick={() => {
                                    const currentOptions = selectedField.extraAttributes?.options || [];
                                    onUpdate(selectedField.id, {
                                        extraAttributes: {
                                            ...selectedField.extraAttributes,
                                            options: [...currentOptions, `Option ${currentOptions.length + 1}`]
                                        }
                                    });
                                }}
                                className="text-blue-600 hover:text-blue-700"
                            >
                                <Plus className="size-4" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {(selectedField.extraAttributes?.options || []).map((option, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => {
                                            const newOptions = [...(selectedField.extraAttributes?.options || [])];
                                            newOptions[index] = e.target.value;
                                            onUpdate(selectedField.id, {
                                                extraAttributes: {
                                                    ...selectedField.extraAttributes,
                                                    options: newOptions
                                                }
                                            });
                                        }}
                                        className="flex-1 px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        placeholder={`Option ${index + 1}`}
                                    />
                                    <button
                                        onClick={() => {
                                            const newOptions = [...(selectedField.extraAttributes?.options || [])];
                                            newOptions.splice(index, 1);
                                            onUpdate(selectedField.id, {
                                                extraAttributes: {
                                                    ...selectedField.extraAttributes,
                                                    options: newOptions
                                                }
                                            });
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-500 border rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            ))}
                            {(selectedField.extraAttributes?.options || []).length === 0 && (
                                <div className="text-center py-4 bg-gray-50 rounded-lg dashed border-2 border-gray-200 border-dashed text-gray-500 text-sm">
                                    No options added
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* File Accept */}
                {selectedField.type === 'file' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-gray-900">Accepted File Types</label>
                            <button
                                onClick={() => {
                                    const currentAccepts = selectedField.extraAttributes?.accept
                                        ? selectedField.extraAttributes.accept.split(',').map((s) => s.trim())
                                        : [];
                                    const newAccepts = [...currentAccepts, '.pdf'];
                                    onUpdate(selectedField.id, {
                                        extraAttributes: {
                                            ...selectedField.extraAttributes,
                                            accept: newAccepts.join(',')
                                        }
                                    });
                                }}
                                className="text-blue-600 hover:text-blue-700"
                            >
                                <Plus className="size-4" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {(selectedField.extraAttributes?.accept
                                ? selectedField.extraAttributes.accept.split(',').map((s) => s.trim())
                                : []
                            ).map((type, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={type}
                                        onChange={(e) => {
                                            const currentAccepts = selectedField.extraAttributes?.accept
                                                ? selectedField.extraAttributes.accept.split(',').map((s) => s.trim())
                                                : [];
                                            currentAccepts[index] = e.target.value;
                                            onUpdate(selectedField.id, {
                                                extraAttributes: {
                                                    ...selectedField.extraAttributes,
                                                    accept: currentAccepts.join(',')
                                                }
                                            });
                                        }}
                                        className="flex-1 px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        placeholder=".pdf, image/*"
                                    />
                                    <button
                                        onClick={() => {
                                            const currentAccepts = selectedField.extraAttributes?.accept
                                                ? selectedField.extraAttributes.accept.split(',').map((s) => s.trim())
                                                : [];
                                            currentAccepts.splice(index, 1);
                                            onUpdate(selectedField.id, {
                                                extraAttributes: {
                                                    ...selectedField.extraAttributes,
                                                    accept: currentAccepts.join(',')
                                                }
                                            });
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-500 border rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            ))}
                            {(!selectedField.extraAttributes?.accept) && (
                                <div className="text-center py-4 bg-gray-50 rounded-lg dashed border-2 border-gray-200 border-dashed text-gray-500 text-sm">
                                    Any file type accepted
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Number Constraints */}
                {selectedField.type === 'number' && (
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Min</label>
                            <input
                                type="number"
                                value={selectedField.extraAttributes?.min || ''}
                                onChange={(e) => onUpdate(selectedField.id, {
                                    extraAttributes: {
                                        ...selectedField.extraAttributes,
                                        min: Number(e.target.value)
                                    }
                                })}
                                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max</label>
                            <input
                                type="number"
                                value={selectedField.extraAttributes?.max || ''}
                                onChange={(e) => onUpdate(selectedField.id, {
                                    extraAttributes: {
                                        ...selectedField.extraAttributes,
                                        max: Number(e.target.value)
                                    }
                                })}
                                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                )}

                {/* Required Checkbox */}
                <div className="flex items-start gap-3 pt-4 border-t">
                    <input
                        type="checkbox"
                        id="required"
                        checked={selectedField.required}
                        onChange={(e) => onUpdate(selectedField.id, { required: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="flex flex-col">
                        <label htmlFor="required" className="text-sm font-medium text-gray-900 cursor-pointer">
                            Required field
                        </label>
                        <p className="text-sm text-gray-500">
                            If checked, users will be required to complete this field.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

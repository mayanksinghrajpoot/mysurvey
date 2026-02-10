import React from 'react';

export function FormOverlay({ activeItem }) {
    if (!activeItem) return null;
    return (
        <div className="px-4 py-3 bg-white border border-blue-500 rounded-md shadow-lg opacity-80 w-48 font-medium">
            {activeItem.label}
        </div>
    );
}

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Type, Hash, Calendar, CheckSquare, AlignLeft, List, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';

export const sidebarFields = [
    { type: 'text', label: 'Text Field', icon: <Type className="size-4" /> },
    { type: 'number', label: 'Number', icon: <Hash className="size-4" /> },
    { type: 'textarea', label: 'Text Area', icon: <AlignLeft className="size-4" /> },
    { type: 'dropdown', label: 'Dropdown', icon: <List className="size-4" /> },
    { type: 'date', label: 'Date', icon: <Calendar className="size-4" /> },
    { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="size-4" /> },
    { type: 'file', label: 'File Upload', icon: <Upload className="size-4" /> },
];

export function Sidebar() {
    return (
        <div className="w-64 bg-white border-r p-4 flex flex-col gap-4">
            <h2 className="font-semibold text-lg text-gray-700">Toolbox</h2>
            <div className="flex flex-col gap-2">
                {sidebarFields.map((field) => (
                    <DraggableSidebarItem key={field.type} field={field} />
                ))}
            </div>
        </div>
    );
}

function DraggableSidebarItem({ field }) {
    const { setNodeRef, listeners, attributes } = useDraggable({
        id: `sidebar-${field.type}`,
        data: {
            type: field.type,
            isSidebar: true,
        },
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "flex items-center gap-2 p-3 bg-gray-50 border rounded-md cursor-grab hover:bg-gray-100 transition-colors shadow-sm",
                "active:cursor-grabbing active:opacity-50"
            )}
        >
            {field.icon}
            <span className="text-sm font-medium">{field.label}</span>
        </div>
    );
}

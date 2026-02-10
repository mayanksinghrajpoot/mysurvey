import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';

export function Canvas({ fields, onRemove, onSelect, selectedId }) {
    const { setNodeRef } = useDroppable({
        id: 'canvas-droppable',
    });

    return (
        <div className="flex-1 bg-gray-100 p-8 overflow-y-auto" onClick={() => onSelect('')}>
            <div className="max-w-3xl mx-auto bg-white min-h-[500px] p-8 rounded-lg shadow-sm border" ref={setNodeRef} onClick={(e) => e.stopPropagation()}>
                {fields.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg p-12">
                        <p>Drag fields here from the toolbox</p>
                    </div>
                ) : (
                    <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-4">
                            {fields.map((field) => (
                                <SortableField
                                    key={field.id}
                                    field={field}
                                    onRemove={onRemove}
                                    onSelect={onSelect}
                                    isSelected={field.id === selectedId}
                                />
                            ))}
                        </div>
                    </SortableContext>
                )}
            </div>
        </div>
    );
}

function SortableField({ field, onRemove, onSelect, isSelected }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: field.id,
        data: {
            type: field.type,
            field,
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-50 h-16 bg-gray-50 border-2 border-dashed border-gray-300 rounded-md"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(field.id);
            }}
            className={`group relative p-4 bg-white border rounded-md transition-colors flex items-center justify-between
                ${isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'}
            `}
        >
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {/* Render basic preview of input */}
                <div className="pointer-events-none">
                    {field.type === 'text' && <input type="text" className="w-full px-3 py-2 border rounded text-gray-400" placeholder={field.placeholder || "Text input"} disabled />}
                    {field.type === 'number' && (
                        <input
                            type="number"
                            className="w-full px-3 py-2 border rounded text-gray-400"
                            placeholder={field.placeholder || "0"}
                            min={field.extraAttributes?.min}
                            max={field.extraAttributes?.max}
                            disabled
                        />
                    )}
                    {field.type === 'checkbox' && <input type="checkbox" className="size-4" disabled />}
                    {field.type === 'date' && <input type="date" className="w-full px-3 py-2 border rounded text-gray-400" disabled />}
                    {field.type === 'textarea' && <textarea className="w-full px-3 py-2 border rounded text-gray-400" placeholder={field.placeholder} disabled />}

                    {field.type === 'dropdown' && (
                        <select className="w-full px-3 py-2 border rounded text-gray-400" disabled>
                            <option>{field.placeholder || "Select an option"}</option>
                            {field.extraAttributes?.options?.map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                            ))}
                        </select>
                    )}

                    {field.type === 'file' && (
                        <div className="w-full px-3 py-2 border rounded text-gray-400 bg-gray-50 flex items-center gap-2">
                            <span className="text-sm">Choose file... {field.extraAttributes?.accept && `(${field.extraAttributes.accept})`}</span>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation(); // prevent drag start? actually listener is on parent
                    onRemove(field.id);
                }}
                className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Trash2 className="size-4" />
            </button>
        </div>
    );
}

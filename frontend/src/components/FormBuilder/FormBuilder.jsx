import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Sidebar, sidebarFields } from './Sidebar';
import { Canvas } from './Canvas';
import { FormOverlay } from './FormOverlay';
import { PropertiesPanel } from './PropertiesPanel';
import { FormPreview } from './FormPreview';
import { Eye, Save } from 'lucide-react';

export function FormBuilder({ initialData, onSave, onClose }) {
    const [fields, setFields] = useState([]);
    const [activeDragItem, setActiveDragItem] = useState(null);
    const [selectedFieldId, setSelectedFieldId] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    // Form Metadata
    const [formTitle, setFormTitle] = useState("My New Form");
    const [formDescription, setFormDescription] = useState("Created via Form Builder");

    useEffect(() => {
        if (initialData) {
            setFields(initialData.fields || []);
            setFormTitle(initialData.title || "My New Form");
            setFormDescription(initialData.description || "Created via Form Builder");
        }
    }, [initialData]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement to start drag
            },
        })
    );

    const handleDragStart = (event) => {
        const { active } = event;
        const activeData = active.data.current;

        if (activeData?.isSidebar) {
            const type = activeData.type;
            const sidebarField = sidebarFields.find(f => f.type === type);
            if (sidebarField) {
                setActiveDragItem({ type, label: sidebarField.label });
            }
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        const activeData = active.data.current;

        if (activeData?.isSidebar) {
            const type = activeData.type;
            const newField = {
                id: crypto.randomUUID(),
                type,
                label: `New ${type} field`,
                required: false,
                extraAttributes: {},
            };

            setFields((prev) => {
                if (over.id === 'canvas-droppable') {
                    return [...prev, newField];
                }

                const overIndex = prev.findIndex(f => f.id === over.id);
                if (overIndex !== -1) {
                    const newFields = [...prev];
                    newFields.splice(overIndex + 1, 0, newField);
                    return newFields;
                }

                return [...prev, newField];
            });
            setSelectedFieldId(newField.id);
        }
        else if (active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const removeField = (id) => {
        setFields(prev => prev.filter(f => f.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    const updateField = (id, updates) => {
        setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const handleSave = async () => {
        try {
            const formData = {
                title: formTitle,
                description: formDescription,
                fields: fields,
                published: true
            };

            if (onSave) {
                await onSave(formData);
            } else {
                alert('Saved! (No save handler provided)');
            }
        } catch (e) {
            console.error(e);
            alert('Error saving form');
        }
    };

    const selectedField = fields.find(f => f.id === selectedFieldId) || null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-screen flex-col bg-gray-50">
                <header className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm z-10">
                    <div className="flex flex-col">
                        <input
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            className="text-xl font-bold text-gray-800 border-none focus:ring-0 p-0 hover:bg-gray-50 rounded px-1 transition-colors"
                        />
                        <input
                            type="text"
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            className="text-sm text-gray-500 border-none focus:ring-0 p-0 hover:bg-gray-50 rounded px-1 transition-colors"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="text-sm text-slate-500 hover:text-red-500 px-4 py-2"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => setShowPreview(true)}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm transition-all text-sm font-medium"
                        >
                            <Eye className="size-4" /> Preview
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md text-sm font-medium"
                        >
                            <Save className="size-4" /> Save Form
                        </button>
                    </div>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <Sidebar />
                    <Canvas
                        fields={fields}
                        onRemove={removeField}
                        onSelect={setSelectedFieldId}
                        selectedId={selectedFieldId}
                    />
                    <PropertiesPanel
                        selectedField={selectedField}
                        onUpdate={updateField}
                        onClose={() => setSelectedFieldId(null)}
                    />
                </div>
            </div>

            <DragOverlay>
                <FormOverlay activeItem={activeDragItem} />
            </DragOverlay>

            {showPreview && (
                <FormPreview
                    fields={fields}
                    title={formTitle}
                    description={formDescription}
                    formId="preview"
                    onClose={() => setShowPreview(false)}
                />
            )}
        </DndContext>
    );
}

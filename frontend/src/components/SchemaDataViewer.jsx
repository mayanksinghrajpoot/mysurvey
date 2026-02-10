import React, { useMemo } from 'react';
import { flattenComponents } from '../lib/utils';

const SchemaDataViewer = ({ data, schema }) => {
    // 1. Flatten schema to map keys/ids to Labels
    const fieldMap = useMemo(() => {
        if (!schema) return {};
        const components = schema.components || schema.fields || [];
        const flat = flattenComponents(components);

        const map = {};
        flat.forEach(c => {
            if (c.key) map[c.key] = c.label;
            if (c.id) map[c.id] = c.label;
        });
        return map;
    }, [schema]);

    if (!data || Object.keys(data).length === 0) {
        return <p className="text-sm text-slate-400 italic">No additional custom details provided.</p>;
    }

    return (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Additional Information</h4>
            <div className="space-y-2">
                {Object.entries(data).map(([key, value]) => {
                    // Resolve label
                    let label = fieldMap[key] || key;

                    // Format Label if it fell back to key (camelCase to Title Case)
                    if (label === key) {
                        label = key.replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .trim();
                    }

                    return (
                        <div key={key} className="flex flex-col border-b border-slate-200 last:border-0 pb-2 last:pb-0">
                            <span className="text-xs text-slate-500 capitalize">{label}</span>
                            <span className="text-sm text-slate-800 font-medium whitespace-pre-wrap">
                                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SchemaDataViewer;
